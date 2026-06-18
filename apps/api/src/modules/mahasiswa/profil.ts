import { Router } from 'express';
import { z } from 'zod';
import { getMahasiswaForUser } from '../../lib/context.js';
import { prisma } from '../../db.js';

export const profilRouter = Router();

profilRouter.get('/profil', async (req, res) => {
  const userId = req.user!.sub;
  const m = await prisma.mahasiswa.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true } },
      prodi: { include: { fakultas: true } },
      dpa: { select: { id: true, nama: true, nidn: true, gelarDepan: true, gelarBelakang: true } },
    },
  });
  if (!m) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan mahasiswa' } });
  res.json(m);
});

// Self-edit terbatas — NIM/email/prodi/status/dpa tidak boleh diubah sendiri (lewat akademik).
const updateSchema = z.object({
  tempatLahir: z.string().max(60).optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
});

profilRouter.patch('/profil', async (req, res) => {
  const m = await prisma.mahasiswa.findUnique({ where: { userId: req.user!.sub } });
  if (!m) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan mahasiswa' } });
  const body = updateSchema.parse(req.body);
  const updated = await prisma.mahasiswa.update({
    where: { id: m.id },
    data: {
      ...(body.tempatLahir !== undefined && { tempatLahir: body.tempatLahir }),
      ...(body.tanggalLahir !== undefined && { tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null }),
      ...(body.alamat !== undefined && { alamat: body.alamat }),
      ...(body.telepon !== undefined && { telepon: body.telepon }),
    },
  });
  res.json(updated);
});

// helper export so router file can also re-use the resolver elsewhere
export { getMahasiswaForUser };
