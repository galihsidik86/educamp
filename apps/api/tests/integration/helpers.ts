// ============================================================
// Integration test helpers — DB cleanup + fixture factory.
// Mengharap test DB sudah dimigrasi:
//   TEST_DATABASE_URL=mysql://siakad:siakad_change_me@localhost:3306/siakad_test \
//   npx prisma migrate deploy
// ============================================================

import { prisma } from '../../src/db.js';
import { hashPassword } from '../../src/lib/password.js';
import { Role, Jenjang, JenisSemester, JenisKelamin, JenisMK, Hari, StatusKrs } from '@prisma/client';

const DEFAULT_PASSWORD = 'password123';

/**
 * Bersihkan semua tabel transaksional + auth. Dipanggil di beforeEach.
 * Master data (prodi/MK) di-reseed via createFixtures bila perlu.
 */
export async function resetDb() {
  // urutan penting karena FK constraint
  await prisma.$transaction([
    prisma.auditLog.deleteMany({}),
    prisma.notifikasi.deleteMany({}),
    prisma.refreshToken.deleteMany({}),
    prisma.nilai.deleteMany({}),
    prisma.krs.deleteMany({}),
    prisma.pembayaran.deleteMany({}),
    prisma.tagihan.deleteMany({}),
    prisma.kkn.deleteMany({}),
    prisma.mbkmKonversi.deleteMany({}),
    prisma.mbkm.deleteMany({}),
    prisma.skripsi.deleteMany({}),
    prisma.yudisium.deleteMany({}),
    prisma.periodeWisuda.deleteMany({}),
    // EDOM: kuesioner cascade ke aspek+response+jawaban
    prisma.edomKuesioner.deleteMany({}),
    prisma.penelitianMahasiswa.deleteMany({}),
    prisma.pengabdianMahasiswa.deleteMany({}),
    prisma.penelitian.deleteMany({}),
    prisma.pengabdian.deleteMany({}),
    prisma.kelas.deleteMany({}),
    prisma.mataKuliahKurikulum.deleteMany({}),
    prisma.prasyarat.deleteMany({}),
    prisma.mataKuliah.deleteMany({}),
    prisma.kurikulum.deleteMany({}),
    prisma.mahasiswa.deleteMany({}),
    prisma.dosen.deleteMany({}),
    prisma.akademik.deleteMany({}),
    prisma.user.deleteMany({}),
    prisma.semester.deleteMany({}),
    prisma.tahunAjaran.deleteMany({}),
    prisma.ruangan.deleteMany({}),
    prisma.prodi.deleteMany({}),
    prisma.fakultas.deleteMany({}),
    prisma.pengumuman.deleteMany({}),
  ]);
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

/**
 * Buat skenario uji standar: 1 prodi, 1 semester aktif, 1 ruangan,
 * 1 akademik + 1 dosen (DPA) + 1 mahasiswa (NIM 9999000001).
 * Pakai default password "password123".
 */
export async function createFixtures() {
  const pwHash = await hashPassword(DEFAULT_PASSWORD);

  const fakultas = await prisma.fakultas.create({
    data: { kode: 'FTI-T', nama: 'FTI Test' },
  });
  const prodi = await prisma.prodi.create({
    data: { kode: '55201T', nama: 'TI Test', jenjang: Jenjang.s1, fakultasId: fakultas.id },
  });

  const ta = await prisma.tahunAjaran.create({
    data: { kode: '2025/2026', nama: '2025/2026', tahunMulai: 2025, tahunSelesai: 2026, isAktif: true },
  });
  const semester = await prisma.semester.create({
    data: {
      kode: '20251',
      jenis: JenisSemester.ganjil,
      tahunAjaranId: ta.id,
      isAktif: true,
      krsMulai: new Date('2025-08-01'),
      krsSelesai: new Date('2026-12-31'), // jauh ke depan agar KRS terbuka
    },
  });

  const ruangan = await prisma.ruangan.create({
    data: { kode: 'R-T01', nama: 'Ruang Test', kapasitas: 40 },
  });

  const akademikU = await prisma.user.create({
    data: {
      email: 'akademik-t@test.id', passwordHash: pwHash, role: Role.akademik,
      akademik: { create: { nama: 'Akademik Test' } },
    },
    include: { akademik: true },
  });

  const dosenU = await prisma.user.create({
    data: {
      email: 'dosen-t@test.id', passwordHash: pwHash, role: Role.dosen,
      dosen: {
        create: {
          nidn: '9990000001', nama: 'Budi Test',
          prodiId: prodi.id, isDpa: true,
        },
      },
    },
    include: { dosen: true },
  });
  const dosen = dosenU.dosen!;

  const mhsU = await prisma.user.create({
    data: {
      email: 'mhs-t@test.id', passwordHash: pwHash, role: Role.mahasiswa,
      mahasiswa: {
        create: {
          nim: '9999000001',
          nama: 'Aisyah Test',
          jenisKelamin: JenisKelamin.P,
          angkatan: 2024,
          prodiId: prodi.id,
          dpaId: dosen.id,
        },
      },
    },
    include: { mahasiswa: true },
  });
  const mahasiswa = mhsU.mahasiswa!;

  // 2 MK + 2 Kelas — agar bisa test KRS
  const mk1 = await prisma.mataKuliah.create({
    data: { kode: 'TST-101', nama: 'Test MK 1', sks: 3, sksTeori: 3, jenis: JenisMK.wajib_prodi, prodiId: prodi.id },
  });
  const mk2 = await prisma.mataKuliah.create({
    data: { kode: 'TST-102', nama: 'Test MK 2', sks: 3, sksTeori: 3, jenis: JenisMK.wajib_prodi, prodiId: prodi.id },
  });

  const kelas1 = await prisma.kelas.create({
    data: {
      mataKuliahId: mk1.id, semesterId: semester.id, dosenId: dosen.id,
      ruanganId: ruangan.id, kodeKelas: 'A', kapasitas: 40,
      hari: Hari.senin, jamMulai: '08:00', jamSelesai: '09:40',
    },
  });
  const kelas2 = await prisma.kelas.create({
    data: {
      mataKuliahId: mk2.id, semesterId: semester.id, dosenId: dosen.id,
      ruanganId: ruangan.id, kodeKelas: 'A', kapasitas: 40,
      hari: Hari.selasa, jamMulai: '10:00', jamSelesai: '11:40',
    },
  });

  return {
    prodi, semester, ruangan,
    akademikUser: akademikU, dosenUser: dosenU, mahasiswaUser: mhsU,
    dosen, mahasiswa, mk1, mk2, kelas1, kelas2,
    password: DEFAULT_PASSWORD,
  };
}

export type Fixtures = Awaited<ReturnType<typeof createFixtures>>;

/** Helper login → return access token. */
export async function loginAs(
  request: ReturnType<typeof import('supertest').default>,
  identifier: string,
  password = DEFAULT_PASSWORD,
): Promise<string> {
  const res = await request.post('/auth/login').send({ identifier, password });
  if (res.status !== 200) {
    throw new Error(`login gagal (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken as string;
}

/** Tambahkan KRS draft secara langsung di DB. */
export async function seedKrsDraft(mahasiswaId: string, kelasIds: string[], semesterId: string) {
  await prisma.krs.createMany({
    data: kelasIds.map((kelasId) => ({
      mahasiswaId, kelasId, semesterId, status: StatusKrs.draft,
    })),
  });
}
