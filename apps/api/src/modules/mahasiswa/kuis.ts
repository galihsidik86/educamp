import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const kuisRouter = Router();

/** Pastikan mahasiswa peserta KRS disetujui di kelas kuis. */
async function ensurePeserta(mahasiswaId: string, kelasId: string) {
  const k = await prisma.krs.findFirst({
    where: { mahasiswaId, kelasId, status: 'disetujui' },
  });
  if (!k) throw Forbidden('Anda bukan peserta kelas kuis ini');
}

/** List kuis dari semua kelas yang diikuti mahasiswa (KRS disetujui, kuis published). */
kuisRouter.get('/kuis', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const krs = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, status: 'disetujui' },
    select: { kelasId: true },
  });
  const kelasIds = krs.map((k) => k.kelasId);
  const items = await prisma.kuis.findMany({
    where: { kelasId: { in: kelasIds }, isPublished: true },
    include: {
      kelas: { include: { mataKuliah: true } },
      attempt: { where: { mahasiswaId: m.id } },
    },
    orderBy: { mulai: 'desc' },
  });
  res.json({
    items: items.map((k) => ({
      id: k.id,
      judul: k.judul,
      deskripsi: k.deskripsi,
      durasiMenit: k.durasiMenit,
      mulai: k.mulai,
      selesai: k.selesai,
      kelas: { id: k.kelas.id, kodeMK: k.kelas.mataKuliah.kode, namaMK: k.kelas.mataKuliah.nama, kodeKelas: k.kelas.kodeKelas },
      attempt: k.attempt[0] ? {
        id: k.attempt[0].id,
        status: k.attempt[0].status,
        mulaiPada: k.attempt[0].mulaiPada,
        selesaiPada: k.attempt[0].selesaiPada,
        skor: k.attempt[0].skor, maxSkor: k.attempt[0].maxSkor, persen: k.attempt[0].persen,
      } : null,
    })),
  });
});

/** Mulai attempt baru atau resume yang berjalan. */
kuisRouter.post('/kuis/:id/start', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const k = await prisma.kuis.findUnique({
    where: { id: req.params.id },
    include: { soal: { orderBy: { urutan: 'asc' } } },
  });
  if (!k) throw NotFound('Kuis tidak ditemukan');
  if (!k.isPublished) throw BadRequest('Kuis belum dipublikasikan');
  await ensurePeserta(m.id, k.kelasId);

  const now = new Date();
  if (now < k.mulai) throw BadRequest('Kuis belum dimulai');
  if (now > k.selesai) throw BadRequest('Kuis sudah berakhir');

  let attempt = await prisma.kuisAttempt.findUnique({
    where: { kuisId_mahasiswaId: { kuisId: k.id, mahasiswaId: m.id } },
  });

  if (attempt) {
    if (attempt.status !== 'berjalan') throw BadRequest('Anda sudah submit kuis ini');
  } else {
    attempt = await prisma.kuisAttempt.create({
      data: { kuisId: k.id, mahasiswaId: m.id, jawaban: {} },
    });
    void writeAudit(req, { action: 'kuis.start', entity: 'kuis-attempt', entityId: attempt.id, metadata: { kuisId: k.id } });
  }

  // Soal — opsional acak. JANGAN expose `jawaban` ke client.
  let soal = k.soal.map((s) => ({
    id: s.id,
    pertanyaan: s.pertanyaan,
    opsi: s.opsi,
    bobot: s.bobot,
  }));
  if (k.acak) soal = shuffleStable(soal, m.id + k.id);

  const expiresAt = new Date(attempt.mulaiPada.getTime() + k.durasiMenit * 60 * 1000);
  const deadline = expiresAt < k.selesai ? expiresAt : k.selesai;

  res.json({
    attempt: {
      id: attempt.id,
      mulaiPada: attempt.mulaiPada,
      deadline,
      jawaban: attempt.jawaban,
    },
    kuis: { id: k.id, judul: k.judul, durasiMenit: k.durasiMenit },
    soal,
  });
});

const saveSchema = z.object({
  jawaban: z.record(z.string(), z.number().int().min(0)),
});

/** Simpan progress jawaban (auto-save). */
kuisRouter.patch('/kuis/:id/jawaban', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const attempt = await prisma.kuisAttempt.findUnique({
    where: { kuisId_mahasiswaId: { kuisId: req.params.id, mahasiswaId: m.id } },
    include: { kuis: true },
  });
  if (!attempt) throw NotFound('Attempt tidak ditemukan — mulai kuis terlebih dahulu');
  if (attempt.status !== 'berjalan') throw BadRequest('Attempt sudah ditutup');

  const body = saveSchema.parse(req.body);
  const updated = await prisma.kuisAttempt.update({
    where: { id: attempt.id },
    data: { jawaban: body.jawaban },
  });
  res.json({ ok: true, updatedAt: updated.updatedAt });
});

/** Submit final — auto-grade. */
kuisRouter.post('/kuis/:id/submit', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const attempt = await prisma.kuisAttempt.findUnique({
    where: { kuisId_mahasiswaId: { kuisId: req.params.id, mahasiswaId: m.id } },
    include: { kuis: { include: { soal: true } } },
  });
  if (!attempt) throw NotFound('Attempt tidak ditemukan');
  if (attempt.status !== 'berjalan') throw BadRequest('Attempt sudah ditutup');

  // Merge incoming jawaban (jika dikirim) ke yang tersimpan
  const incoming = (req.body?.jawaban && typeof req.body.jawaban === 'object') ? req.body.jawaban : null;
  const finalJawaban: Record<string, number> = {
    ...(attempt.jawaban as Record<string, number> | null ?? {}),
    ...(incoming ?? {}),
  };

  // Hitung skor
  let skor = 0;
  let maxSkor = 0;
  for (const s of attempt.kuis.soal) {
    maxSkor += s.bobot;
    if (finalJawaban[s.id] === s.jawaban) skor += s.bobot;
  }
  const persen = maxSkor > 0 ? Math.round((skor / maxSkor) * 100 * 100) / 100 : 0;

  const updated = await prisma.kuisAttempt.update({
    where: { id: attempt.id },
    data: {
      jawaban: finalJawaban,
      status: 'submit',
      selesaiPada: new Date(),
      skor, maxSkor, persen,
    },
  });
  void writeAudit(req, { action: 'kuis.submit', entity: 'kuis-attempt', entityId: updated.id, metadata: { kuisId: attempt.kuisId, skor, maxSkor } });

  res.json({
    id: updated.id, status: updated.status, selesaiPada: updated.selesaiPada,
    skor, maxSkor, persen,
  });
});

/** Hasil attempt (mahasiswa lihat skor + review jawaban benar setelah submit). */
kuisRouter.get('/kuis/:id/hasil', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const attempt = await prisma.kuisAttempt.findUnique({
    where: { kuisId_mahasiswaId: { kuisId: req.params.id, mahasiswaId: m.id } },
    include: { kuis: { include: { soal: { orderBy: { urutan: 'asc' } } } } },
  });
  if (!attempt) throw NotFound('Attempt tidak ditemukan');
  if (attempt.status === 'berjalan') throw BadRequest('Submit kuis terlebih dahulu');

  const jawaban = (attempt.jawaban as Record<string, number> | null) ?? {};
  res.json({
    skor: attempt.skor, maxSkor: attempt.maxSkor, persen: attempt.persen,
    selesaiPada: attempt.selesaiPada,
    soal: attempt.kuis.soal.map((s) => ({
      id: s.id,
      pertanyaan: s.pertanyaan,
      opsi: s.opsi,
      jawabanBenar: s.jawaban,
      jawabanAnda: jawaban[s.id] ?? null,
      bobot: s.bobot,
    })),
  });
});

/** Helper acak deterministik (Fisher-Yates dengan seed). */
function shuffleStable<T>(arr: T[], seed: string): T[] {
  const out = arr.slice();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
