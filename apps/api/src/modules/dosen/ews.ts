import { Router } from 'express';
import { listEws, hitungEwsMahasiswa } from '../../lib/ews.js';
import { getDosenForUser } from '../../lib/context.js';
import { NotFound } from '../../lib/errors.js';

export const ewsRouter = Router();

/** DPA hanya bisa lihat mahasiswa bimbingannya yang beresiko. */
ewsRouter.get('/ews/bimbingan', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const items = await listEws({ dpaId: d.id });
  const ringkasan = {
    total: items.length,
    tinggi: items.filter((i) => i.tingkat === 'tinggi').length,
    sedang: items.filter((i) => i.tingkat === 'sedang').length,
    rendah: items.filter((i) => i.tingkat === 'rendah').length,
  };
  res.json({ ringkasan, items });
});

ewsRouter.get('/ews/:mahasiswaId', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const r = await hitungEwsMahasiswa(req.params.mahasiswaId);
  if (!r) throw NotFound('Mahasiswa tidak ditemukan');
  if (r.dpa?.id !== d.id) throw NotFound('Bukan mahasiswa bimbingan Anda');
  res.json(r);
});
