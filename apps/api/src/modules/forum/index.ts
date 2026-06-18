import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const forumRouter = Router();

forumRouter.use(requireAuth);
forumRouter.use((req, res, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) return writeLimiter(req, res, next);
  next();
});

/** Cek akses user ke kelas. Return { kelas, role: 'mahasiswa'|'dosen', identitas }. */
async function getKelasAccess(userId: string, kelasId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { mahasiswa: true, dosen: true },
  });
  if (!u) throw Forbidden('User tidak ditemukan');
  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { mataKuliah: true },
  });
  if (!kelas) throw NotFound('Kelas tidak ditemukan');

  if (u.dosen) {
    const isOwner = kelas.dosenId === u.dosen.id;
    const inTeam = !isOwner
      ? await prisma.kelasDosen.findUnique({
          where: { kelasId_dosenId: { kelasId: kelas.id, dosenId: u.dosen.id } },
        })
      : null;
    if (isOwner || inTeam) {
      return { kelas, role: 'dosen' as const, dosenId: u.dosen.id, mahasiswaId: null };
    }
  }
  if (u.mahasiswa) {
    const peserta = await prisma.krs.findFirst({
      where: { mahasiswaId: u.mahasiswa.id, kelasId: kelas.id, status: 'disetujui' },
    });
    if (peserta) return { kelas, role: 'mahasiswa' as const, mahasiswaId: u.mahasiswa.id, dosenId: null };
  }
  throw Forbidden('Anda tidak memiliki akses ke forum kelas ini');
}

function fmtAuthor(t: {
  authorMahasiswa: { nim: string; nama: string } | null;
  authorDosen: { nidn: string; nama: string; gelarDepan: string | null; gelarBelakang: string | null } | null;
}) {
  if (t.authorDosen) {
    return {
      role: 'dosen' as const,
      identitas: t.authorDosen.nidn,
      nama: [t.authorDosen.gelarDepan, t.authorDosen.nama, t.authorDosen.gelarBelakang].filter(Boolean).join(' '),
    };
  }
  if (t.authorMahasiswa) {
    return {
      role: 'mahasiswa' as const,
      identitas: t.authorMahasiswa.nim,
      nama: t.authorMahasiswa.nama,
    };
  }
  return null;
}

/** List kelas yang dapat dibuka oleh user di forum (peserta KRS disetujui atau dosen pengampu). */
forumRouter.get('/kelas', async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { mahasiswa: true, dosen: true },
  });
  if (!u) throw Forbidden();

  if (u.dosen) {
    const kelas = await prisma.kelas.findMany({
      where: {
        OR: [{ dosenId: u.dosen.id }, { team: { some: { dosenId: u.dosen.id } } }],
      },
      include: {
        mataKuliah: true,
        semester: true,
        _count: { select: { forumThread: true } },
      },
      orderBy: { semester: { kode: 'desc' } },
    });
    return res.json({
      items: kelas.map((k) => ({
        kelasId: k.id,
        kodeMK: k.mataKuliah.kode,
        namaMK: k.mataKuliah.nama,
        kodeKelas: k.kodeKelas,
        semester: k.semester.kode,
        totalThread: k._count.forumThread,
      })),
    });
  }
  if (u.mahasiswa) {
    const krs = await prisma.krs.findMany({
      where: { mahasiswaId: u.mahasiswa.id, status: 'disetujui' },
      include: {
        kelas: {
          include: {
            mataKuliah: true,
            semester: true,
            dosen: { select: { nama: true } },
            _count: { select: { forumThread: true } },
          },
        },
      },
      orderBy: { kelas: { semester: { kode: 'desc' } } },
    });
    return res.json({
      items: krs.map((k) => ({
        kelasId: k.kelas.id,
        kodeMK: k.kelas.mataKuliah.kode,
        namaMK: k.kelas.mataKuliah.nama,
        kodeKelas: k.kelas.kodeKelas,
        semester: k.kelas.semester.kode,
        dosen: k.kelas.dosen.nama,
        totalThread: k.kelas._count.forumThread,
      })),
    });
  }
  throw Forbidden('Hanya mahasiswa atau dosen yang dapat mengakses forum');
});

/** List thread per kelas. */
forumRouter.get('/kelas/:kelasId', async (req, res) => {
  const access = await getKelasAccess(req.user!.sub, req.params.kelasId);
  const threads = await prisma.forumThread.findMany({
    where: { kelasId: access.kelas.id },
    include: {
      authorMahasiswa: { select: { nim: true, nama: true } },
      authorDosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({
    kelas: {
      id: access.kelas.id, kodeMK: access.kelas.mataKuliah.kode,
      namaMK: access.kelas.mataKuliah.nama, kodeKelas: access.kelas.kodeKelas,
    },
    role: access.role,
    items: threads.map((t) => ({
      id: t.id,
      judul: t.judul,
      isPinned: t.isPinned,
      isLocked: t.isLocked,
      totalReply: t._count.replies,
      createdAt: t.createdAt,
      author: fmtAuthor(t),
    })),
  });
});

/** Detail thread + replies. */
forumRouter.get('/thread/:id', async (req, res) => {
  const thread = await prisma.forumThread.findUnique({
    where: { id: req.params.id },
    include: {
      authorMahasiswa: { select: { nim: true, nama: true } },
      authorDosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
      replies: {
        include: {
          authorMahasiswa: { select: { nim: true, nama: true } },
          authorDosen: { select: { nidn: true, nama: true, gelarDepan: true, gelarBelakang: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!thread) throw NotFound('Thread tidak ditemukan');
  const access = await getKelasAccess(req.user!.sub, thread.kelasId);

  res.json({
    role: access.role,
    canModerate: access.role === 'dosen',
    thread: {
      id: thread.id,
      judul: thread.judul,
      isi: thread.isi,
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
      createdAt: thread.createdAt,
      author: fmtAuthor(thread),
      authorMahasiswaId: thread.authorMahasiswaId,
      authorDosenId: thread.authorDosenId,
    },
    replies: thread.replies.map((r) => ({
      id: r.id,
      isi: r.isi,
      createdAt: r.createdAt,
      author: fmtAuthor(r),
      authorMahasiswaId: r.authorMahasiswaId,
      authorDosenId: r.authorDosenId,
    })),
  });
});

const threadSchema = z.object({
  judul: z.string().min(3).max(200),
  isi: z.string().min(3).max(10000),
});

/** Buat thread baru. */
forumRouter.post('/kelas/:kelasId', async (req, res) => {
  const access = await getKelasAccess(req.user!.sub, req.params.kelasId);
  const body = threadSchema.parse(req.body);
  const created = await prisma.forumThread.create({
    data: {
      kelasId: access.kelas.id,
      judul: body.judul,
      isi: body.isi,
      authorMahasiswaId: access.mahasiswaId,
      authorDosenId: access.dosenId,
    },
  });
  void writeAudit(req, { action: 'forum.thread.create', entity: 'forum-thread', entityId: created.id, metadata: { kelasId: access.kelas.id, judul: body.judul } });
  res.status(201).json(created);
});

const replySchema = z.object({ isi: z.string().min(1).max(5000) });

/** Reply ke thread. */
forumRouter.post('/thread/:id/reply', async (req, res) => {
  const t = await prisma.forumThread.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Thread tidak ditemukan');
  if (t.isLocked) throw BadRequest('Thread terkunci oleh dosen — tidak menerima reply baru');

  const access = await getKelasAccess(req.user!.sub, t.kelasId);
  const body = replySchema.parse(req.body);
  const created = await prisma.forumReply.create({
    data: {
      threadId: t.id,
      isi: body.isi,
      authorMahasiswaId: access.mahasiswaId,
      authorDosenId: access.dosenId,
    },
  });
  res.status(201).json(created);
});

const moderateSchema = z.object({
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

/** Pin/lock — hanya dosen pengampu kelas. */
forumRouter.patch('/thread/:id', async (req, res) => {
  const t = await prisma.forumThread.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Thread tidak ditemukan');
  const access = await getKelasAccess(req.user!.sub, t.kelasId);
  if (access.role !== 'dosen') throw Forbidden('Hanya dosen pengampu yang dapat memoderasi thread');
  const body = moderateSchema.parse(req.body);
  const updated = await prisma.forumThread.update({ where: { id: t.id }, data: body });
  res.json(updated);
});

/** Delete thread — author atau dosen pengampu. */
forumRouter.delete('/thread/:id', async (req, res) => {
  const t = await prisma.forumThread.findUnique({ where: { id: req.params.id } });
  if (!t) throw NotFound('Thread tidak ditemukan');
  const access = await getKelasAccess(req.user!.sub, t.kelasId);
  const isOwner = (t.authorMahasiswaId && t.authorMahasiswaId === access.mahasiswaId)
    || (t.authorDosenId && t.authorDosenId === access.dosenId);
  if (!isOwner && access.role !== 'dosen') {
    throw Forbidden('Hanya pemilik atau dosen pengampu yang dapat menghapus thread');
  }
  await prisma.forumThread.delete({ where: { id: t.id } });
  res.status(204).end();
});

/** Delete reply — author atau dosen pengampu. */
forumRouter.delete('/reply/:id', async (req, res) => {
  const r = await prisma.forumReply.findUnique({ where: { id: req.params.id }, include: { thread: true } });
  if (!r) throw NotFound('Reply tidak ditemukan');
  const access = await getKelasAccess(req.user!.sub, r.thread.kelasId);
  const isOwner = (r.authorMahasiswaId && r.authorMahasiswaId === access.mahasiswaId)
    || (r.authorDosenId && r.authorDosenId === access.dosenId);
  if (!isOwner && access.role !== 'dosen') {
    throw Forbidden('Hanya pemilik atau dosen pengampu yang dapat menghapus reply');
  }
  await prisma.forumReply.delete({ where: { id: r.id } });
  res.status(204).end();
});
