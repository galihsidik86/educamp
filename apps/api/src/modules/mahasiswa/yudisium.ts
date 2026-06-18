import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { calculateIp } from '../../lib/grade.js';

export const yudisiumRouter = Router();

/** Hitung IPK + SKS lulus dari nilai finalized. */
async function getIpkData(mahasiswaId: string) {
  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId, status: 'finalized' },
    include: { krs: { include: { kelas: { include: { mataKuliah: true } } } } },
  });
  const items = nilai.map((n) => ({
    sks: n.krs.kelas.mataKuliah.sks,
    bobot: n.bobot,
    huruf: n.nilaiHuruf,
  }));
  const { ip, totalSks } = calculateIp(items);
  const adaE = items.some((i) => i.huruf === 'E');
  return { ipk: ip, sksLulus: totalSks, adaE };
}

function predikatDariIpk(ipk: number): 'cumlaude' | 'sangat_memuaskan' | 'memuaskan' | 'tidak_lulus' {
  if (ipk >= 3.51) return 'cumlaude';
  if (ipk >= 2.76) return 'sangat_memuaskan';
  if (ipk >= 2.00) return 'memuaskan';
  return 'tidak_lulus';
}

/**
 * Kelayakan yudisium mahasiswa: IPK, SKS lulus, status skripsi, ada nilai E,
 * predikat (preview), list periode wisuda yang buka pendaftaran.
 */
yudisiumRouter.get('/yudisium/kelayakan', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const { ipk, sksLulus, adaE } = await getIpkData(m.id);
  const skripsi = await prisma.skripsi.findFirst({
    where: { mahasiswaId: m.id, status: 'lulus' },
  });
  const periodeBuka = await prisma.periodeWisuda.findMany({
    where: { isPendaftaranBuka: true },
    orderBy: { tanggal: 'asc' },
  });
  const lulusSkripsi = !!skripsi;

  // Cek apakah sudah pernah daftar di salah satu periode buka (cegah duplikat list)
  const pendaftaran = await prisma.yudisium.findMany({
    where: { mahasiswaId: m.id, periodeWisudaId: { in: periodeBuka.map((p) => p.id) } },
    select: { periodeWisudaId: true, status: true },
  });
  const sudahDaftarSet = new Set(pendaftaran.map((p) => p.periodeWisudaId));

  res.json({
    ipk,
    sksLulus,
    adaE,
    lulusSkripsi,
    predikat: predikatDariIpk(ipk),
    layak: ipk >= 2.0 && !adaE && lulusSkripsi,
    periodeTersedia: periodeBuka.map((p) => ({
      id: p.id,
      kode: p.kode,
      nama: p.nama,
      tanggal: p.tanggal,
      batasIpk: p.batasIpk,
      batasSks: p.batasSks,
      memenuhiSyarat: ipk >= (p.batasIpk ?? 2.0) && sksLulus >= (p.batasSks ?? 0) && !adaE && lulusSkripsi,
      sudahDaftar: sudahDaftarSet.has(p.id),
    })),
  });
});

yudisiumRouter.get('/yudisium', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.yudisium.findMany({
    where: { mahasiswaId: m.id },
    include: { periodeWisuda: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: rows.map((y) => ({
      id: y.id,
      status: y.status,
      ipk: y.ipk,
      sksLulus: y.sksLulus,
      predikat: y.predikat,
      catatan: y.catatan,
      noIjazah: y.noIjazah,
      noSkl: y.noSkl,
      tanggalLulus: y.tanggalLulus,
      verifikasiToken: y.verifikasiToken,
      periode: {
        id: y.periodeWisuda.id,
        kode: y.periodeWisuda.kode,
        nama: y.periodeWisuda.nama,
        tanggal: y.periodeWisuda.tanggal,
      },
    })),
  });
});

const daftarSchema = z.object({ periodeWisudaId: z.string().uuid() });

yudisiumRouter.post('/yudisium/daftar', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = daftarSchema.parse(req.body);

  const periode = await prisma.periodeWisuda.findUnique({ where: { id: body.periodeWisudaId } });
  if (!periode) throw NotFound('Periode wisuda tidak ditemukan');
  if (!periode.isPendaftaranBuka) throw BadRequest('Pendaftaran periode ini sudah ditutup');

  const sudah = await prisma.yudisium.findFirst({
    where: { mahasiswaId: m.id, periodeWisudaId: periode.id },
  });
  if (sudah) throw BadRequest('Anda sudah terdaftar di periode wisuda ini');

  const { ipk, sksLulus, adaE } = await getIpkData(m.id);
  const skripsi = await prisma.skripsi.findFirst({ where: { mahasiswaId: m.id, status: 'lulus' } });

  if (!skripsi) throw BadRequest('Skripsi belum dinyatakan lulus');
  if (adaE) throw BadRequest('Masih ada nilai E di transkrip');
  const minIpk = periode.batasIpk ?? 2.0;
  if (ipk < minIpk) throw BadRequest(`IPK kurang dari syarat minimum ${minIpk.toFixed(2)} (saat ini ${ipk.toFixed(2)})`);
  if (periode.batasSks != null && sksLulus < periode.batasSks) {
    throw BadRequest(`SKS lulus kurang dari syarat minimum ${periode.batasSks} (saat ini ${sksLulus})`);
  }

  const created = await prisma.yudisium.create({
    data: {
      mahasiswaId: m.id,
      periodeWisudaId: periode.id,
      ipk,
      sksLulus,
      predikat: predikatDariIpk(ipk),
      status: 'pendaftaran',
    },
  });
  void writeAudit(req, {
    action: 'yudisium.daftar',
    entity: 'yudisium',
    entityId: created.id,
    metadata: { periodeKode: periode.kode, ipk, sksLulus },
  });
  res.status(201).json(created);
});

yudisiumRouter.delete('/yudisium/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.yudisium.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Pendaftaran yudisium tidak ditemukan');
  if (!['pendaftaran', 'verifikasi', 'tidak_layak'].includes(item.status)) {
    throw Forbidden('Pendaftaran yang sudah dinyatakan layak/diwisuda tidak dapat dibatalkan');
  }
  await prisma.yudisium.update({ where: { id: item.id }, data: { status: 'batal' } });
  res.status(204).end();
});
