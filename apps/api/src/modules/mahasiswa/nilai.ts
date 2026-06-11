import { Router } from 'express';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { calculateIp } from '../../lib/grade.js';

export const nilaiRouter = Router();

/**
 * Transkrip — semua nilai finalized + kumulatif IPK.
 */
nilaiRouter.get('/nilai/transkrip', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id, status: 'finalized' },
    include: {
      krs: {
        include: {
          kelas: { include: { mataKuliah: true, semester: { include: { tahunAjaran: true } } } },
        },
      },
    },
    orderBy: [{ krs: { kelas: { semester: { kode: 'asc' } } } }],
  });

  const items = nilai.map((n) => ({
    semesterKode: n.krs.kelas.semester.kode,
    semesterNama: `${n.krs.kelas.semester.jenis} ${n.krs.kelas.semester.tahunAjaran.kode}`,
    kodeMK: n.krs.kelas.mataKuliah.kode,
    namaMK: n.krs.kelas.mataKuliah.nama,
    sks: n.krs.kelas.mataKuliah.sks,
    nilaiHuruf: n.nilaiHuruf,
    nilaiAngka: n.nilaiAngka,
    bobot: n.bobot,
  }));

  const ipk = calculateIp(items.map((i) => ({ sks: i.sks, bobot: i.bobot ?? null })));

  res.json({
    mahasiswa: { nim: m.nim, nama: m.nama, angkatan: m.angkatan },
    ipk: ipk.ip,
    totalSksLulus: ipk.totalSks,
    items,
  });
});

/**
 * KHS — semua nilai (termasuk draft & belum) dikelompokkan per semester + IP per semester.
 */
nilaiRouter.get('/nilai/khs', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId: m.id },
    include: {
      krs: {
        include: {
          kelas: {
            include: {
              mataKuliah: true,
              semester: { include: { tahunAjaran: true } },
              dosen: { select: { nama: true, gelarDepan: true, gelarBelakang: true } },
            },
          },
        },
      },
    },
  });

  const bySemesterMap = new Map<string, {
    semesterKode: string;
    semesterNama: string;
    items: Array<{
      kodeMK: string; namaMK: string; sks: number; dosen: string;
      tugas: number | null; uts: number | null; uas: number | null; praktikum: number | null; kehadiran: number | null;
      nilaiAngka: number | null; nilaiHuruf: string | null; bobot: number | null; status: string;
    }>;
    ip: number;
    totalSks: number;
  }>();

  for (const n of nilai) {
    const sem = n.krs.kelas.semester;
    const key = sem.kode;
    if (!bySemesterMap.has(key)) {
      bySemesterMap.set(key, {
        semesterKode: sem.kode,
        semesterNama: `${sem.jenis} ${sem.tahunAjaran.kode}`,
        items: [],
        ip: 0,
        totalSks: 0,
      });
    }
    const bucket = bySemesterMap.get(key)!;
    bucket.items.push({
      kodeMK: n.krs.kelas.mataKuliah.kode,
      namaMK: n.krs.kelas.mataKuliah.nama,
      sks: n.krs.kelas.mataKuliah.sks,
      dosen: [n.krs.kelas.dosen.gelarDepan, n.krs.kelas.dosen.nama, n.krs.kelas.dosen.gelarBelakang].filter(Boolean).join(' '),
      tugas: n.tugas, uts: n.uts, uas: n.uas, praktikum: n.praktikum, kehadiran: n.kehadiran,
      nilaiAngka: n.nilaiAngka, nilaiHuruf: n.nilaiHuruf, bobot: n.bobot, status: n.status,
    });
  }

  // hitung IP per semester (cuma item finalized)
  for (const bucket of bySemesterMap.values()) {
    const finalItems = bucket.items.filter((i) => i.bobot != null);
    const { ip, totalSks } = calculateIp(finalItems.map((i) => ({ sks: i.sks, bobot: i.bobot })));
    bucket.ip = ip;
    bucket.totalSks = totalSks;
  }

  const semesters = [...bySemesterMap.values()].sort((a, b) => b.semesterKode.localeCompare(a.semesterKode));
  res.json({ semesters });
});
