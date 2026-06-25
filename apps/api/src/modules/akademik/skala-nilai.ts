import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  getCurrentSkala, refreshSkalaNilai, SKALA_DEFAULT,
  angkaToHuruf, hurufToBobot,
  type SkalaRow,
} from '../../lib/grade.js';

export const skalaNilaiRouter = Router();

const skalaSchema = z.object({
  // Threshold
  minA:  z.number().min(0).max(100),
  minAB: z.number().min(0).max(100),
  minB:  z.number().min(0).max(100),
  minBC: z.number().min(0).max(100),
  minC:  z.number().min(0).max(100),
  minD:  z.number().min(0).max(100),
  // Bobot
  bobotA:  z.number().min(0).max(4),
  bobotAB: z.number().min(0).max(4),
  bobotB:  z.number().min(0).max(4),
  bobotBC: z.number().min(0).max(4),
  bobotC:  z.number().min(0).max(4),
  bobotD:  z.number().min(0).max(4),
  bobotE:  z.number().min(0).max(4),
  // Label huruf (display) — boleh dikosongkan, akan dipakai default A/AB/dst.
  hurufA:  z.string().trim().min(1).max(6).optional(),
  hurufAB: z.string().trim().min(1).max(6).optional(),
  hurufB:  z.string().trim().min(1).max(6).optional(),
  hurufBC: z.string().trim().min(1).max(6).optional(),
  hurufC:  z.string().trim().min(1).max(6).optional(),
  hurufD:  z.string().trim().min(1).max(6).optional(),
  hurufE:  z.string().trim().min(1).max(6).optional(),
});

function toResponse(rows: SkalaRow[]) {
  return { skala: rows };
}

skalaNilaiRouter.get('/skala-nilai', async (_req, res) => {
  res.json(toResponse(getCurrentSkala()));
});

skalaNilaiRouter.put('/skala-nilai', async (req, res) => {
  const body = skalaSchema.parse(req.body);

  // Validasi monoton: threshold turun dari A ke D
  const thresholds = [body.minA, body.minAB, body.minB, body.minBC, body.minC, body.minD];
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (thresholds[i]! <= thresholds[i + 1]!) {
      throw BadRequest('Threshold harus turun dari A ke D (mis. A > AB > B > BC > C > D)');
    }
  }
  // Bobot tidak naik dari A ke E
  const bobot = [body.bobotA, body.bobotAB, body.bobotB, body.bobotBC, body.bobotC, body.bobotD, body.bobotE];
  for (let i = 0; i < bobot.length - 1; i++) {
    if (bobot[i]! < bobot[i + 1]!) {
      throw BadRequest('Bobot tidak boleh naik dari A ke E (urutan harus monoton turun atau sama)');
    }
  }
  // Label huruf wajib unik (case-insensitive). Default fallback ke slot key.
  const labels = [
    body.hurufA  ?? 'A',
    body.hurufAB ?? 'AB',
    body.hurufB  ?? 'B',
    body.hurufBC ?? 'BC',
    body.hurufC  ?? 'C',
    body.hurufD  ?? 'D',
    body.hurufE  ?? 'E',
  ];
  const seen = new Set<string>();
  for (const l of labels) {
    const k = l.toLowerCase();
    if (seen.has(k)) throw BadRequest(`Label huruf duplikat: ${l}`);
    seen.add(k);
  }

  const data = {
    minA: body.minA, minAB: body.minAB, minB: body.minB, minBC: body.minBC, minC: body.minC, minD: body.minD,
    bobotA: body.bobotA, bobotAB: body.bobotAB, bobotB: body.bobotB, bobotBC: body.bobotBC, bobotC: body.bobotC, bobotD: body.bobotD, bobotE: body.bobotE,
    hurufA: labels[0]!, hurufAB: labels[1]!, hurufB: labels[2]!, hurufBC: labels[3]!, hurufC: labels[4]!, hurufD: labels[5]!, hurufE: labels[6]!,
  };

  const existing = await prisma.konfigurasiSkalaNilai.findFirst();
  if (existing) {
    await prisma.konfigurasiSkalaNilai.update({ where: { id: existing.id }, data });
  } else {
    await prisma.konfigurasiSkalaNilai.create({ data });
  }

  await refreshSkalaNilai();

  void writeAudit(req, {
    action: 'skala-nilai.update',
    entity: 'konfigurasi',
    metadata: data,
  });

  res.json(toResponse(getCurrentSkala()));
});

skalaNilaiRouter.post('/skala-nilai/reset', async (req, res) => {
  const existing = await prisma.konfigurasiSkalaNilai.findFirst();
  if (existing) {
    await prisma.konfigurasiSkalaNilai.delete({ where: { id: existing.id } });
  }
  await refreshSkalaNilai();
  void writeAudit(req, { action: 'skala-nilai.reset', entity: 'konfigurasi' });
  res.json({ skala: SKALA_DEFAULT });
});

/**
 * Recompute huruf+bobot untuk seluruh Nilai berdasarkan skala saat ini.
 * Hanya menyentuh row yang punya nilaiAngka — sumber data tidak hilang.
 * Tidak menyentuh status (finalized tetap finalized) atau nilaiAngka.
 * Gunakan setelah ubah skala / huruf supaya nilai lama konsisten dgn config baru.
 */
const recomputeSchema = z.object({
  // optional filter — bisa diperluas nanti
  status: z.enum(['finalized', 'draft', 'belum', 'all']).optional().default('all'),
});

skalaNilaiRouter.post('/skala-nilai/recompute', async (req, res) => {
  const { status } = recomputeSchema.parse(req.body ?? {});

  const where: { nilaiAngka: { not: null }; status?: 'finalized' | 'draft' | 'belum' } = {
    nilaiAngka: { not: null },
  };
  if (status !== 'all') where.status = status;

  const candidates = await prisma.nilai.findMany({
    where,
    select: { id: true, nilaiAngka: true, nilaiHuruf: true, bobot: true },
  });

  let changed = 0;
  await prisma.$transaction(async (tx) => {
    for (const n of candidates) {
      if (n.nilaiAngka == null) continue;
      const newHuruf = angkaToHuruf(n.nilaiAngka);
      const newBobot = hurufToBobot(newHuruf);
      if (newHuruf !== n.nilaiHuruf || newBobot !== n.bobot) {
        await tx.nilai.update({
          where: { id: n.id },
          data: { nilaiHuruf: newHuruf, bobot: newBobot },
        });
        changed += 1;
      }
    }
  });

  void writeAudit(req, {
    action: 'skala-nilai.recompute',
    entity: 'nilai',
    metadata: { scope: status, scanned: candidates.length, changed },
  });

  res.json({
    scanned: candidates.length,
    changed,
    message: `${changed} dari ${candidates.length} nilai diperbarui sesuai skala terkini.`,
  });
});
