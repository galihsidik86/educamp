// ============================================================
// Notifikasi helper — fire-and-forget create for side effects.
// ============================================================

import { prisma } from '../db.js';

export type NotifInput = {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
  entity?: string;
  entityId?: string;
};

/** Tulis 1 notifikasi. Tidak melempar — gagal di-log saja. */
export async function createNotifikasi(input: NotifInput) {
  try {
    await prisma.notifikasi.create({ data: input });
  } catch (e) {
    console.error('[notifikasi] gagal:', e);
  }
}

/** Buat banyak sekaligus (mis. broadcast pengumuman). */
export async function createNotifikasiForMany(userIds: string[], base: Omit<NotifInput, 'userId'>) {
  if (userIds.length === 0) return;
  try {
    await prisma.notifikasi.createMany({
      data: userIds.map((userId) => ({ ...base, userId })),
    });
  } catch (e) {
    console.error('[notifikasi] bulk gagal:', e);
  }
}

/** Resolve userId dari mahasiswaId untuk handler yang lebih natural. */
export async function userIdFromMahasiswa(mahasiswaId: string): Promise<string | null> {
  const m = await prisma.mahasiswa.findUnique({ where: { id: mahasiswaId }, select: { userId: true } });
  return m?.userId ?? null;
}

/** Resolve userId dari dosenId. */
export async function userIdFromDosen(dosenId: string): Promise<string | null> {
  const d = await prisma.dosen.findUnique({ where: { id: dosenId }, select: { userId: true } });
  return d?.userId ?? null;
}
