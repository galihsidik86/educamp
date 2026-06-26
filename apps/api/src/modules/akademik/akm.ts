// ============================================================
// AKM — Aktivitas Kuliah Mahasiswa per semester.
// Endpoint: list, generate per semester (auto-compute IPS/IPK/SKS),
// edit manual, delete. Enqueue ke feeder pada setiap create/update.
// ============================================================
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { BadRequest, NotFound, Forbidden } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { enqueueFeederChange, buildFeederPayload } from '../../lib/feeder/queue.js';
import { getProdiScope } from '../../lib/context.js';
import { calculateIp } from '../../lib/grade.js';

export const akmRouter = Router();

// GET /akm?semesterId=&prodiId=&status=&q=
akmRouter.get('/akm', async (req, res) => {
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? (req.query.prodiId as string | undefined);
  const semesterId = req.query.semesterId as string | undefined;
  const status = req.query.status as string | undefined;
  const q = (req.query.q as string | undefined)?.trim();

  const items = await prisma.aktivitasKuliahMahasiswa.findMany({
    where: {
      ...(semesterId && { semesterId }),
      ...(status && { status: status as any }),
      mahasiswa: {
        is: {
          ...(prodiId && { prodiId }),
          ...(q && { OR: [{ nim: { contains: q } }, { nama: { contains: q } }] }),
        },
      },
    },
    include: {
      mahasiswa: {
        select: {
          id: true, nim: true, nama: true, status: true,
          prodi: { select: { id: true, kode: true, nama: true } },
        },
      },
      semester: { select: { kode: true, jenis: true, tahunAjaran: { select: { kode: true } } } },
    },
    orderBy: [{ semester: { kode: 'desc' } }, { mahasiswa: { nim: 'asc' } }],
    take: 500,
  });
  res.json({ items });
});

const upsertSchema = z.object({
  mahasiswaId: z.string().uuid(),
  semesterId: z.string().uuid(),
  status: z.enum(['aktif', 'cuti', 'non_aktif', 'kampus_merdeka', 'mengundurkan_diri', 'lulus', 'drop_out']),
  ips: z.number().nullable().optional(),
  ipk: z.number().nullable().optional(),
  sksSemester: z.number().int().nullable().optional(),
  sksTotal: z.number().int().nullable().optional(),
  biayaKuliah: z.number().nullable().optional(),
});

// POST /akm — create satuan (rare; biasanya pakai generate)
akmRouter.post('/akm', async (req, res) => {
  const body = upsertSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId) {
    const m = await prisma.mahasiswa.findUnique({ where: { id: body.mahasiswaId }, select: { prodiId: true } });
    if (!m || m.prodiId !== scopeId) throw Forbidden('Mahasiswa di luar scope prodi Anda');
  }
  const dup = await prisma.aktivitasKuliahMahasiswa.findUnique({
    where: { mahasiswaId_semesterId: { mahasiswaId: body.mahasiswaId, semesterId: body.semesterId } },
    select: { id: true },
  });
  if (dup) throw BadRequest('AKM sudah ada untuk mahasiswa+semester ini — gunakan PATCH');

  const created = await prisma.aktivitasKuliahMahasiswa.create({ data: body });
  await enqueueAkmPayload(created.id, 'create');
  void writeAudit(req, { action: 'akm.create', entity: 'akm' as any, entityId: created.id, metadata: { mahasiswaId: body.mahasiswaId, semesterId: body.semesterId } });
  res.status(201).json(created);
});

akmRouter.patch('/akm/:id', async (req, res) => {
  const body = upsertSchema.partial().parse(req.body);
  const akm = await prisma.aktivitasKuliahMahasiswa.findUnique({
    where: { id: req.params.id },
    include: { mahasiswa: { select: { prodiId: true } } },
  });
  if (!akm) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && akm.mahasiswa.prodiId !== scopeId) throw Forbidden('AKM mahasiswa di luar scope Anda');

  const updated = await prisma.aktivitasKuliahMahasiswa.update({
    where: { id: req.params.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.ips !== undefined && { ips: body.ips }),
      ...(body.ipk !== undefined && { ipk: body.ipk }),
      ...(body.sksSemester !== undefined && { sksSemester: body.sksSemester }),
      ...(body.sksTotal !== undefined && { sksTotal: body.sksTotal }),
      ...(body.biayaKuliah !== undefined && { biayaKuliah: body.biayaKuliah }),
    },
  });
  await enqueueAkmPayload(updated.id, 'update');
  void writeAudit(req, { action: 'akm.update', entity: 'akm' as any, entityId: updated.id });
  res.json(updated);
});

akmRouter.delete('/akm/:id', async (req, res) => {
  const akm = await prisma.aktivitasKuliahMahasiswa.findUnique({
    where: { id: req.params.id },
    include: { mahasiswa: { select: { prodiId: true } } },
  });
  if (!akm) throw NotFound();
  const scopeId = await getProdiScope(req.user!.sub);
  if (scopeId && akm.mahasiswa.prodiId !== scopeId) throw Forbidden();
  if (akm.feederId) {
    await enqueueAkmPayload(akm.id, 'delete');
  }
  await prisma.aktivitasKuliahMahasiswa.delete({ where: { id: req.params.id } });
  void writeAudit(req, { action: 'akm.delete', entity: 'akm' as any, entityId: req.params.id });
  res.json({ ok: true });
});

// ============================================================
// POST /akm/generate
// Auto-generate AKM untuk semua mahasiswa yang punya KRS di semester
// terpilih. Compute IPS dari Nilai semester ini, IPK dari kumulatif,
// SKS semester dari Krs disetujui, SKS total dari Nilai lulus.
// Idempotent: pakai upsert.
// ============================================================
const generateSchema = z.object({
  semesterId: z.string().uuid(),
  prodiId: z.string().uuid().optional(),
});

akmRouter.post('/akm/generate', async (req, res) => {
  const body = generateSchema.parse(req.body);
  const scopeId = await getProdiScope(req.user!.sub);
  const prodiId = scopeId ?? body.prodiId;

  const semester = await prisma.semester.findUnique({ where: { id: body.semesterId } });
  if (!semester) throw NotFound('Semester tidak ditemukan');

  // Ambil semua mahasiswa yang punya KRS di semester ini (atau heregistrasi cuti)
  const mahasiswaIds = await prisma.mahasiswa.findMany({
    where: {
      ...(prodiId && { prodiId }),
      OR: [
        { krs: { some: { semesterId: body.semesterId } } },
        { heregistrasi: { some: { semesterId: body.semesterId } } },
      ],
    },
    select: { id: true, status: true },
  });

  const skala = await prisma.konfigurasiSkalaNilai.findFirst();
  let created = 0;
  let updated = 0;

  for (const m of mahasiswaIds) {
    // Krs+Nilai semester ini
    const krsSemester = await prisma.krs.findMany({
      where: { mahasiswaId: m.id, semesterId: body.semesterId, status: { in: ['disetujui'] } as any },
      include: { nilai: true, kelas: { include: { mataKuliah: { select: { sks: true } } } } },
    });
    const sksSemester = krsSemester.reduce((sum, k) => sum + (k.kelas.mataKuliah.sks ?? 0), 0);
    const ipsList = krsSemester
      .filter((k) => k.nilai?.bobot != null)
      .map((k) => ({ bobot: k.nilai!.bobot!, sks: k.kelas.mataKuliah.sks ?? 0 }));
    const ipsTotalSks = ipsList.reduce((s, x) => s + x.sks, 0);
    const ipsTotalBobot = ipsList.reduce((s, x) => s + x.bobot * x.sks, 0);
    const ips = ipsTotalSks > 0 ? ipsTotalBobot / ipsTotalSks : null;

    // Kumulatif (lihat semua nilai sampai semester ini)
    const allNilai = await prisma.nilai.findMany({
      where: {
        mahasiswaId: m.id,
        krs: { semester: { kode: { lte: semester.kode } } },
        bobot: { not: null },
      },
      include: { krs: { include: { kelas: { include: { mataKuliah: { select: { sks: true } } } } } } },
    });
    const kumList = allNilai.map((n) => ({ bobot: n.bobot!, sks: n.krs.kelas.mataKuliah.sks ?? 0 }));
    const ipkTotalSks = kumList.reduce((s, x) => s + x.sks, 0);
    const ipkTotalBobot = kumList.reduce((s, x) => s + x.bobot * x.sks, 0);
    const ipk = ipkTotalSks > 0 ? ipkTotalBobot / ipkTotalSks : null;
    const sksTotal = allNilai
      .filter((n) => (n.bobot ?? 0) >= (skala?.bobotD ?? 1.0))
      .reduce((s, n) => s + (n.krs.kelas.mataKuliah.sks ?? 0), 0);

    // Determine status: cek heregistrasi cuti di semester ini, default = aktif
    const her = await prisma.heregistrasi.findUnique({
      where: { mahasiswaId_semesterId: { mahasiswaId: m.id, semesterId: body.semesterId } },
    });
    let status: 'aktif' | 'cuti' | 'non_aktif' | 'lulus' | 'drop_out' | 'mengundurkan_diri' = 'aktif';
    if (her?.jenis === 'cuti' && her.status === 'disetujui') status = 'cuti';
    if (m.status === 'lulus') status = 'lulus';
    if (m.status === 'drop_out') status = 'drop_out';
    if (m.status === 'mengundurkan_diri') status = 'mengundurkan_diri';

    const data = {
      status,
      ips: ips != null ? Number(ips.toFixed(2)) : null,
      ipk: ipk != null ? Number(ipk.toFixed(2)) : null,
      sksSemester,
      sksTotal,
    };

    const dup = await prisma.aktivitasKuliahMahasiswa.findUnique({
      where: { mahasiswaId_semesterId: { mahasiswaId: m.id, semesterId: body.semesterId } },
    });
    if (dup) {
      await prisma.aktivitasKuliahMahasiswa.update({ where: { id: dup.id }, data });
      await enqueueAkmPayload(dup.id, 'update');
      updated++;
    } else {
      const c = await prisma.aktivitasKuliahMahasiswa.create({
        data: { mahasiswaId: m.id, semesterId: body.semesterId, ...data },
      });
      await enqueueAkmPayload(c.id, 'create');
      created++;
    }
  }

  void writeAudit(req, {
    action: 'akm.generate',
    entity: 'akm' as any,
    metadata: { semesterId: body.semesterId, prodiId, processed: mahasiswaIds.length, created, updated },
  });

  res.json({ semester: semester.kode, processed: mahasiswaIds.length, created, updated });
});

async function enqueueAkmPayload(akmId: string, op: 'create' | 'update' | 'delete') {
  const payload = await buildFeederPayload('akm' as any, akmId);
  if (!payload) return;
  await enqueueFeederChange({ entity: 'akm' as any, entityId: akmId, operation: op, payload });
}
