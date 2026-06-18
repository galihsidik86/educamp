// ============================================================
// Notifikasi helper — fire-and-forget create for side effects.
// ============================================================

import { prisma } from '../db.js';
import { sendMail, mailTemplate } from './mailer.js';

export type NotifInput = {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
  entity?: string;
  entityId?: string;
  /** Kalau true, juga kirim email ke user. Default false (notif penting saja). */
  sendEmail?: boolean;
};

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

/** Tulis 1 notifikasi. Tidak melempar — gagal di-log saja. */
export async function createNotifikasi(input: NotifInput) {
  try {
    await prisma.notifikasi.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type,
        link: input.link,
        entity: input.entity,
        entityId: input.entityId,
      },
    });
    if (input.sendEmail) {
      const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
      if (user?.email) {
        const ctaUrl = input.link ? `${FRONTEND_URL}${input.link}` : undefined;
        void sendMail({
          to: user.email,
          subject: input.title,
          html: mailTemplate(input.title, `<p>${input.body ?? ''}</p>`, ctaUrl, ctaUrl ? 'Buka SIAKAD' : undefined),
        });
      }
    }
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
