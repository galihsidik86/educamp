// ============================================================
// Seed data — STMIK Tazkia SIAKAD
// Jalankan: npm run prisma:seed  (atau `prisma db seed`)
// Aman dijalankan berulang — pakai upsert pada record kunci.
// ============================================================

import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PrismaClient, Role, Jenjang, JenisKelamin, JenisSemester, JenisMK, Hari,
  JabatanFungsional, StatusKrs, StatusNilai, JenisTagihan, StatusTagihan,
  MetodeBayar, StatusKegiatan, StatusKkn,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedFeatures } from './seed-features.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();
const PW_HASH = bcrypt.hashSync('password123', 10);

async function main() {
  console.log('▶ Seed: PDDikti reference tables');
  // Kode agama (PDDikti standard)
  await prisma.$transaction([
    ...[
      { kode: 1, nama: 'Islam' },
      { kode: 2, nama: 'Kristen Protestan' },
      { kode: 3, nama: 'Katolik' },
      { kode: 4, nama: 'Hindu' },
      { kode: 5, nama: 'Buddha' },
      { kode: 6, nama: 'Khonghucu' },
      { kode: 99, nama: 'Lainnya' },
    ].map((r) => prisma.kodeAgama.upsert({ where: { kode: r.kode }, update: { nama: r.nama }, create: r })),
  ]);
  await prisma.$transaction([
    ...[
      { kode: 1, nama: 'Bersama Orang Tua' },
      { kode: 2, nama: 'Asrama' },
      { kode: 3, nama: 'Kos/Sewa' },
      { kode: 4, nama: 'Rumah Sendiri' },
      { kode: 5, nama: 'Tinggal di Rumah Keluarga' },
      { kode: 6, nama: 'Lainnya' },
    ].map((r) => prisma.kodeJenisTinggal.upsert({ where: { kode: r.kode }, update: { nama: r.nama }, create: r })),
  ]);
  await prisma.$transaction([
    ...[
      { kode: 1, nama: 'Jalan Kaki' },
      { kode: 2, nama: 'Sepeda' },
      { kode: 3, nama: 'Sepeda Motor' },
      { kode: 4, nama: 'Mobil Pribadi' },
      { kode: 5, nama: 'Angkutan Umum' },
      { kode: 6, nama: 'Kereta Api' },
      { kode: 7, nama: 'Kapal/Perahu' },
      { kode: 8, nama: 'Lainnya' },
    ].map((r) => prisma.kodeAlatTransportasi.upsert({ where: { kode: r.kode }, update: { nama: r.nama }, create: r })),
  ]);
  await prisma.$transaction([
    ...[
      { kode: 'SNMPTN', nama: 'Seleksi Nasional Masuk PTN' },
      { kode: 'SBMPTN', nama: 'Seleksi Bersama Masuk PTN' },
      { kode: 'MANDIRI', nama: 'Jalur Mandiri' },
      { kode: 'KIPK', nama: 'KIP Kuliah' },
      { kode: 'PRESTASI', nama: 'Jalur Prestasi' },
      { kode: 'KERJASAMA', nama: 'Jalur Kerjasama' },
      { kode: 'TRANSFER', nama: 'Pindah/Transfer' },
      { kode: 'LAINNYA', nama: 'Lainnya' },
    ].map((r) => prisma.kodeJalurMasuk.upsert({ where: { kode: r.kode }, update: { nama: r.nama }, create: r })),
  ]);

  // Bootstrap super-admin lewat env — supaya pasca-wipe DB tetap ada 1 akun
  // untuk login. Tidak mengubah password kalau user sudah ada (idempotent).
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword) {
    console.log(`▶ Seed: bootstrap super admin ${bootstrapEmail}`);
    const existing = await prisma.user.findUnique({ where: { email: bootstrapEmail } });
    await prisma.user.upsert({
      where: { email: bootstrapEmail },
      update: { akademik: { update: { subRole: 'super_admin' } } },
      create: {
        email: bootstrapEmail,
        passwordHash: bcrypt.hashSync(bootstrapPassword, 10),
        role: Role.akademik,
        akademik: {
          create: {
            nama: 'Super Admin',
            nip: `BOOTSTRAP-${Date.now()}`,
            jabatan: 'Super Admin',
            subRole: 'super_admin',
          },
        },
      },
    });
    if (!existing) console.log(`  → akun baru dibuat (password dari env).`);
  }

  // Mode produksi: skip semua data demo. PDDikti reference + bootstrap admin
  // di atas tetap dijalankan (idempotent, aman).
  const seedDemo = (process.env.SEED_DEMO ?? 'true').toLowerCase() !== 'false';
  if (!seedDemo) {
    console.log('⊘ SEED_DEMO=false — lewati semua data demo (mode produksi).');
    console.log('✓ Seed selesai.');
    return;
  }

  console.log('▶ Seed: fakultas & prodi');
  const fakultas = await prisma.fakultas.upsert({
    where: { kode: 'FTI' },
    update: {},
    create: { kode: 'FTI', nama: 'Fakultas Teknologi Informasi' },
  });

  const prodiSI = await prisma.prodi.upsert({
    where: { kode: '57201' },
    update: {},
    create: { kode: '57201', nama: 'Sistem Informasi', jenjang: Jenjang.s1, fakultasId: fakultas.id },
  });
  const prodiTI = await prisma.prodi.upsert({
    where: { kode: '55201' },
    update: {},
    create: { kode: '55201', nama: 'Teknik Informatika', jenjang: Jenjang.s1, fakultasId: fakultas.id },
  });

  console.log('▶ Seed: tahun ajaran + semester aktif');
  const ta = await prisma.tahunAjaran.upsert({
    where: { kode: '2025/2026' },
    update: {},
    create: { kode: '2025/2026', nama: '2025/2026', tahunMulai: 2025, tahunSelesai: 2026, isAktif: true },
  });
  // Periode KRS dihitung relatif ke saat seed dijalankan supaya selalu aktif untuk demo.
  const now = new Date();
  const krsMulai = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const krsSelesai = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nilaiMulai = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const nilaiSelesai = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const semGanjil = await prisma.semester.upsert({
    where: { kode: '20251' },
    update: { krsMulai, krsSelesai, nilaiMulai, nilaiSelesai, isAktif: true },
    create: {
      kode: '20251',
      jenis: JenisSemester.ganjil,
      tahunAjaranId: ta.id,
      isAktif: true,
      krsMulai,
      krsSelesai,
      nilaiMulai,
      nilaiSelesai,
    },
  });

  console.log('▶ Seed: ruangan');
  const r101 = await prisma.ruangan.upsert({
    where: { kode: 'R-101' },
    update: {},
    create: { kode: 'R-101', nama: 'Ruang 101', gedung: 'A', lantai: 1, kapasitas: 40 },
  });
  const r205 = await prisma.ruangan.upsert({
    where: { kode: 'R-205' },
    update: {},
    create: { kode: 'R-205', nama: 'Ruang 205', gedung: 'A', lantai: 2, kapasitas: 40 },
  });
  const lab1 = await prisma.ruangan.upsert({
    where: { kode: 'LAB-1' },
    update: {},
    create: { kode: 'LAB-1', nama: 'Laboratorium Komputer 1', gedung: 'B', lantai: 1, kapasitas: 30 },
  });

  console.log('▶ Seed: akun akademik (5 sub-peran)');

  // Super admin — akses semua modul. Akun BARU agar nama jelas (sebelumnya
  // akademik@tazkia.ac.id dipakai sebagai super, sekarang diturunkan ke
  // akademik scope karena membingungkan secara penamaan).
  await prisma.user.upsert({
    where: { email: 'superadmin@tazkia.ac.id' },
    update: { akademik: { update: { subRole: 'super_admin' } } },
    create: {
      email: 'superadmin@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: {
        create: { nama: 'Super Admin', nip: '198001012010010001', jabatan: 'Super Admin BAAK', subRole: 'super_admin' },
      },
    },
  });

  // Akademik core (Kepala BAAK) — sekarang scope 'akademik' saja, tidak super.
  const userAkademik = await prisma.user.upsert({
    where: { email: 'akademik@tazkia.ac.id' },
    update: {
      akademik: {
        update: { subRole: 'akademik', jabatan: 'Kepala BAAK' },
      },
    },
    create: {
      email: 'akademik@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: {
        create: { nama: 'Bagian Akademik', nip: '198001012010011001', jabatan: 'Kepala BAAK', subRole: 'akademik' },
      },
    },
  });

  // Duplicate dgn nama lain — staf akademik biasa
  await prisma.user.upsert({
    where: { email: 'admin.akademik@tazkia.ac.id' },
    update: { akademik: { update: { subRole: 'akademik' } } },
    create: {
      email: 'admin.akademik@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: { create: { nama: 'Admin Akademik', nip: '198101012011011001', jabatan: 'Staf Akademik', subRole: 'akademik' } },
    },
  });

  // Admin keuangan
  await prisma.user.upsert({
    where: { email: 'admin.keuangan@tazkia.ac.id' },
    update: { akademik: { update: { subRole: 'keuangan' } } },
    create: {
      email: 'admin.keuangan@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: { create: { nama: 'Admin Keuangan', nip: '198201012012011001', jabatan: 'Staf Keuangan & UKT', subRole: 'keuangan' } },
    },
  });

  // Admin prodi — link ke prodi pertama yang di-seed (kalau ada), kalau tidak biarkan null.
  const prodiPertama = await prisma.prodi.findFirst({ select: { id: true, nama: true } });
  await prisma.user.upsert({
    where: { email: 'admin.prodi@tazkia.ac.id' },
    update: {
      akademik: { update: { subRole: 'prodi', prodiId: prodiPertama?.id ?? null } },
    },
    create: {
      email: 'admin.prodi@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: {
        create: {
          nama: 'Admin Prodi',
          nip: '198301012013011001',
          jabatan: prodiPertama ? `Ka. Prodi ${prodiPertama.nama}` : 'Staf Prodi',
          subRole: 'prodi',
          prodiId: prodiPertama?.id ?? null,
        },
      },
    },
  });

  // Admin SPMI
  await prisma.user.upsert({
    where: { email: 'admin.spmi@tazkia.ac.id' },
    update: { akademik: { update: { subRole: 'spmi' } } },
    create: {
      email: 'admin.spmi@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.akademik,
      akademik: { create: { nama: 'Admin SPMI', nip: '198401012014011001', jabatan: 'LPM / SPMI', subRole: 'spmi' } },
    },
  });

  console.log('▶ Seed: akun dosen');
  const userDosen1 = await prisma.user.upsert({
    where: { email: 'dosen.budi@tazkia.ac.id' },
    update: {},
    create: {
      email: 'dosen.budi@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.dosen,
      dosen: {
        create: {
          nidn: '0401018501',
          nama: 'Budi Santoso',
          gelarDepan: 'Dr.',
          gelarBelakang: 'M.Kom.',
          prodiId: prodiTI.id,
          jabatanFungsional: JabatanFungsional.lektor,
          isDpa: true,
        },
      },
    },
    include: { dosen: true },
  });
  const userDosen2 = await prisma.user.upsert({
    where: { email: 'dosen.siti@tazkia.ac.id' },
    update: {},
    create: {
      email: 'dosen.siti@tazkia.ac.id',
      passwordHash: PW_HASH,
      role: Role.dosen,
      dosen: {
        create: {
          nidn: '0405039002',
          nama: 'Siti Rahmawati',
          gelarBelakang: 'M.T.',
          prodiId: prodiSI.id,
          jabatanFungsional: JabatanFungsional.asisten_ahli,
          isDpa: true,
        },
      },
    },
    include: { dosen: true },
  });

  const dosen1 = userDosen1.dosen!;
  const dosen2 = userDosen2.dosen!;

  console.log('▶ Seed: kurikulum');
  const kurikulum = await prisma.kurikulum.upsert({
    where: { kode: 'K2024-TI' },
    update: {},
    create: { kode: 'K2024-TI', nama: 'Kurikulum 2024 - Teknik Informatika', tahun: 2024, prodiId: prodiTI.id, isAktif: true },
  });

  console.log('▶ Seed: mata kuliah + kurikulum link');
  const mks = [
    { kode: 'IF-3101', nama: 'Rekayasa Perangkat Lunak', sks: 3, semester: 5 },
    { kode: 'IF-3102', nama: 'Kecerdasan Buatan', sks: 3, semester: 5 },
    { kode: 'IF-3103', nama: 'Basis Data Lanjut', sks: 3, semester: 5 },
    { kode: 'IF-3104', nama: 'Pemrograman Web', sks: 3, semester: 5 },
    { kode: 'UNV-1001', nama: 'Pendidikan Agama Islam', sks: 2, semester: 1 },
    { kode: 'UNV-1002', nama: 'Bahasa Indonesia', sks: 2, semester: 1 },
  ];

  const createdMks = await Promise.all(
    mks.map((mk) =>
      prisma.mataKuliah.upsert({
        where: { prodiId_kode: { prodiId: prodiTI.id, kode: mk.kode } },
        update: {},
        create: {
          kode: mk.kode,
          nama: mk.nama,
          sks: mk.sks,
          sksTeori: mk.sks,
          jenis: mk.kode.startsWith('UNV') ? JenisMK.wajib_universitas : JenisMK.wajib_prodi,
          prodiId: prodiTI.id,
        },
      }),
    ),
  );

  await Promise.all(
    createdMks.map((mk, i) =>
      prisma.mataKuliahKurikulum.upsert({
        where: { kurikulumId_mataKuliahId: { kurikulumId: kurikulum.id, mataKuliahId: mk.id } },
        update: {},
        create: { kurikulumId: kurikulum.id, mataKuliahId: mk.id, semester: mks[i]!.semester },
      }),
    ),
  );

  console.log('▶ Seed: kelas (jadwal) untuk semester aktif');
  const kelasData = [
    { mkKode: 'IF-3101', kode: 'A', dosen: dosen1, ruang: r101, hari: Hari.senin, mulai: '08:00', selesai: '09:40' },
    { mkKode: 'IF-3102', kode: 'A', dosen: dosen1, ruang: r205, hari: Hari.selasa, mulai: '10:00', selesai: '11:40' },
    { mkKode: 'IF-3103', kode: 'A', dosen: dosen2, ruang: r205, hari: Hari.rabu, mulai: '13:00', selesai: '14:40' },
    { mkKode: 'IF-3104', kode: 'A', dosen: dosen2, ruang: lab1, hari: Hari.kamis, mulai: '08:00', selesai: '10:30' },
  ];

  for (const k of kelasData) {
    const mk = createdMks.find((m) => m.kode === k.mkKode)!;
    const kelasRow = await prisma.kelas.upsert({
      where: {
        mataKuliahId_semesterId_kodeKelas: {
          mataKuliahId: mk.id,
          semesterId: semGanjil.id,
          kodeKelas: k.kode,
        },
      },
      update: {},
      create: {
        mataKuliahId: mk.id,
        semesterId: semGanjil.id,
        dosenId: k.dosen.id,
        ruanganId: k.ruang.id,
        kodeKelas: k.kode,
        kapasitas: 40,
        hari: k.hari,
        jamMulai: k.mulai,
        jamSelesai: k.selesai,
      },
    });
    await prisma.kelasDosen.upsert({
      where: { kelasId_dosenId: { kelasId: kelasRow.id, dosenId: k.dosen.id } },
      update: { peran: 'lead' },
      create: { kelasId: kelasRow.id, dosenId: k.dosen.id, peran: 'lead' },
    });
  }

  console.log('▶ Seed: mahasiswa');
  const mahasiswaData = [
    { email: 'aisyah@student.tazkia.ac.id', nim: '2021110001', nama: 'Aisyah Putri', jk: JenisKelamin.P, prodi: prodiTI, dpa: dosen1.id },
    { email: 'rizky@student.tazkia.ac.id',  nim: '2021110002', nama: 'Rizky Pratama', jk: JenisKelamin.L, prodi: prodiTI, dpa: dosen1.id },
    { email: 'farah@student.tazkia.ac.id',  nim: '2021110003', nama: 'Farah Nadhira', jk: JenisKelamin.P, prodi: prodiSI, dpa: dosen2.id },
  ];

  for (const m of mahasiswaData) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        passwordHash: PW_HASH,
        role: Role.mahasiswa,
        mahasiswa: {
          create: {
            nim: m.nim,
            nama: m.nama,
            jenisKelamin: m.jk,
            angkatan: 2021,
            prodiId: m.prodi.id,
            dpaId: m.dpa,
          },
        },
      },
    });
  }

  // ============================================================
  // FASE 2 — semester sebelumnya + nilai finalized + KRS draft + tagihan + tri dharma + KKN
  // ============================================================

  console.log('▶ Seed: tahun ajaran sebelumnya + semester genap (untuk transkrip)');
  const taPrev = await prisma.tahunAjaran.upsert({
    where: { kode: '2024/2025' },
    update: {},
    create: { kode: '2024/2025', nama: '2024/2025', tahunMulai: 2024, tahunSelesai: 2025 },
  });
  const semGenapPrev = await prisma.semester.upsert({
    where: { kode: '20242' },
    update: {},
    create: {
      kode: '20242',
      jenis: JenisSemester.genap,
      tahunAjaranId: taPrev.id,
      isAktif: false,
    },
  });

  console.log('▶ Seed: MK + kelas semester sebelumnya (4 MK selesai)');
  const mksPrev = [
    { kode: 'IF-2201', nama: 'Algoritma & Pemrograman', sks: 3, sem: 4, dosen: dosen1, hari: Hari.senin, jam: ['08:00', '09:40'] },
    { kode: 'IF-2202', nama: 'Struktur Data', sks: 3, sem: 4, dosen: dosen1, hari: Hari.selasa, jam: ['10:00', '11:40'] },
    { kode: 'IF-2203', nama: 'Sistem Operasi', sks: 3, sem: 4, dosen: dosen2, hari: Hari.rabu, jam: ['08:00', '09:40'] },
    { kode: 'IF-2204', nama: 'Jaringan Komputer', sks: 3, sem: 4, dosen: dosen2, hari: Hari.kamis, jam: ['13:00', '14:40'] },
  ];

  for (const mk of mksPrev) {
    const m = await prisma.mataKuliah.upsert({
      where: { prodiId_kode: { prodiId: prodiTI.id, kode: mk.kode } },
      update: {},
      create: {
        kode: mk.kode, nama: mk.nama, sks: mk.sks, sksTeori: mk.sks,
        jenis: JenisMK.wajib_prodi, prodiId: prodiTI.id,
      },
    });
    const kelasRow = await prisma.kelas.upsert({
      where: {
        mataKuliahId_semesterId_kodeKelas: {
          mataKuliahId: m.id, semesterId: semGenapPrev.id, kodeKelas: 'A',
        },
      },
      update: {},
      create: {
        mataKuliahId: m.id, semesterId: semGenapPrev.id, dosenId: mk.dosen.id,
        ruanganId: r101.id, kodeKelas: 'A', kapasitas: 40,
        hari: mk.hari, jamMulai: mk.jam[0], jamSelesai: mk.jam[1],
      },
    });
    await prisma.kelasDosen.upsert({
      where: { kelasId_dosenId: { kelasId: kelasRow.id, dosenId: mk.dosen.id } },
      update: { peran: 'lead' },
      create: { kelasId: kelasRow.id, dosenId: mk.dosen.id, peran: 'lead' },
    });
  }

  console.log('▶ Seed: prasyarat MK');
  const prasyaratData = [
    { utama: 'IF-3101', prasyarat: 'IF-2201', nilaiMinimal: 'C' }, // RPL ← Algoritma & Pemrograman
    { utama: 'IF-3102', prasyarat: 'IF-2202', nilaiMinimal: 'C' }, // Kecerdasan Buatan ← Struktur Data
    { utama: 'IF-3104', prasyarat: 'IF-2201', nilaiMinimal: null }, // Pemrograman Web ← Algoritma (lulus)
  ];
  for (const p of prasyaratData) {
    const utama = await prisma.mataKuliah.findUnique({ where: { prodiId_kode: { prodiId: prodiTI.id, kode: p.utama } } });
    const prereq = await prisma.mataKuliah.findUnique({ where: { prodiId_kode: { prodiId: prodiTI.id, kode: p.prasyarat } } });
    if (!utama || !prereq) continue;
    await prisma.prasyarat.upsert({
      where: { mkUtamaId_mkPrasyaratId: { mkUtamaId: utama.id, mkPrasyaratId: prereq.id } },
      update: { nilaiMinimal: p.nilaiMinimal },
      create: { mkUtamaId: utama.id, mkPrasyaratId: prereq.id, nilaiMinimal: p.nilaiMinimal },
    });
  }

  console.log('▶ Seed: KRS + nilai finalized untuk Aisyah (semester sebelumnya)');
  const aisyah = await prisma.mahasiswa.findUnique({ where: { nim: '2021110001' } });
  if (aisyah) {
    const nilaiHurufList: Array<{ huruf: string; bobot: number; angka: number }> = [
      { huruf: 'A', bobot: 4.0, angka: 88 },
      { huruf: 'AB', bobot: 3.5, angka: 78 },
      { huruf: 'B', bobot: 3.0, angka: 72 },
      { huruf: 'A', bobot: 4.0, angka: 90 },
    ];

    for (let i = 0; i < mksPrev.length; i++) {
      const mk = mksPrev[i]!;
      const grade = nilaiHurufList[i]!;
      const kelasRow = await prisma.kelas.findFirst({
        where: { semesterId: semGenapPrev.id, mataKuliah: { kode: mk.kode }, kodeKelas: 'A' },
      });
      if (!kelasRow) continue;

      const krs = await prisma.krs.upsert({
        where: { mahasiswaId_kelasId: { mahasiswaId: aisyah.id, kelasId: kelasRow.id } },
        update: {},
        create: {
          mahasiswaId: aisyah.id, kelasId: kelasRow.id, semesterId: semGenapPrev.id,
          status: StatusKrs.disetujui,
        },
      });

      await prisma.nilai.upsert({
        where: { krsId: krs.id },
        update: {},
        create: {
          krsId: krs.id, mahasiswaId: aisyah.id,
          tugas: grade.angka - 2, uts: grade.angka, uas: grade.angka + 1, kehadiran: 100,
          nilaiAngka: grade.angka, nilaiHuruf: grade.huruf, bobot: grade.bobot,
          status: StatusNilai.finalized,
        },
      });
    }

    console.log('▶ Seed: KRS draft semester aktif untuk Aisyah (reset bila ada)');
    // Hapus nilai dari KRS semester aktif supaya demo selalu mulai dari kondisi awal
    // (tidak menyentuh nilai semester sebelumnya yang dipakai untuk transkrip & IPK).
    await prisma.nilai.deleteMany({
      where: { mahasiswaId: aisyah.id, krs: { semesterId: semGanjil.id } },
    });
    const kelasAktif = await prisma.kelas.findMany({
      where: { semesterId: semGanjil.id },
      orderBy: { hari: 'asc' },
    });
    for (const k of kelasAktif) {
      await prisma.krs.upsert({
        where: { mahasiswaId_kelasId: { mahasiswaId: aisyah.id, kelasId: k.id } },
        update: { status: StatusKrs.draft, catatan: null },
        create: {
          mahasiswaId: aisyah.id, kelasId: k.id, semesterId: semGanjil.id,
          status: StatusKrs.draft,
        },
      });
    }

    console.log('▶ Seed: tagihan + pembayaran Aisyah');
    let tagihanSpp = await prisma.tagihan.findFirst({
      where: { mahasiswaId: aisyah.id, semesterId: semGanjil.id, jenis: JenisTagihan.spp },
    });
    if (!tagihanSpp) {
      tagihanSpp = await prisma.tagihan.create({
        data: {
          mahasiswaId: aisyah.id, semesterId: semGanjil.id, jenis: JenisTagihan.spp,
          deskripsi: 'SPP Semester Ganjil 2025/2026',
          jumlah: 4500000, jatuhTempo: new Date('2025-09-15'),
          status: StatusTagihan.belum_bayar,
        },
      });
    }

    let tagihanPemb = await prisma.tagihan.findFirst({
      where: { mahasiswaId: aisyah.id, semesterId: semGanjil.id, jenis: JenisTagihan.pembangunan },
    });
    if (!tagihanPemb) {
      tagihanPemb = await prisma.tagihan.create({
        data: {
          mahasiswaId: aisyah.id, semesterId: semGanjil.id, jenis: JenisTagihan.pembangunan,
          deskripsi: 'Sumbangan Pembangunan',
          jumlah: 1500000, jatuhTempo: new Date('2025-09-15'),
          status: StatusTagihan.lunas,
        },
      });
      await prisma.pembayaran.create({
        data: {
          tagihanId: tagihanPemb.id, mahasiswaId: aisyah.id,
          jumlah: 1500000, tanggalBayar: new Date('2025-08-25'),
          metode: MetodeBayar.transfer_bank, catatan: 'Transfer ke BSI',
        },
      });
    }

    console.log('▶ Seed: penelitian + pengabdian + KKN Aisyah');
    let penelitian = await prisma.penelitian.findFirst({
      where: { judul: 'Pemanfaatan AI untuk Klasifikasi Hadits', ketuaDosenId: dosen1.id },
    });
    if (!penelitian) {
      penelitian = await prisma.penelitian.create({
        data: {
          judul: 'Pemanfaatan AI untuk Klasifikasi Hadits',
          abstrak: 'Penelitian eksploratif penerapan model BERT untuk klasifikasi sanad hadits.',
          tahun: 2025, sumberDana: 'Hibah Internal Tazkia', jumlahDana: 25000000,
          ketuaDosenId: dosen1.id, status: StatusKegiatan.berjalan,
        },
      });
    }
    await prisma.penelitianMahasiswa.upsert({
      where: { penelitianId_mahasiswaId: { penelitianId: penelitian.id, mahasiswaId: aisyah.id } },
      update: {},
      create: { penelitianId: penelitian.id, mahasiswaId: aisyah.id, peran: 'Anggota' },
    });

    let pengabdian = await prisma.pengabdian.findFirst({
      where: { judul: 'Pelatihan Digital Marketing UMKM Sentul', ketuaDosenId: dosen2.id },
    });
    if (!pengabdian) {
      pengabdian = await prisma.pengabdian.create({
        data: {
          judul: 'Pelatihan Digital Marketing UMKM Sentul',
          deskripsi: 'Program pendampingan UMKM dalam pemanfaatan media sosial untuk pemasaran produk.',
          tahun: 2025, lokasi: 'Sentul, Bogor', sumberDana: 'Hibah Internal Tazkia', jumlahDana: 10000000,
          ketuaDosenId: dosen2.id, status: StatusKegiatan.selesai,
        },
      });
    }
    await prisma.pengabdianMahasiswa.upsert({
      where: { pengabdianId_mahasiswaId: { pengabdianId: pengabdian.id, mahasiswaId: aisyah.id } },
      update: {},
      create: { pengabdianId: pengabdian.id, mahasiswaId: aisyah.id, peran: 'Anggota' },
    });

    let pengabdianBudi = await prisma.pengabdian.findFirst({
      where: { judul: 'Literasi Coding untuk Santri Pesantren Sentul', ketuaDosenId: dosen1.id },
    });
    if (!pengabdianBudi) {
      pengabdianBudi = await prisma.pengabdian.create({
        data: {
          judul: 'Literasi Coding untuk Santri Pesantren Sentul',
          deskripsi: 'Pengenalan pemrograman Python kepada santri tingkat aliyah, fokus pada problem solving dan literasi digital.',
          tahun: 2025, lokasi: 'Pondok Pesantren Al-Hidayah Sentul', sumberDana: 'Hibah Internal Tazkia', jumlahDana: 8000000,
          ketuaDosenId: dosen1.id, status: StatusKegiatan.berjalan,
        },
      });
    }
    await prisma.pengabdianMahasiswa.upsert({
      where: { pengabdianId_mahasiswaId: { pengabdianId: pengabdianBudi.id, mahasiswaId: aisyah.id } },
      update: {},
      create: { pengabdianId: pengabdianBudi.id, mahasiswaId: aisyah.id, peran: 'Anggota' },
    });

    const kknExisting = await prisma.kkn.findFirst({
      where: { mahasiswaId: aisyah.id, periode: '2025 Genap' },
    });
    if (!kknExisting) {
      await prisma.kkn.create({
        data: {
          mahasiswaId: aisyah.id,
          periode: '2025 Genap',
          lokasi: 'Desa Cikeas Udik',
          desa: 'Cikeas Udik', kecamatan: 'Gunung Putri', kabupaten: 'Bogor',
          dplDosenId: dosen1.id,
          status: StatusKkn.pendaftaran,
        },
      });
    }
  }

  console.log('▶ Seed: tagihan SPP untuk Rizky & Farah');
  for (const nim of ['2021110002', '2021110003']) {
    const mhs = await prisma.mahasiswa.findUnique({ where: { nim } });
    if (!mhs) continue;
    const sudah = await prisma.tagihan.findFirst({
      where: { mahasiswaId: mhs.id, semesterId: semGanjil.id, jenis: JenisTagihan.spp },
    });
    if (!sudah) {
      await prisma.tagihan.create({
        data: {
          mahasiswaId: mhs.id, semesterId: semGanjil.id, jenis: JenisTagihan.spp,
          deskripsi: 'SPP Semester Ganjil 2025/2026',
          jumlah: 4500000, jatuhTempo: new Date('2025-09-15'),
          status: StatusTagihan.belum_bayar,
        },
      });
    }
  }

  console.log('▶ Seed: pengumuman contoh');
  await prisma.pengumuman.create({
    data: {
      judul: 'Pengisian KRS Semester Ganjil 2025/2026',
      isi: 'Pengisian KRS dibuka 1 Agustus 2025 dan ditutup 12 Agustus 2025 pukul 23:59 WIB. Mohon konsultasi dengan DPA sebelum pengajuan.',
      pengirim: 'BAAK',
      target: 'mahasiswa',
      isPenting: true,
    },
  }).catch(() => { /* idempoten — abaikan duplikasi */ });

  // Fitur lanjutan + SPMI lengkap
  await seedFeatures(prisma);

  console.log('✓ Seed selesai.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
