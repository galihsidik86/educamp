import { Router } from 'express';
import { prisma } from '../../db.js';
import { getActiveSemester, getDosenForUser } from '../../lib/context.js';
import { calculateIp } from '../../lib/grade.js';

export const dpaDashboardRouter = Router();

const IPK_AT_RISK = 2.0;
const KEHADIRAN_KRITIS = 75;

/**
 * Ringkasan dashboard DPA: agregat metrik untuk semua mahasiswa bimbingan.
 * Termasuk per-mahasiswa breakdown supaya UI bisa langsung tabel-kan.
 */
dpaDashboardRouter.get('/dpa-dashboard', async (req, res) => {
  const d = await getDosenForUser(req.user!.sub);
  const semester = await getActiveSemester();

  const mhsBimbingan = await prisma.mahasiswa.findMany({
    where: { dpaId: d.id },
    include: {
      prodi: { select: { kode: true, nama: true } },
      krs: {
        where: { semesterId: semester.id },
        include: { kelas: { include: { mataKuliah: { select: { kode: true, sks: true } } } } },
      },
    },
    orderBy: { nim: 'asc' },
  });

  const mhsIds = mhsBimbingan.map((m) => m.id);

  // Nilai finalized semua semester → IPK per mahasiswa
  const nilaiAll = await prisma.nilai.findMany({
    where: { mahasiswaId: { in: mhsIds }, status: 'finalized' },
    include: { krs: { include: { kelas: { include: { mataKuliah: { select: { sks: true } } } } } } },
  });
  const ipkPerMhs = new Map<string, number | null>();
  for (const mhsId of mhsIds) {
    const items = nilaiAll
      .filter((n) => n.mahasiswaId === mhsId)
      .map((n) => ({ sks: n.krs.kelas.mataKuliah.sks, bobot: n.bobot ?? null }));
    const { ip } = calculateIp(items);
    ipkPerMhs.set(mhsId, items.length > 0 ? ip : null);
  }

  // Absensi semester aktif → persentase kehadiran per mahasiswa
  const absensiAll = await prisma.absensi.findMany({
    where: {
      mahasiswaId: { in: mhsIds },
      pertemuan: { kelas: { semesterId: semester.id } },
    },
    select: { mahasiswaId: true, status: true },
  });
  const hadirPerMhs = new Map<string, { hadir: number; total: number }>();
  for (const a of absensiAll) {
    const cur = hadirPerMhs.get(a.mahasiswaId) ?? { hadir: 0, total: 0 };
    cur.total++;
    if (a.status === 'hadir') cur.hadir++;
    hadirPerMhs.set(a.mahasiswaId, cur);
  }

  // Susun item per mahasiswa
  const items = mhsBimbingan.map((m) => {
    const ipk = ipkPerMhs.get(m.id) ?? null;
    const att = hadirPerMhs.get(m.id);
    const persenHadir = att && att.total > 0 ? Math.round((att.hadir / att.total) * 100) : null;
    const totalSks = m.krs.reduce((s, k) => s + k.kelas.mataKuliah.sks, 0);
    const krsPending = m.krs.some((k) => k.status === 'diajukan');
    return {
      id: m.id,
      nim: m.nim,
      nama: m.nama,
      angkatan: m.angkatan,
      status: m.status,
      prodi: m.prodi,
      ipk,
      sksAmbil: totalSks,
      krsCount: m.krs.length,
      krsPending,
      persenHadir,
      atRiskIpk: ipk != null && ipk < IPK_AT_RISK,
      kritisKehadiran: persenHadir != null && persenHadir < KEHADIRAN_KRITIS,
    };
  });

  // Ringkasan global
  const ipkList = items.map((i) => i.ipk).filter((v): v is number => v != null);
  const ipkRataRata = ipkList.length > 0
    ? Math.round((ipkList.reduce((s, v) => s + v, 0) / ipkList.length) * 100) / 100
    : null;
  const ringkasan = {
    totalMahasiswa: items.length,
    krsPending: items.filter((i) => i.krsPending).length,
    atRiskIpk: items.filter((i) => i.atRiskIpk).length,
    kritisKehadiran: items.filter((i) => i.kritisKehadiran).length,
    ipkRataRata,
    semester: { kode: semester.kode, nama: `${semester.jenis} ${semester.tahunAjaran.kode}` },
    threshold: { ipkAtRisk: IPK_AT_RISK, kehadiranKritis: KEHADIRAN_KRITIS },
  };

  res.json({ ringkasan, items });
});
