import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { getActiveSemester, getMahasiswaForUser } from '../../lib/context.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { optionalHttpUrl } from '../../lib/validators.js';
import { writeAudit } from '../../lib/audit.js';
import { calculateIp } from '../../lib/grade.js';

export const beasiswaRouter = Router();

async function getIpkData(mahasiswaId: string) {
  const nilai = await prisma.nilai.findMany({
    where: { mahasiswaId, status: 'finalized' },
    include: { krs: { include: { kelas: { include: { mataKuliah: true } } } } },
  });
  const items = nilai.map((n) => ({
    sks: n.krs.kelas.mataKuliah.sks,
    bobot: n.bobot,
  }));
  const { ip, totalSks } = calculateIp(items);
  return { ipk: ip, sksLulus: totalSks };
}

/** List beasiswa yang buka pendaftaran + cek syarat mahasiswa. */
beasiswaRouter.get('/beasiswa/tersedia', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const { ipk } = await getIpkData(m.id);
  const now = new Date();

  const items = await prisma.beasiswa.findMany({
    where: {
      pendaftaranBuka: true,
      OR: [
        { tanggalBuka: null, tanggalTutup: null },
        { tanggalBuka: { lte: now }, tanggalTutup: { gte: now } },
      ],
    },
    include: { _count: { select: { pendaftaran: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // status pendaftaran mahasiswa terhadap beasiswa-beasiswa ini
  const myPendaftaran = await prisma.pendaftaranBeasiswa.findMany({
    where: { mahasiswaId: m.id, beasiswaId: { in: items.map((b) => b.id) } },
    select: { beasiswaId: true, status: true },
  });
  const myMap = new Map(myPendaftaran.map((p) => [p.beasiswaId, p.status]));

  res.json({
    ipk,
    items: items.map((b) => {
      const memenuhiIpk = b.syaratIpk == null || ipk >= b.syaratIpk;
      const memenuhiAngkatanMin = b.syaratAngkatanMin == null || m.angkatan >= b.syaratAngkatanMin;
      const memenuhiAngkatanMax = b.syaratAngkatanMax == null || m.angkatan <= b.syaratAngkatanMax;
      const memenuhiKuota = b.kuota == null || b._count.pendaftaran < b.kuota;
      const myStatus = myMap.get(b.id) ?? null;
      return {
        id: b.id,
        kode: b.kode,
        nama: b.nama,
        penyelenggara: b.penyelenggara,
        deskripsi: b.deskripsi,
        nominal: Number(b.nominal),
        kuota: b.kuota,
        kuotaTerisi: b._count.pendaftaran,
        syaratIpk: b.syaratIpk,
        syaratAngkatanMin: b.syaratAngkatanMin,
        syaratAngkatanMax: b.syaratAngkatanMax,
        tanggalBuka: b.tanggalBuka,
        tanggalTutup: b.tanggalTutup,
        memenuhiSyarat: memenuhiIpk && memenuhiAngkatanMin && memenuhiAngkatanMax && memenuhiKuota,
        statusPendaftaran: myStatus,
      };
    }),
  });
});

beasiswaRouter.get('/beasiswa', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const rows = await prisma.pendaftaranBeasiswa.findMany({
    where: { mahasiswaId: m.id },
    include: { beasiswa: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      catatan: r.catatan,
      motivasi: r.motivasi,
      linkDokumen: r.linkDokumen,
      ipkSaatDaftar: r.ipkSaatDaftar,
      semesterSaatDaftar: r.semesterSaatDaftar,
      createdAt: r.createdAt,
      beasiswa: {
        id: r.beasiswa.id,
        kode: r.beasiswa.kode,
        nama: r.beasiswa.nama,
        penyelenggara: r.beasiswa.penyelenggara,
        nominal: Number(r.beasiswa.nominal),
      },
    })),
  });
});

const daftarSchema = z.object({
  beasiswaId: z.string().uuid(),
  motivasi: z.string().min(50).max(5000),
  linkDokumen: optionalHttpUrl, // http/https saja — anti stored-XSS
});

beasiswaRouter.post('/beasiswa/daftar', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const body = daftarSchema.parse(req.body);

  const beasiswa = await prisma.beasiswa.findUnique({
    where: { id: body.beasiswaId },
    include: { _count: { select: { pendaftaran: true } } },
  });
  if (!beasiswa) throw NotFound('Beasiswa tidak ditemukan');
  if (!beasiswa.pendaftaranBuka) throw BadRequest('Pendaftaran beasiswa ini sudah ditutup');
  const now = new Date();
  if (beasiswa.tanggalBuka && now < beasiswa.tanggalBuka) throw BadRequest('Pendaftaran belum dibuka');
  if (beasiswa.tanggalTutup && now > beasiswa.tanggalTutup) throw BadRequest('Pendaftaran sudah ditutup');

  const sudah = await prisma.pendaftaranBeasiswa.findFirst({
    where: { mahasiswaId: m.id, beasiswaId: beasiswa.id },
  });
  if (sudah) throw BadRequest('Anda sudah terdaftar di beasiswa ini');

  const { ipk } = await getIpkData(m.id);
  if (beasiswa.syaratIpk != null && ipk < beasiswa.syaratIpk) {
    throw BadRequest(`IPK kurang dari syarat minimum ${beasiswa.syaratIpk.toFixed(2)} (saat ini ${ipk.toFixed(2)})`);
  }
  if (beasiswa.syaratAngkatanMin != null && m.angkatan < beasiswa.syaratAngkatanMin) {
    throw BadRequest(`Hanya angkatan ${beasiswa.syaratAngkatanMin} ke atas`);
  }
  if (beasiswa.syaratAngkatanMax != null && m.angkatan > beasiswa.syaratAngkatanMax) {
    throw BadRequest(`Hanya angkatan ${beasiswa.syaratAngkatanMax} ke bawah`);
  }
  if (beasiswa.kuota != null && beasiswa._count.pendaftaran >= beasiswa.kuota) {
    throw BadRequest('Kuota pendaftar sudah penuh');
  }

  const semester = await getActiveSemester();
  const created = await prisma.pendaftaranBeasiswa.create({
    data: {
      beasiswaId: beasiswa.id,
      mahasiswaId: m.id,
      motivasi: body.motivasi,
      linkDokumen: body.linkDokumen ?? null,
      ipkSaatDaftar: ipk,
      semesterSaatDaftar: semester.kode,
    },
  });
  void writeAudit(req, {
    action: 'beasiswa.daftar',
    entity: 'pendaftaran-beasiswa',
    entityId: created.id,
    metadata: { beasiswaKode: beasiswa.kode, ipk },
  });
  res.status(201).json(created);
});

beasiswaRouter.delete('/beasiswa/:id', async (req, res) => {
  const m = await getMahasiswaForUser(req.user!.sub);
  const item = await prisma.pendaftaranBeasiswa.findUnique({ where: { id: req.params.id } });
  if (!item || item.mahasiswaId !== m.id) throw NotFound('Pendaftaran tidak ditemukan');
  if (item.status !== 'diajukan') {
    throw Forbidden('Hanya pengajuan yang masih dalam proses awal yang dapat dibatalkan');
  }
  await prisma.pendaftaranBeasiswa.update({ where: { id: item.id }, data: { status: 'batal' } });
  res.status(204).end();
});
