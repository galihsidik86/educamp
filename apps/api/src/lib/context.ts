import { prisma } from '../db.js';
import { Forbidden, NotFound } from './errors.js';

/** Pastikan user adalah akademik & return record Akademik-nya. */
export async function getAkademikForUser(userId: string) {
  const a = await prisma.akademik.findUnique({ where: { userId } });
  if (!a) throw Forbidden('Akun ini bukan akademik');
  return a;
}

/**
 * Scope prodi yang membatasi akses user — null jika tidak dibatasi.
 * Dipakai akademik 'prodi' yang hanya boleh akses 1 prodi.
 * super_admin / akademik / keuangan / spmi tidak dibatasi (return null).
 */
export async function getProdiScope(userId: string): Promise<string | null> {
  const a = await prisma.akademik.findUnique({
    where: { userId },
    select: { subRole: true, prodiId: true },
  });
  if (!a) return null;
  if (a.subRole === 'prodi' && a.prodiId) return a.prodiId;
  return null;
}

/** Pastikan user adalah dosen & return record Dosen-nya. */
export async function getDosenForUser(userId: string) {
  const d = await prisma.dosen.findUnique({
    where: { userId },
    include: { prodi: { include: { fakultas: true } } },
  });
  if (!d) throw Forbidden('Akun ini bukan dosen');
  return d;
}

/** Pastikan user adalah mahasiswa & return record Mahasiswa-nya (+ relasi minimal). */
export async function getMahasiswaForUser(userId: string) {
  const m = await prisma.mahasiswa.findUnique({
    where: { userId },
    include: { prodi: { include: { fakultas: true } } },
  });
  if (!m) throw Forbidden('Akun ini bukan mahasiswa');
  return m;
}

/**
 * Cek otorisasi dosen atas kelas via team teaching.
 * Return peran ('lead' | 'anggota' | 'asisten') jika dosen anggota team,
 * atau `null` jika bukan. Mendukung legacy `Kelas.dosenId` (dianggap 'lead').
 */
export async function getKelasOwnership(dosenId: string, kelasId: string) {
  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    select: { dosenId: true, team: { where: { dosenId }, select: { peran: true } } },
  });
  if (!kelas) return null;
  if (kelas.team.length > 0) return kelas.team[0]!.peran;
  // Legacy fallback: kelas tanpa KelasDosen entry (data lama)
  if (kelas.dosenId === dosenId) return 'lead' as const;
  return null;
}

/** Throw Forbidden bila dosen tidak punya akses; return peran bila punya. */
export async function requireKelasOwnership(dosenId: string, kelasId: string) {
  const peran = await getKelasOwnership(dosenId, kelasId);
  if (!peran) throw Forbidden('Kelas ini bukan milik Anda');
  return peran;
}

/** Semester aktif untuk periode KRS / nilai. Jika tidak ada, error. */
export async function getActiveSemester() {
  const s = await prisma.semester.findFirst({
    where: { isAktif: true },
    include: { tahunAjaran: true },
  });
  if (!s) throw NotFound('Tidak ada semester aktif');
  return s;
}
