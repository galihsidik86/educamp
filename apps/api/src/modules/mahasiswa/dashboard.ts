import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { calculateIp } from '../../lib/grade.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const semester = await getActiveSemester();

  // KRS semester aktif (disetujui ATAU draft — kita pisahkan)
  const krsAktif = await prisma.krs.findMany({
    where: { mahasiswaId: m.id, semesterId: semester.id },
    include: { kelas: { include: { mataKuliah: true } } },
  });
  const sksAmbil = krsAktif
    .filter((k) => k.status === 'disetujui' || k.status === 'diajukan' || k.status === 'draft')
    .reduce((sum, k) => sum + k.kelas.mataKuliah.sks, 0);

  // Nilai finalized semua semester → IPK
  const semuaNilai = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id, status: 'finalized' },
    include: { krs: { include: { kelas: { include: { mataKuliah: true, semester: true } } } } },
  });

  const itemsIpk = semuaNilai.map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot ?? null }));
  const { ip: ipk, totalSks: sksLulus } = calculateIp(itemsIpk);

  // IP semester sebelumnya (semester finalized terakhir)
  const lastSem = semuaNilai
    .map((n) => n.krs.kelas.semester)
    .sort((a, b) => b.kode.localeCompare(a.kode))[0];
  let ipSemester = 0;
  if (lastSem) {
    const lastItems = semuaNilai
      .filter((n) => n.krs.kelas.semesterId === lastSem.id)
      .map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot ?? null }));
    ipSemester = calculateIp(lastItems).ip;
  }

  // Tagihan aktif (belum lunas) — semua semester
  const tagihanAktif = await prisma.tagihan.findMany({
    where: { mahasiswaId: m.id, status: { in: ['belum_bayar', 'cicil', 'jatuh_tempo'] } },
  });
  const tagihanTotal = tagihanAktif.reduce((sum, t) => sum + Number(t.jumlah), 0);

  // Jadwal hari ini
  const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const;
  const today = HARI[new Date().getDay()]!;
  const jadwalHariIni = krsAktif
    .filter((k) => k.status === 'disetujui' && k.kelas.hari === today)
    .map((k) => ({
      kode: k.kelas.mataKuliah.kode,
      nama: k.kelas.mataKuliah.nama,
      jamMulai: k.kelas.jamMulai,
      jamSelesai: k.kelas.jamSelesai,
      kodeKelas: k.kelas.kodeKelas,
    }))
    .sort((a, b) => (a.jamMulai ?? '').localeCompare(b.jamMulai ?? ''));

  // Pengumuman terbaru target mahasiswa / all
  const pengumuman = await prisma.pengumuman.findMany({
    where: { OR: [{ target: 'all' }, { target: 'mahasiswa' }, { target: `prodi:${m.prodiId}` }] },
    orderBy: { tanggal: 'desc' },
    take: 5,
  });

  res.json({
    semester: { kode: semester.kode, nama: `${semester.jenis} ${semester.tahunAjaran.kode}`, krsSelesai: semester.krsSelesai },
    ipSemester,
    ipk,
    sksAmbil,
    sksLulus,
    tagihanTotal,
    tagihanCount: tagihanAktif.length,
    jadwalHariIni,
    pengumuman,
    today,
  });
});
