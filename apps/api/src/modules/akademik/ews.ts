import { Router } from 'express';
import { listEws, hitungEwsMahasiswa } from '../../lib/ews.js';
import { NotFound } from '../../lib/errors.js';

export const ewsRouter = Router();

ewsRouter.get('/ews', async (req, res) => {
  const prodiId = req.query.prodiId as string | undefined;
  const angkatan = req.query.angkatan ? Number(req.query.angkatan) : undefined;
  const tingkat = req.query.tingkat as 'tinggi' | 'sedang' | 'rendah' | undefined;
  const items = await listEws({ prodiId, angkatan, tingkatMin: tingkat });
  const ringkasan = {
    total: items.length,
    tinggi: items.filter((i) => i.tingkat === 'tinggi').length,
    sedang: items.filter((i) => i.tingkat === 'sedang').length,
    rendah: items.filter((i) => i.tingkat === 'rendah').length,
  };
  res.json({ ringkasan, items });
});

ewsRouter.get('/ews/:mahasiswaId', async (req, res) => {
  const r = await hitungEwsMahasiswa(req.params.mahasiswaId);
  if (!r) throw NotFound('Mahasiswa tidak ditemukan atau sudah tidak aktif');
  res.json(r);
});
