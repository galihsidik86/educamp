import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { getCurrentSkala, refreshSkalaNilai, SKALA_DEFAULT, type SkalaRow } from '../../lib/grade.js';

export const skalaNilaiRouter = Router();

const skalaSchema = z.object({
  minA:  z.number().min(0).max(100),
  minAB: z.number().min(0).max(100),
  minB:  z.number().min(0).max(100),
  minBC: z.number().min(0).max(100),
  minC:  z.number().min(0).max(100),
  minD:  z.number().min(0).max(100),
  bobotA:  z.number().min(0).max(4),
  bobotAB: z.number().min(0).max(4),
  bobotB:  z.number().min(0).max(4),
  bobotBC: z.number().min(0).max(4),
  bobotC:  z.number().min(0).max(4),
  bobotD:  z.number().min(0).max(4),
  bobotE:  z.number().min(0).max(4),
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
  // Bobot turun dari A ke E
  const bobot = [body.bobotA, body.bobotAB, body.bobotB, body.bobotBC, body.bobotC, body.bobotD, body.bobotE];
  for (let i = 0; i < bobot.length - 1; i++) {
    if (bobot[i]! < bobot[i + 1]!) {
      throw BadRequest('Bobot tidak boleh naik dari A ke E (urutan harus monoton turun atau sama)');
    }
  }

  // Single-row config — kalau sudah ada, update; kalau belum, create.
  const existing = await prisma.konfigurasiSkalaNilai.findFirst();
  if (existing) {
    await prisma.konfigurasiSkalaNilai.update({ where: { id: existing.id }, data: body });
  } else {
    await prisma.konfigurasiSkalaNilai.create({ data: body });
  }

  await refreshSkalaNilai();

  void writeAudit(req, {
    action: 'skala-nilai.update',
    entity: 'konfigurasi',
    metadata: body,
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
