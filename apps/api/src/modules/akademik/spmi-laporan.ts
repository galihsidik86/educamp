import { Router } from 'express';
import { prisma } from '../../db.js';
import { BadRequest } from '../../lib/errors.js';

export const spmiLaporanRouter = Router();

/**
 * Laporan pencapaian standar mutu per periode tertentu.
 * Mengembalikan seluruh standar aktif + pengukuran pada periode tsb.
 * Standar tanpa pengukuran tetap dimasukkan dengan status 'belum_diukur'.
 */
spmiLaporanRouter.get('/spmi/laporan/standar', async (req, res) => {
  const periode = (req.query.periode as string | undefined)?.trim();
  if (!periode) throw BadRequest('Parameter periode wajib');
  const kategori = req.query.kategori as string | undefined;
  const prodiId = req.query.prodiId as string | undefined;

  const standar = await prisma.standarMutu.findMany({
    where: {
      isAktif: true,
      ...(kategori && { kategori: kategori as any }),
      ...(prodiId === 'null' ? { prodiId: null } : prodiId ? { prodiId } : {}),
    },
    include: {
      prodi: { select: { kode: true, nama: true } },
      pengukuran: { where: { periode } },
    },
    orderBy: [{ kategori: 'asc' }, { kode: 'asc' }],
  });

  const ringkasan = { tercapai: 0, cukup: 0, belum_tercapai: 0, belum_diukur: 0 };
  for (const s of standar) {
    const p = s.pengukuran[0];
    if (!p) ringkasan.belum_diukur++;
    else ringkasan[p.status]++;
  }

  res.json({
    periode,
    institusi: 'STMIK Tazkia',
    totalStandar: standar.length,
    ringkasan,
    persenTercapai: standar.length > 0 ? Math.round((ringkasan.tercapai / standar.length) * 100) : 0,
    items: standar.map((s) => ({
      id: s.id,
      kode: s.kode,
      nama: s.nama,
      kategori: s.kategori,
      deskripsi: s.deskripsi,
      satuan: s.satuan,
      targetMin: s.targetMin,
      targetMax: s.targetMax,
      ambangCukup: s.ambangCukup,
      sumberData: s.sumberData,
      prodi: s.prodi,
      pengukuran: s.pengukuran[0] ?? null,
    })),
  });
});

/**
 * Laporan komprehensif PPEPP per periode.
 * Konsolidasi: penetapan standar + evaluasi pencapaian + AMI/temuan +
 * CAPA + RTM keputusan + survei kepuasan.
 */
spmiLaporanRouter.get('/spmi/laporan/ppepp', async (req, res) => {
  const periode = (req.query.periode as string | undefined)?.trim();
  if (!periode) throw BadRequest('Parameter periode wajib');

  // Penetapan + Evaluasi
  const standar = await prisma.standarMutu.findMany({
    where: { isAktif: true },
    include: {
      pengukuran: { where: { periode }, take: 1 },
      prodi: { select: { kode: true, nama: true } },
    },
    orderBy: [{ kategori: 'asc' }, { kode: 'asc' }],
  });

  // AMI pada periode
  const amiList = await prisma.auditMutuInternal.findMany({
    where: { periode },
    include: {
      auditor: { include: { dosen: { select: { nidn: true, nama: true } } } },
      lingkup: { include: { prodi: { select: { kode: true, nama: true } } } },
      temuan: {
        include: {
          standar: { select: { kode: true, nama: true } },
          capa: true,
        },
      },
    },
    orderBy: { tanggalMulai: 'asc' },
  });

  // CAPA semua yang aktif (rencana/pelaksanaan/verifikasi) + closed dari periode ini
  const capaAktif = await prisma.tindakLanjutCapa.findMany({
    where: { status: { in: ['rencana', 'pelaksanaan', 'verifikasi'] } },
    include: {
      temuan: { include: { ami: { select: { kode: true, nama: true, periode: true } } } },
      picDosen: { select: { nidn: true, nama: true } },
    },
    orderBy: { targetSelesai: 'asc' },
  });

  // RTM pada periode (cari berdasarkan judul/notulen) — heuristik: gunakan rentang tanggal
  // Atau ambil semua RTM tahun yang sama dengan periode
  const rtmList = await prisma.rapatTinjauanManajemen.findMany({
    include: {
      keputusan: {
        include: {
          picUser: { select: { email: true, akademik: { select: { nama: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { tanggal: 'desc' },
    take: 10,
  });

  // Survei aktif & jumlah response
  const surveiList = await prisma.kuesionerKepuasan.findMany({
    where: { status: { in: ['publish', 'ditutup'] } },
    include: { _count: { select: { response: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Ringkasan capaian
  const capaian = { tercapai: 0, cukup: 0, belum_tercapai: 0, belum_diukur: 0 };
  for (const s of standar) {
    const p = s.pengukuran[0];
    if (!p) capaian.belum_diukur++;
    else capaian[p.status]++;
  }

  res.json({
    periode,
    institusi: 'STMIK Tazkia',
    generatedAt: new Date().toISOString(),
    penetapan: {
      totalStandar: standar.length,
      standar: standar.map((s) => ({
        id: s.id, kode: s.kode, nama: s.nama, kategori: s.kategori,
        targetMin: s.targetMin, targetMax: s.targetMax, satuan: s.satuan,
        prodi: s.prodi,
        pengukuran: s.pengukuran[0] ?? null,
      })),
    },
    evaluasi: {
      capaian,
      persenTercapai: standar.length > 0 ? Math.round((capaian.tercapai / standar.length) * 100) : 0,
    },
    ami: amiList.map((a) => ({
      id: a.id, kode: a.kode, nama: a.nama, periode: a.periode,
      tanggalMulai: a.tanggalMulai, tanggalSelesai: a.tanggalSelesai, status: a.status,
      jumlahAuditor: a.auditor.length,
      jumlahLingkup: a.lingkup.length,
      temuan: a.temuan.map((t) => ({
        kode: t.kode, kategori: t.kategori, deskripsi: t.deskripsi,
        standar: t.standar,
        capaStatus: t.capa?.status ?? null,
      })),
      ringkasanTemuan: {
        ktsm: a.temuan.filter((t) => t.kategori === 'ktsm').length,
        kts: a.temuan.filter((t) => t.kategori === 'kts').length,
        observasi: a.temuan.filter((t) => t.kategori === 'observasi').length,
        saran: a.temuan.filter((t) => t.kategori === 'saran').length,
      },
    })),
    pengendalian: {
      capaAktif: capaAktif.map((c) => ({
        id: c.id,
        status: c.status,
        rencanaTindakan: c.rencanaTindakan,
        targetSelesai: c.targetSelesai,
        isOverdue: new Date(c.targetSelesai) < new Date(),
        temuanKode: c.temuan.kode,
        amiKode: c.temuan.ami.kode,
        pic: c.picDosen ? `${c.picDosen.nidn} — ${c.picDosen.nama}` : null,
      })),
      jumlahOverdue: capaAktif.filter((c) => new Date(c.targetSelesai) < new Date()).length,
    },
    peningkatan: {
      rtm: rtmList.map((r) => ({
        id: r.id, kode: r.kode, judul: r.judul, tanggal: r.tanggal, status: r.status,
        jumlahKeputusan: r.keputusan.length,
        keputusanOpen: r.keputusan.filter((k) => k.status === 'open' || k.status === 'in_progress').length,
        keputusan: r.keputusan.map((k) => ({
          deskripsi: k.deskripsi,
          status: k.status,
          targetSelesai: k.targetSelesai,
          pic: k.picUser?.akademik?.nama ?? k.picUser?.email ?? k.picCatatan ?? null,
        })),
      })),
    },
    survei: {
      total: surveiList.length,
      items: surveiList.map((s) => ({
        id: s.id, kode: s.kode, judul: s.judul, kategori: s.kategori,
        status: s.status, periode: s.periode,
        jumlahResponse: s._count.response,
      })),
    },
  });
});
