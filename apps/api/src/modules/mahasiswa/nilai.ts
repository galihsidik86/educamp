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
 *
 * Gate EDOM: kalau semester punya EdomKuesioner aktif & mahasiswa belum
 * mengisi EDOM untuk SEMUA kelas KRS-nya, KHS semester itu dikunci.
 * Setelah kuesioner di-non-aktifkan oleh admin, KHS otomatis terbuka
 * sehingga histori lama tetap dapat diakses.
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

  type KhsItem = {
    kodeMK: string; namaMK: string; sks: number; dosen: string;
    tugas: number | null; uts: number | null; uas: number | null; praktikum: number | null; kehadiran: number | null;
    nilaiAngka: number | null; nilaiHuruf: string | null; bobot: number | null; status: string;
  };
  type Bucket = {
    semesterId: string; semesterKode: string; semesterNama: string;
    items: KhsItem[]; ip: number; totalSks: number;
    locked: boolean; pendingEdomCount: number; totalKelas: number; kuesionerId: string | null;
  };
  const bySemesterMap = new Map<string, Bucket>();

  for (const n of nilai) {
    const sem = n.krs.kelas.semester;
    const key = sem.kode;
    if (!bySemesterMap.has(key)) {
      bySemesterMap.set(key, {
        semesterId: sem.id,
        semesterKode: sem.kode,
        semesterNama: `${sem.jenis} ${sem.tahunAjaran.kode}`,
        items: [],
        ip: 0,
        totalSks: 0,
        locked: false, pendingEdomCount: 0, totalKelas: 0, kuesionerId: null,
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

  // ===== EDOM gating per semester =====
  const semesterIds = [...bySemesterMap.values()].map((b) => b.semesterId);
  if (semesterIds.length > 0) {
    const aktifKuesioners = await prisma.edomKuesioner.findMany({
      where: { semesterId: { in: semesterIds }, isAktif: true },
      select: { id: true, semesterId: true },
    });
    if (aktifKuesioners.length > 0) {
      const kuesionerBySemester = new Map(aktifKuesioners.map((k) => [k.semesterId, k.id]));
      const aktifSemesterIds = aktifKuesioners.map((k) => k.semesterId);

      // Hitung total KRS-disetujui mhs per semester (yang wajib di-EDOM)
      const krsAktif = await prisma.krs.findMany({
        where: { mahasiswaId: m.id, semesterId: { in: aktifSemesterIds }, status: 'disetujui' },
        select: { semesterId: true, kelasId: true },
      });
      const krsBySemester = new Map<string, Set<string>>();
      for (const k of krsAktif) {
        if (!krsBySemester.has(k.semesterId)) krsBySemester.set(k.semesterId, new Set());
        krsBySemester.get(k.semesterId)!.add(k.kelasId);
      }

      // Hitung EDOM response mhs per kuesioner aktif
      const responses = await prisma.edomResponse.findMany({
        where: { mahasiswaId: m.id, kuesionerId: { in: aktifKuesioners.map((k) => k.id) } },
        select: { kuesionerId: true, kelasId: true },
      });
      const responseByKuesioner = new Map<string, Set<string>>();
      for (const r of responses) {
        if (!responseByKuesioner.has(r.kuesionerId)) responseByKuesioner.set(r.kuesionerId, new Set());
        responseByKuesioner.get(r.kuesionerId)!.add(r.kelasId);
      }

      // Set locked status per semester
      for (const bucket of bySemesterMap.values()) {
        const kuesionerId = kuesionerBySemester.get(bucket.semesterId);
        if (!kuesionerId) continue;
        const krsKelas = krsBySemester.get(bucket.semesterId) ?? new Set();
        const responseKelas = responseByKuesioner.get(kuesionerId) ?? new Set();
        const pending = [...krsKelas].filter((kelasId) => !responseKelas.has(kelasId));
        bucket.kuesionerId = kuesionerId;
        bucket.totalKelas = krsKelas.size;
        bucket.pendingEdomCount = pending.length;
        if (pending.length > 0) {
          // Locked: kosongkan items + IP supaya UI tahu harus EDOM dulu
          bucket.locked = true;
          bucket.items = [];
          bucket.ip = 0;
          bucket.totalSks = 0;
        }
      }
    }
  }

  const semesters = [...bySemesterMap.values()].sort((a, b) => b.semesterKode.localeCompare(a.semesterKode));
  res.json({ semesters });
});
