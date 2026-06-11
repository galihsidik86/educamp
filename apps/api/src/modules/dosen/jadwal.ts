import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';

export const jadwalRouter = Router();

jadwalRouter.get('/jadwal', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const kelas = await prisma.kelas.findMany({
    where: { dosenId: d.id, semesterId: semester.id },
    include: { mataKuliah: true, ruangan: true, _count: { select: { krs: true } } },
  });

  res.json({
    semester: { kode: semester.kode, jenis: semester.jenis },
    jadwal: kelas
      .filter((k) => k.hari && k.jamMulai && k.jamSelesai)
      .map((k) => ({
        id: k.id,
        kodeMK: k.mataKuliah.kode,
        namaMK: k.mataKuliah.nama,
        sks: k.mataKuliah.sks,
        kodeKelas: k.kodeKelas,
        ruangan: k.ruangan?.kode ?? null,
        hari: k.hari!,
        jamMulai: k.jamMulai!,
        jamSelesai: k.jamSelesai!,
        pesertaCount: k._count.krs,
      })),
  });
});
