import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';

export const jadwalRouter = Router();

jadwalRouter.get('/jadwal', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const items = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id, status: 'disetujui' },
    include: {
      kelas: {
        include: {
          mataKuliah: true,
          dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
          ruangan: true,
        },
      },
    },
  });

  res.json({
    semester: { kode: semester.kode, jenis: semester.jenis },
    jadwal: items
      .filter((i) => i.kelas.hari && i.kelas.jamMulai && i.kelas.jamSelesai)
      .map((i) => ({
        id: i.id,
        kodeMK: i.kelas.mataKuliah.kode,
        namaMK: i.kelas.mataKuliah.nama,
        sks: i.kelas.mataKuliah.sks,
        kodeKelas: i.kelas.kodeKelas,
        dosen: [i.kelas.dosen.gelarDepan, i.kelas.dosen.nama, i.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
        ruangan: i.kelas.ruangan?.kode ?? null,
        hari: i.kelas.hari!,
        jamMulai: i.kelas.jamMulai!,
        jamSelesai: i.kelas.jamSelesai!,
      })),
  });
});
