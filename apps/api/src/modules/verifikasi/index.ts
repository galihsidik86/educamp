// ============================================================
// Verifikasi Ijazah — endpoint PUBLIK (tanpa auth).
// Dipakai industri / PT lain untuk cek keaslian ijazah lulusan
// via QR code yang tertera di ijazah / SKL.
//
// Mount: app.use('/verifikasi', verifikasiRouter)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { rateLimitVerifikasi } from '../../middleware/rateLimit.js';

export const verifikasiRouter = Router();

// Token format: 16 chars base64url (huruf+angka+_-)
const TOKEN_REGEX = /^[A-Za-z0-9_-]{12,32}$/;

verifikasiRouter.get('/:token', rateLimitVerifikasi, async (req, res) => {
  const token = req.params.token ?? '';
  if (!TOKEN_REGEX.test(token)) throw NotFound('Token verifikasi tidak valid');

  const y = await prisma.yudisium.findUnique({
    where: { verifikasiToken: token },
    include: {
      mahasiswa: {
        select: {
          nim: true,
          nama: true,
          tempatLahir: true,
          tanggalLahir: true,
          jenisKelamin: true,
          angkatan: true,
          prodi: {
            select: {
              kode: true,
              nama: true,
              jenjang: true,
              fakultas: { select: { kode: true, nama: true } },
            },
          },
        },
      },
      periodeWisuda: { select: { kode: true, nama: true, tanggal: true } },
    },
  });

  // Hanya valid jika sudah status wisuda
  if (!y || y.status !== 'wisuda') {
    throw NotFound('Data lulusan tidak ditemukan');
  }

  // Tampilkan data publik saja — TIDAK expose: alamat, email, telepon,
  // catatan internal, atau detail nilai per-MK.
  const cfg = await prisma.institusiConfig.findFirst({ select: { nama: true } });

  res.json({
    valid: true,
    institusi: {
      nama: cfg?.nama ?? 'STMIK Tazkia',
      fakultas: y.mahasiswa.prodi.fakultas.nama,
    },
    lulusan: {
      nim: y.mahasiswa.nim,
      nama: y.mahasiswa.nama,
      tempatLahir: y.mahasiswa.tempatLahir,
      // Endpoint publik + token tercetak sebagai QR yang bisa difoto siapa pun →
      // tanggal lahir lengkap tersamar jadi TAHUN saja untuk kurangi risiko
      // pencurian identitas, tanpa menghilangkan kegunaan verifikasi.
      tahunLahir: y.mahasiswa.tanggalLahir ? new Date(y.mahasiswa.tanggalLahir).getFullYear() : null,
      jenisKelamin: y.mahasiswa.jenisKelamin,
      tahunMasuk: y.mahasiswa.angkatan,
    },
    pendidikan: {
      prodi: y.mahasiswa.prodi.nama,
      kodeProdi: y.mahasiswa.prodi.kode,
      jenjang: y.mahasiswa.prodi.jenjang,
      ipk: y.ipk,
      sksLulus: y.sksLulus,
      predikat: y.predikat,
    },
    ijazah: {
      noIjazah: y.noIjazah,
      noSkl: y.noSkl,
      tanggalLulus: y.tanggalLulus,
      periodeWisuda: y.periodeWisuda.nama,
    },
    verifiedAt: new Date().toISOString(),
  });
});

/**
 * Endpoint verifikasi sertifikat digital (KKN/MBKM/dll) — PUBLIK.
 * URL terpisah dari ijazah untuk clarity: /verifikasi/sertifikat/:token
 */
verifikasiRouter.get('/sertifikat/:token', rateLimitVerifikasi, async (req, res) => {
  const token = req.params.token ?? '';
  if (!TOKEN_REGEX.test(token)) throw NotFound('Token tidak valid');

  const s = await prisma.sertifikatDigital.findUnique({
    where: { verifikasiToken: token },
    include: {
      mahasiswa: {
        select: {
          nim: true, nama: true,
          prodi: { select: { nama: true, fakultas: { select: { nama: true } } } },
        },
      },
    },
  });
  if (!s) throw NotFound('Sertifikat tidak ditemukan');
  if (s.status !== 'terbit') throw NotFound('Sertifikat sudah tidak berlaku');

  const cfg = await prisma.institusiConfig.findFirst({ select: { nama: true } });

  res.json({
    valid: true,
    institusi: {
      nama: cfg?.nama ?? 'STMIK Tazkia',
      fakultas: s.mahasiswa.prodi.fakultas.nama,
    },
    sertifikat: {
      nomorSertifikat: s.nomorSertifikat,
      jenis: s.jenis,
      judul: s.judul,
      deskripsi: s.deskripsi,
      periode: s.periode,
      tanggalTerbit: s.tanggalTerbit,
    },
    penerima: {
      nim: s.mahasiswa.nim,
      nama: s.mahasiswa.nama,
      prodi: s.mahasiswa.prodi.nama,
    },
    verifiedAt: new Date().toISOString(),
  });
});

/**
 * Survei kepuasan PUBLIK — token-based anonymous response.
 * GET  /verifikasi/survei/:token  → ambil kuesioner + pertanyaan
 * POST /verifikasi/survei/:token  → submit jawaban (anonymous)
 */
verifikasiRouter.get('/survei/:token', rateLimitVerifikasi, async (req, res) => {
  const token = req.params.token ?? '';
  if (!TOKEN_REGEX.test(token)) throw NotFound('Survei tidak ditemukan');

  const s = await prisma.kuesionerKepuasan.findUnique({
    where: { tokenPublic: token },
    include: {
      pertanyaan: {
        orderBy: { urutan: 'asc' },
        select: { id: true, urutan: true, pertanyaan: true, jenis: true, wajib: true, opsi: true },
      },
    },
  });
  if (!s) throw NotFound('Survei tidak ditemukan');
  if (s.status !== 'publish') throw NotFound('Survei belum aktif atau sudah ditutup');
  const now = new Date();
  if (s.mulai && now < s.mulai) throw NotFound('Survei belum dimulai');
  if (s.selesai && now > s.selesai) throw NotFound('Survei sudah ditutup');

  res.json({
    id: s.id,
    kode: s.kode,
    judul: s.judul,
    deskripsi: s.deskripsi,
    kategori: s.kategori,
    periode: s.periode,
    target: s.target,
    pertanyaan: s.pertanyaan,
  });
});

const submitSchema = z.object({
  rolePelapor: z.string().max(30).optional().nullable(),
  identitasOpsional: z.string().max(500).optional().nullable(),
  jawaban: z.array(z.object({
    pertanyaanId: z.string().uuid(),
    nilai: z.number().int().min(1).max(5).optional().nullable(),
    pilihan: z.string().max(500).optional().nullable(),
    teks: z.string().max(5000).optional().nullable(),
  })).min(1),
});

verifikasiRouter.post('/survei/:token', rateLimitVerifikasi, async (req, res) => {
  const token = req.params.token ?? '';
  if (!TOKEN_REGEX.test(token)) throw NotFound('Survei tidak ditemukan');

  const s = await prisma.kuesionerKepuasan.findUnique({
    where: { tokenPublic: token },
    include: { pertanyaan: true },
  });
  if (!s) throw NotFound('Survei tidak ditemukan');
  if (s.status !== 'publish') throw BadRequest('Survei belum aktif');
  const now = new Date();
  if (s.mulai && now < s.mulai) throw BadRequest('Survei belum dimulai');
  if (s.selesai && now > s.selesai) throw BadRequest('Survei sudah ditutup');

  const body = submitSchema.parse(req.body);
  const pertanyaanMap = new Map(s.pertanyaan.map((p) => [p.id, p]));

  // Validasi: pertanyaan wajib harus dijawab + format jawaban sesuai jenis
  for (const p of s.pertanyaan) {
    const ans = body.jawaban.find((j) => j.pertanyaanId === p.id);
    const isEmpty = !ans || (ans.nilai == null && !ans.pilihan && !ans.teks);
    if (p.wajib && isEmpty) throw BadRequest(`Pertanyaan "${p.pertanyaan.slice(0, 40)}…" wajib diisi`);
  }
  for (const j of body.jawaban) {
    const p = pertanyaanMap.get(j.pertanyaanId);
    if (!p) throw BadRequest('Pertanyaan tidak valid');
    if (p.jenis === 'likert' && (j.nilai == null || j.nilai < 1 || j.nilai > 5)) {
      if (p.wajib) throw BadRequest('Jawaban likert harus skala 1-5');
    }
    if (p.jenis === 'pilihan' && p.wajib && !j.pilihan) {
      throw BadRequest('Pilihan wajib dipilih');
    }
  }

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || null;
  const ua = (req.headers['user-agent'] as string | undefined)?.slice(0, 500) || null;

  const created = await prisma.responseKepuasan.create({
    data: {
      kuesionerId: s.id,
      rolePelapor: body.rolePelapor ?? null,
      identitasOpsional: body.identitasOpsional ?? null,
      ip,
      userAgent: ua,
      jawaban: {
        create: body.jawaban
          .filter((j) => pertanyaanMap.has(j.pertanyaanId))
          .map((j) => ({
            pertanyaanId: j.pertanyaanId,
            nilai: j.nilai ?? null,
            pilihan: j.pilihan ?? null,
            teks: j.teks ?? null,
          })),
      },
    },
  });

  res.status(201).json({ ok: true, responseId: created.id });
});
