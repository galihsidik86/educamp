// ============================================================
// Helper sertifikat digital — auto-issue saat KKN/MBKM selesai
// dan utility shared (generate token + nomor sertifikat).
// ============================================================

import crypto from 'node:crypto';
import { prisma } from '../db.js';
import type { JenisSertifikatDigital } from '@prisma/client';
import { createNotifikasi, userIdFromMahasiswa } from './notifikasi.js';

/** Generate verifikasi token 16-char base64url. */
export function generateSertifikatToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Generate nomor sertifikat unik per jenis per tahun.
 * Format: "SRT/<JENIS>/<TAHUN>/<NNNN>" — incremental dari count tahun berjalan.
 */
export async function generateNomorSertifikat(jenis: JenisSertifikatDigital): Promise<string> {
  const tahun = new Date().getFullYear();
  const prefix = `SRT/${jenis.toUpperCase()}/${tahun}/`;
  const count = await prisma.sertifikatDigital.count({
    where: { nomorSertifikat: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

/** Issue 1 sertifikat. Fire-and-forget notif ke mahasiswa. */
export async function issueSertifikat(input: {
  mahasiswaId: string;
  jenis: JenisSertifikatDigital;
  judul: string;
  deskripsi?: string | null;
  periode?: string | null;
  sumberEntity?: string | null;
  sumberId?: string | null;
  ttdNama?: string | null;
  ttdJabatan?: string | null;
}) {
  // Cek apakah sudah ada sertifikat untuk sumber yang sama (idempotency)
  if (input.sumberEntity && input.sumberId) {
    const existing = await prisma.sertifikatDigital.findFirst({
      where: { sumberEntity: input.sumberEntity, sumberId: input.sumberId, status: 'terbit' },
    });
    if (existing) return existing;
  }

  const nomor = await generateNomorSertifikat(input.jenis);
  const token = generateSertifikatToken();

  const created = await prisma.sertifikatDigital.create({
    data: {
      mahasiswaId: input.mahasiswaId,
      jenis: input.jenis,
      judul: input.judul,
      deskripsi: input.deskripsi ?? null,
      periode: input.periode ?? null,
      sumberEntity: input.sumberEntity ?? null,
      sumberId: input.sumberId ?? null,
      ttdNama: input.ttdNama ?? 'Kepala Bagian Akademik',
      ttdJabatan: input.ttdJabatan ?? null,
      nomorSertifikat: nomor,
      verifikasiToken: token,
    },
  });

  // Notif ke mahasiswa
  void (async () => {
    const userId = await userIdFromMahasiswa(input.mahasiswaId);
    if (!userId) return;
    await createNotifikasi({
      userId,
      title: `Sertifikat ${input.jenis.toUpperCase()} telah terbit`,
      body: `${input.judul} · No. ${nomor}`,
      type: 'sertifikat',
      link: '/mahasiswa/sertifikat',
      entity: 'sertifikat-digital',
      entityId: created.id,
    });
  })();

  return created;
}
