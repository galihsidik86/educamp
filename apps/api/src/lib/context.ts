import { prisma } from '../db.js';
import { Forbidden, NotFound } from './errors.js';

/** Pastikan user adalah akademik & return record Akademik-nya. */
export async function getAkademikForUser(userId: string) {
  const a = await prisma.akademik.findUnique({ where: { userId } });
  if (!a) throw Forbidden('Akun ini bukan akademik');
  return a;
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

/** Semester aktif untuk periode KRS / nilai. Jika tidak ada, error. */
export async function getActiveSemester() {
  const s = await prisma.semester.findFirst({
    where: { isAktif: true },
    include: { tahunAjaran: true },
  });
  if (!s) throw NotFound('Tidak ada semester aktif');
  return s;
}
