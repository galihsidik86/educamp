import { Router } from 'express';
import { prisma } from '../../db.js';

export const spmiDashboardRouter = Router();

/**
 * Dashboard SPMI — ringkasan PPEPP (Penetapan / Pelaksanaan / Evaluasi /
 * Pengendalian / Peningkatan) sesuai Permenristekdikti 39/2025.
 */
spmiDashboardRouter.get('/spmi/dashboard', async (_req, res) => {
  const now = new Date();

  // Penetapan: jumlah standar aktif per kategori
  const standarPerKategori = await prisma.standarMutu.groupBy({
    by: ['kategori'],
    where: { isAktif: true },
    _count: { _all: true },
  });
  const totalStandar = await prisma.standarMutu.count({ where: { isAktif: true } });

  // Evaluasi: pencapaian terkini (pengukuran terbaru per standar)
  const standarList = await prisma.standarMutu.findMany({
    where: { isAktif: true },
    include: { pengukuran: { orderBy: { periode: 'desc' }, take: 1 } },
  });
  const capaian = { tercapai: 0, cukup: 0, belum_tercapai: 0, belum_diukur: 0 };
  for (const s of standarList) {
    const last = s.pengukuran[0];
    if (!last) capaian.belum_diukur++;
    else capaian[last.status]++;
  }

  // AMI: status & jumlah temuan per kategori
  const amiStats = await prisma.auditMutuInternal.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const temuanPerKategori = await prisma.temuanAmi.groupBy({
    by: ['kategori'],
    _count: { _all: true },
  });
  // SPME reporting (Permenristekdikti 39/2025 — audit dilaporkan ke BAN-PT/LAM)
  const amiTotal = await prisma.auditMutuInternal.count();
  const amiDilaporkanSpme = await prisma.auditMutuInternal.count({ where: { dilaporkanKeSpme: true } });

  // Pengendalian: CAPA status + overdue
  const capaStats = await prisma.tindakLanjutCapa.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const capaOverdue = await prisma.tindakLanjutCapa.count({
    where: { targetSelesai: { lt: now }, status: { in: ['rencana', 'pelaksanaan'] } },
  });

  // Peningkatan: RTM status + keputusan open
  const rtmStats = await prisma.rapatTinjauanManajemen.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const keputusanOpen = await prisma.keputusanRtm.count({
    where: { status: { in: ['open', 'in_progress'] } },
  });

  // Survei kepuasan: total response per kategori dari survei publish
  const surveiAktif = await prisma.kuesionerKepuasan.count({ where: { status: 'publish' } });
  const totalResponse = await prisma.responseKepuasan.count();

  res.json({
    penetapan: {
      totalStandar,
      perKategori: standarPerKategori.map((g) => ({ kategori: g.kategori, jumlah: g._count._all })),
    },
    evaluasi: {
      capaian,
      persenTercapai: totalStandar > 0 ? Math.round((capaian.tercapai / totalStandar) * 100) : 0,
    },
    ami: {
      perStatus: amiStats.map((g) => ({ status: g.status, jumlah: g._count._all })),
      temuanPerKategori: temuanPerKategori.map((g) => ({ kategori: g.kategori, jumlah: g._count._all })),
      total: amiTotal,
      dilaporkanKeSpme: amiDilaporkanSpme,
    },
    pengendalian: {
      capaPerStatus: capaStats.map((g) => ({ status: g.status, jumlah: g._count._all })),
      overdue: capaOverdue,
    },
    peningkatan: {
      rtmPerStatus: rtmStats.map((g) => ({ status: g.status, jumlah: g._count._all })),
      keputusanOpen,
    },
    survei: {
      surveiAktif,
      totalResponse,
    },
  });
});
