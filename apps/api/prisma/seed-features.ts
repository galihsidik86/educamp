// ============================================================
// Seed extension — fitur lanjutan + SPMI lengkap
// Dipanggil dari seed.ts setelah base data ter-seed.
// Idempotent: pakai findFirst+create / upsert pada record kunci.
// ============================================================

import {
  PrismaClient, JenisEventKalender, JenisMbkm, StatusMbkm,
  StatusSkripsi, StatusYudisium, PredikatYudisium,
  StatusKonsultasi, KategoriTiket, StatusTiket, PrioritasTiket,
  JenisSertifikasi, LevelKegiatan, StatusVerifikasi, JenisPrestasi,
  JenisMutasi, StatusMutasi, AksiDokumen, KategoriBkd, StatusBkd,
  HubunganWali, AspekCpl, StatusCpmk,
  JenisSertifikatDigital,
  KategoriStandar, SumberDataStandar, StatusPencapaian,
  StatusAmi, KategoriTemuan, StatusCapa,
  StatusRtm, StatusKeputusanRtm,
  KategoriSurvei, StatusSurvei, JenisPertanyaanKepuasan,
  StatusAbsensi, StatusKrs,
} from '@prisma/client';

import crypto from 'node:crypto';

const surveiToken = () => crypto.randomBytes(12).toString('base64url');
const sertifikatToken = () => crypto.randomBytes(12).toString('base64url');

export async function seedFeatures(prisma: PrismaClient) {
  // Resolve referensi yang sudah ada dari base seed
  const aisyah = await prisma.mahasiswa.findUnique({ where: { nim: '2021110001' } });
  const rizky = await prisma.mahasiswa.findUnique({ where: { nim: '2021110002' } });
  const farah = await prisma.mahasiswa.findUnique({ where: { nim: '2021110003' } });
  const dosen1 = await prisma.dosen.findUnique({ where: { nidn: '0401018501' } });
  const dosen2 = await prisma.dosen.findUnique({ where: { nidn: '0405039002' } });
  const akademik = await prisma.user.findUnique({ where: { email: 'akademik@tazkia.ac.id' } });
  const semGanjil = await prisma.semester.findUnique({ where: { kode: '20251' } });
  const semGenapPrev = await prisma.semester.findUnique({ where: { kode: '20242' } });
  const prodiTI = await prisma.prodi.findUnique({ where: { kode: '55201' } });
  const prodiSI = await prisma.prodi.findUnique({ where: { kode: '57201' } });
  if (!aisyah || !rizky || !farah || !dosen1 || !dosen2 || !akademik || !semGanjil || !semGenapPrev || !prodiTI || !prodiSI) {
    console.warn('⚠ Seed features dilewati — base data belum lengkap.');
    return;
  }

  // ============================================================
  // IDENTITAS INSTITUSI (singleton) — sumber nama kampus untuk seluruh app
  // ============================================================
  console.log('▶ Seed: identitas institusi (singleton)');
  await prisma.institusiConfig.upsert({
    where: { id: 'singleton' },
    update: {
      rektorNama: 'Prof. Dr. H. Ahmad Mukhlis Yusuf, M.A.',
      rektorNip: '197005121995031002',
      rektorJabatan: 'Rektor',
      bagianAkademikNama: 'Bagian Akademik (BAAK)',
      kepalaBaakNama: 'Dr. Hj. Siti Maryam, S.Pd., M.M.',
      akreditasiSk: 'BAN-PT/Ak-PPJ/PT/I/2025',
    },
    create: {
      id: 'singleton',
      nama: 'Institut Agama Islam Tazkia',
      namaPendek: 'IAI Tazkia',
      tagline: 'Portal Akademik',
      akreditasiPT: 'Unggul',
      akreditasiSk: 'BAN-PT/Ak-PPJ/PT/I/2025',
      alamat: 'Jl. Ir. H. Juanda No. 78, Sentul City',
      kota: 'Bogor',
      kodePos: '16810',
      telepon: '(0251) 8245 555',
      email: 'info@tazkia.ac.id',
      website: 'https://tazkia.ac.id',
      rektorNama: 'Prof. Dr. H. Ahmad Mukhlis Yusuf, M.A.',
      rektorNip: '197005121995031002',
      rektorJabatan: 'Rektor',
      bagianAkademikNama: 'Bagian Akademik (BAAK)',
      kepalaBaakNama: 'Dr. Hj. Siti Maryam, S.Pd., M.M.',
      kopSurat: 'Jl. Ir. H. Juanda No. 78, Sentul City, Bogor 16810\nTelp. (0251) 8245 555 · Web: tazkia.ac.id',
    },
  });

  // ============================================================
  // TARIF UKT & UANG PANGKAL — set tarif default per prodi + kategori UKT bertingkat
  // ============================================================
  console.log('▶ Seed: tarif UKT/uang pangkal per prodi + kategori UKT');
  const allProdi = await prisma.prodi.findMany();
  for (const p of allProdi) {
    await prisma.prodi.update({
      where: { id: p.id },
      data: {
        tarifSppDefault: 4500000,   // fallback default
        tarifUangPangkal: 5000000,  // sekali bayar saat registrasi
      },
    });
    const tiers = [
      { kode: `UKT-1-${p.kode}`, nama: 'UKT-1 (Ekonomi Bawah)', nominal: 2500000, desc: 'Penghasilan keluarga < Rp 3 jt/bln' },
      { kode: `UKT-2-${p.kode}`, nama: 'UKT-2 (Menengah)',       nominal: 4500000, desc: 'Penghasilan keluarga Rp 3-7 jt/bln' },
      { kode: `UKT-3-${p.kode}`, nama: 'UKT-3 (Menengah Atas)', nominal: 6000000, desc: 'Penghasilan keluarga > Rp 7 jt/bln' },
      { kode: `MANDIRI-${p.kode}`, nama: 'Jalur Mandiri',         nominal: 8500000, desc: 'Jalur masuk mandiri' },
    ];
    for (const t of tiers) {
      await prisma.kategoriUkt.upsert({
        where: { prodiId_kode: { prodiId: p.id, kode: t.kode } },
        update: { nama: t.nama, nominalSemester: t.nominal, deskripsi: t.desc },
        create: { prodiId: p.id, kode: t.kode, nama: t.nama, nominalSemester: t.nominal, deskripsi: t.desc, isAktif: true },
      });
    }
  }
  // Assign Aisyah → UKT-1 (penerima beasiswa, kelompok bawah), Rizky → UKT-2 dengan default cicilan 4×
  if (aisyah) {
    const aisyahProdi = await prisma.prodi.findUnique({ where: { id: aisyah.prodiId } });
    const aisyahUkt = aisyahProdi
      ? await prisma.kategoriUkt.findFirst({ where: { prodiId: aisyah.prodiId, kode: `UKT-1-${aisyahProdi.kode}` } })
      : null;
    if (aisyahUkt) {
      await prisma.mahasiswa.update({ where: { id: aisyah.id }, data: { kategoriUktId: aisyahUkt.id, defaultCicilanUkt: 1 } });
    }
  }
  if (rizky) {
    const rizkyProdi = await prisma.prodi.findUnique({ where: { id: rizky.prodiId } });
    const rizkyUkt = rizkyProdi
      ? await prisma.kategoriUkt.findFirst({ where: { prodiId: rizky.prodiId, kode: `UKT-2-${rizkyProdi.kode}` } })
      : null;
    if (rizkyUkt) {
      await prisma.mahasiswa.update({ where: { id: rizky.id }, data: { kategoriUktId: rizkyUkt.id, defaultCicilanUkt: 4 } });
    }
  }

  // ============================================================
  // KRS — set semua Aisyah ke disetujui, enroll Rizky juga (disetujui)
  // Supaya dosen view menampilkan peserta resmi
  // ============================================================
  console.log('▶ Seed: KRS Aisyah & Rizky → disetujui untuk semester aktif');
  const kelasSemAktif = await prisma.kelas.findMany({ where: { semesterId: semGanjil.id } });
  for (const k of kelasSemAktif) {
    // Aisyah — pastikan disetujui (override base seed yang set ke draft)
    await prisma.krs.upsert({
      where: { mahasiswaId_kelasId: { mahasiswaId: aisyah.id, kelasId: k.id } },
      update: { status: StatusKrs.disetujui },
      create: { mahasiswaId: aisyah.id, kelasId: k.id, semesterId: semGanjil.id, status: StatusKrs.disetujui },
    });
    // Rizky — enroll baru sebagai disetujui
    await prisma.krs.upsert({
      where: { mahasiswaId_kelasId: { mahasiswaId: rizky.id, kelasId: k.id } },
      update: { status: StatusKrs.disetujui },
      create: { mahasiswaId: rizky.id, kelasId: k.id, semesterId: semGanjil.id, status: StatusKrs.disetujui },
    });
  }

  // ============================================================
  // KALENDER AKADEMIK
  // ============================================================
  console.log('▶ Seed: kalender akademik');
  const kalender = [
    { judul: 'Awal Perkuliahan Semester Ganjil', jenis: JenisEventKalender.akademik, tanggalMulai: '2025-09-01', tanggalSelesai: null },
    { judul: 'UTS Semester Ganjil', jenis: JenisEventKalender.ujian, tanggalMulai: '2025-10-20', tanggalSelesai: '2025-10-31' },
    { judul: 'UAS Semester Ganjil', jenis: JenisEventKalender.ujian, tanggalMulai: '2026-01-05', tanggalSelesai: '2026-01-16' },
    { judul: 'Libur Maulid Nabi', jenis: JenisEventKalender.libur, tanggalMulai: '2025-09-15', tanggalSelesai: null },
    { judul: 'Wisuda Periode I 2026', jenis: JenisEventKalender.wisuda, tanggalMulai: '2026-03-15', tanggalSelesai: null },
  ];
  for (const e of kalender) {
    const exist = await prisma.kalenderAkademik.findFirst({ where: { judul: e.judul } });
    if (!exist) {
      await prisma.kalenderAkademik.create({
        data: {
          judul: e.judul, jenis: e.jenis,
          tanggalMulai: new Date(e.tanggalMulai),
          tanggalSelesai: e.tanggalSelesai ? new Date(e.tanggalSelesai) : null,
        },
      });
    }
  }

  // ============================================================
  // PERTEMUAN + ABSENSI + BAHAN AJAR + TUGAS + KUIS + FORUM
  // (untuk semester ganjil aktif)
  // ============================================================
  console.log('▶ Seed: pertemuan + topik mata kuliah');

  // Topik per mata kuliah (per kode MK) — 8 pertemuan @ kelas
  const TOPIK_MK: Record<string, string[]> = {
    'IF-3101': [ // Rekayasa Perangkat Lunak
      'Pengantar Rekayasa Perangkat Lunak & SDLC',
      'Requirements Engineering & User Stories',
      'Analisis Sistem dengan UML (Use Case, Class Diagram)',
      'Software Architecture & Design Patterns',
      'Agile, Scrum, dan Kanban',
      'Software Testing: Unit, Integration, E2E',
      'DevOps & CI/CD Pipeline',
      'Software Maintenance & Refactoring',
    ],
    'IF-3102': [ // Kecerdasan Buatan
      'Pengantar AI & Sejarah',
      'Search Algorithms: BFS, DFS, A*',
      'Knowledge Representation & Inference',
      'Machine Learning Basics: Supervised vs Unsupervised',
      'Neural Networks & Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'AI Ethics & Bias',
    ],
    'IF-3103': [ // Basis Data Lanjut
      'Review Relational Model & SQL',
      'Normalization (1NF–BCNF)',
      'Query Optimization & Indexing',
      'Transactions, ACID, Isolation Levels',
      'Stored Procedures, Triggers, Views',
      'NoSQL: Document, Key-Value, Graph',
      'Data Warehousing & OLAP',
      'Database Security & Backup Strategy',
    ],
    'IF-3104': [ // Pemrograman Web
      'HTML5 & Semantic Markup',
      'CSS3, Flexbox, Grid Layout',
      'JavaScript ES6+ & DOM',
      'Frontend Framework: React Fundamentals',
      'State Management & Hooks',
      'Backend: Node.js & Express REST API',
      'Database Integration & ORM',
      'Deployment & Performance Optimization',
    ],
  };

  const TODAY = new Date();
  const kelasAktif = await prisma.kelas.findMany({
    where: { semesterId: semGanjil.id },
    include: { mataKuliah: { select: { kode: true, nama: true } } },
  });

  for (const k of kelasAktif) {
    const topiks = TOPIK_MK[k.mataKuliah.kode] ?? Array.from({ length: 8 }, (_, i) => `Pertemuan ${i + 1}`);
    for (let i = 1; i <= topiks.length; i++) {
      // Schedule: weekly starting from awal semester (1 Sep 2025), pertemuan ke-i di minggu ke-i
      const tanggal = new Date('2025-09-01');
      tanggal.setDate(tanggal.getDate() + (i - 1) * 7);
      const exist = await prisma.pertemuan.findUnique({
        where: { kelasId_pertemuanKe: { kelasId: k.id, pertemuanKe: i } },
      });
      const pert = exist ?? await prisma.pertemuan.create({
        data: {
          kelasId: k.id, pertemuanKe: i, tanggal,
          topik: topiks[i - 1]!,
        },
      });
      if (exist && !exist.topik) {
        await prisma.pertemuan.update({ where: { id: exist.id }, data: { topik: topiks[i - 1]! } });
      }
      // Absensi: hanya untuk pertemuan yang sudah lewat (tanggal <= today)
      if (tanggal <= TODAY) {
        const krsList = await prisma.krs.findMany({ where: { kelasId: k.id } });
        for (const krs of krsList) {
          // Variasi status per pertemuan supaya rekap kehadiran terlihat variatif:
          // pertemuan 3 → izin, pertemuan 5 → sakit, pertemuan 7 → alpa (untuk 1 kelas), sisanya hadir
          let status = StatusAbsensi.hadir;
          if (i === 3) status = StatusAbsensi.izin;
          else if (i === 5) status = StatusAbsensi.sakit;
          else if (i === 7 && k.mataKuliah.kode === 'IF-3104') status = StatusAbsensi.alpa;
          await prisma.absensi.upsert({
            where: { pertemuanId_mahasiswaId: { pertemuanId: pert.id, mahasiswaId: krs.mahasiswaId } },
            update: { status },
            create: { pertemuanId: pert.id, mahasiswaId: krs.mahasiswaId, status },
          });
        }
      }
    }
  }

  console.log('▶ Seed: bahan ajar per pertemuan');
  for (const k of kelasAktif) {
    const pertemuans = await prisma.pertemuan.findMany({ where: { kelasId: k.id }, orderBy: { pertemuanKe: 'asc' } });
    for (const p of pertemuans.slice(0, 5)) { // 5 pertemuan pertama dapat materi
      const existSlides = await prisma.bahanAjar.findFirst({ where: { pertemuanId: p.id, judul: { startsWith: 'Slide' } } });
      if (!existSlides) {
        await prisma.bahanAjar.create({
          data: {
            kelasId: k.id, pertemuanId: p.id,
            jenis: 'link',
            judul: `Slide Materi: ${p.topik}`,
            deskripsi: `Slide presentasi untuk pertemuan ${p.pertemuanKe}.`,
            url: `https://drive.google.com/file/d/slide-${p.pertemuanKe}/view`,
            urutan: 1,
          },
        });
      }
      const existCatatan = await prisma.bahanAjar.findFirst({ where: { pertemuanId: p.id, jenis: 'text' } });
      if (!existCatatan && p.pertemuanKe <= 3) {
        await prisma.bahanAjar.create({
          data: {
            kelasId: k.id, pertemuanId: p.id,
            jenis: 'text',
            judul: `Catatan Kuliah: ${p.topik}`,
            konten: `Ringkasan materi pertemuan ${p.pertemuanKe}.\n\n` +
              `${p.topik} merupakan fondasi penting dalam ${k.mataKuliah.nama}. ` +
              `Mahasiswa diharapkan memahami konsep dasar serta menerapkannya dalam tugas praktek minggu ini.\n\n` +
              `Referensi:\n1. Buku utama bab ${p.pertemuanKe}\n2. Artikel pendukung di portal SIAKAD\n3. Video kuliah online`,
            urutan: 2,
          },
        });
      }
      const existVideo = await prisma.bahanAjar.findFirst({ where: { pertemuanId: p.id, jenis: 'video' } });
      if (!existVideo && p.pertemuanKe % 2 === 0) {
        await prisma.bahanAjar.create({
          data: {
            kelasId: k.id, pertemuanId: p.id,
            jenis: 'video',
            judul: `Rekaman Kuliah: ${p.topik}`,
            deskripsi: 'Rekaman penjelasan dosen di kelas.',
            url: `https://youtube.com/watch?v=demo-${p.pertemuanKe}`,
            urutan: 3,
          },
        });
      }
    }
  }

  console.log('▶ Seed: tugas + submit mahasiswa');
  for (const k of kelasAktif) {
    const pertemuanList = await prisma.pertemuan.findMany({ where: { kelasId: k.id }, orderBy: { pertemuanKe: 'asc' } });
    // Tugas 1: paper review (deadline lewat → submit dinilai)
    const t1Exist = await prisma.tugas.findFirst({ where: { kelasId: k.id, judul: { startsWith: 'Tugas 1' } } });
    if (!t1Exist && pertemuanList[2]) {
      const t1 = await prisma.tugas.create({
        data: {
          kelasId: k.id,
          pertemuanId: pertemuanList[2].id,
          judul: `Tugas 1: Review Paper ${k.mataKuliah.nama}`,
          deskripsi: 'Pilih satu paper jurnal terkait topik mata kuliah ini, buat ringkasan 2-3 halaman beserta kritik dan saran perbaikan.',
          deadline: new Date('2025-10-15'),
          maxNilai: 100,
        },
      });
      // Aisyah submit tugas 1
      const aisyahKrs = await prisma.krs.findFirst({ where: { mahasiswaId: aisyah.id, kelasId: k.id } });
      if (aisyahKrs) {
        await prisma.submitTugas.upsert({
          where: { tugasId_mahasiswaId: { tugasId: t1.id, mahasiswaId: aisyah.id } },
          update: {},
          create: {
            tugasId: t1.id, mahasiswaId: aisyah.id,
            linkJawaban: 'https://drive.google.com/file/d/tugas-aisyah-1/view',
            isiJawaban: 'Ringkasan dan kritik paper tertulis di tautan terlampir.',
            waktuSubmit: new Date('2025-10-13'),
            nilai: 88,
            status: 'dinilai',
            catatan: 'Analisis tajam, struktur rapi. Pertahankan kualitas.',
          },
        });
      }
    }

    // Tugas 2: project (deadline future)
    const t2Exist = await prisma.tugas.findFirst({ where: { kelasId: k.id, judul: { startsWith: 'Tugas 2' } } });
    if (!t2Exist && pertemuanList[5]) {
      const futureDeadline = new Date(TODAY);
      futureDeadline.setDate(futureDeadline.getDate() + 14);
      await prisma.tugas.create({
        data: {
          kelasId: k.id,
          pertemuanId: pertemuanList[5].id,
          judul: `Tugas 2: Project Akhir ${k.mataKuliah.nama}`,
          deskripsi: 'Buat project akhir berupa implementasi praktis materi mata kuliah. Boleh berkelompok 2-3 orang.',
          deadline: futureDeadline,
          maxNilai: 100,
          linkLampiran: 'https://drive.google.com/file/d/template-project/view',
        },
      });
    }
  }

  console.log('▶ Seed: kuis online + soal + attempt');
  for (const k of kelasAktif.slice(0, 2)) { // hanya 2 kelas pertama dapat kuis demo
    const kuisExist = await prisma.kuis.findFirst({ where: { kelasId: k.id } });
    if (!kuisExist) {
      const kuis = await prisma.kuis.create({
        data: {
          kelasId: k.id,
          judul: `Kuis Mid-Semester: ${k.mataKuliah.nama}`,
          deskripsi: 'Kuis singkat 5 soal pilihan ganda. Durasi 15 menit.',
          durasiMenit: 15,
          mulai: new Date('2025-10-20T08:00:00'),
          selesai: new Date('2025-10-25T23:59:00'),
          acak: true,
          isPublished: true,
        },
      });
      const soalData = [
        {
          pertanyaan: `Apa kepanjangan dari ${k.mataKuliah.kode}?`,
          opsi: [k.mataKuliah.nama, 'Salah satu jawaban lainnya', 'Tidak diketahui', 'Bukan semuanya'],
          jawaban: 0,
        },
        {
          pertanyaan: 'Berapa SKS mata kuliah ini?',
          opsi: ['2 SKS', '3 SKS', '4 SKS', '6 SKS'],
          jawaban: 1,
        },
        {
          pertanyaan: 'Hari kuliah ini berlangsung?',
          opsi: ['Senin', 'Selasa', 'Rabu', 'Kamis'],
          jawaban: k.hari === 'senin' ? 0 : k.hari === 'selasa' ? 1 : k.hari === 'rabu' ? 2 : 3,
        },
        {
          pertanyaan: 'Konsep pertama yang dipelajari di pertemuan 1 adalah?',
          opsi: ['Pengantar dan overview', 'Implementasi langsung', 'Studi kasus', 'Quiz pretest'],
          jawaban: 0,
        },
        {
          pertanyaan: 'Tipe tugas pertama di mata kuliah ini?',
          opsi: ['Project akhir', 'Review paper', 'Kuis harian', 'Presentasi'],
          jawaban: 1,
        },
      ];
      const createdSoal = [];
      for (let i = 0; i < soalData.length; i++) {
        const s = soalData[i]!;
        const created = await prisma.kuisSoal.create({
          data: { kuisId: kuis.id, urutan: i + 1, pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban, bobot: 1 },
        });
        createdSoal.push(created);
      }
      // Aisyah attempt kuis ini — jawab benar 4 dari 5
      const aisyahKrs = await prisma.krs.findFirst({ where: { mahasiswaId: aisyah.id, kelasId: k.id } });
      if (aisyahKrs) {
        const jawabanObj: Record<string, number> = {};
        for (let i = 0; i < createdSoal.length; i++) {
          // benar untuk semua kecuali soal ke-3 (sengaja salah)
          jawabanObj[createdSoal[i]!.id] = i === 2 ? (createdSoal[i]!.jawaban + 1) % 4 : createdSoal[i]!.jawaban;
        }
        const benar = Object.entries(jawabanObj).filter(([id, j]) => {
          const s = createdSoal.find((x) => x.id === id);
          return s && s.jawaban === j;
        }).length;
        await prisma.kuisAttempt.create({
          data: {
            kuisId: kuis.id, mahasiswaId: aisyah.id,
            mulaiPada: new Date('2025-10-22T09:00:00'),
            selesaiPada: new Date('2025-10-22T09:12:00'),
            status: 'submit',
            jawaban: jawabanObj,
            skor: benar,
            maxSkor: createdSoal.length,
            persen: (benar / createdSoal.length) * 100,
          },
        });
      }
    }
  }

  console.log('▶ Seed: forum diskusi per kelas');
  for (const k of kelasAktif) {
    const existThread = await prisma.forumThread.findFirst({ where: { kelasId: k.id } });
    if (existThread) continue;
    // Thread 1 — dosen mengumumkan
    const thread1 = await prisma.forumThread.create({
      data: {
        kelasId: k.id,
        authorDosenId: k.dosenId,
        judul: `Selamat datang di kelas ${k.mataKuliah.nama}`,
        isi: `Assalamualaikum mahasiswa-mahasiswi yang saya banggakan.\n\nSelamat datang di mata kuliah ${k.mataKuliah.nama} semester ini. Silakan baca silabus lewat menu Bahan Ajar. Jika ada pertanyaan, gunakan thread ini untuk diskusi.\n\nSemangat belajar!`,
        isPinned: true,
      },
    });
    await prisma.forumReply.create({
      data: { threadId: thread1.id, authorMahasiswaId: aisyah.id, isi: 'Terima kasih, Pak. Saya sudah baca silabusnya. Apakah ada referensi tambahan?' },
    });
    await prisma.forumReply.create({
      data: { threadId: thread1.id, authorDosenId: k.dosenId, isi: 'Referensi tambahan akan saya upload di bahan ajar pertemuan kedua, ya.' },
    });
    // Thread 2 — mahasiswa bertanya
    const thread2 = await prisma.forumThread.create({
      data: {
        kelasId: k.id,
        authorMahasiswaId: aisyah.id,
        judul: 'Pertanyaan tentang tugas review paper',
        isi: 'Pak, untuk tugas 1 (review paper), apakah boleh memilih paper berbahasa Inggris atau harus berbahasa Indonesia?',
      },
    });
    await prisma.forumReply.create({
      data: { threadId: thread2.id, authorDosenId: k.dosenId, isi: 'Bebas Indonesia atau Inggris. Yang penting paper jurnal terindeks (Scopus / Sinta minimal level 3).' },
    });
  }

  // ============================================================
  // EDOM — Kuesioner + Aspek + Response
  // ============================================================
  console.log('▶ Seed: EDOM kuesioner + aspek + response');
  let edomK = await prisma.edomKuesioner.findFirst({ where: { semesterId: semGanjil.id } });
  if (!edomK) {
    edomK = await prisma.edomKuesioner.create({
      data: {
        semesterId: semGanjil.id,
        judul: 'EDOM Semester Ganjil 2025/2026',
        isAktif: true,
      },
    });
  }
  const edomAspekData = [
    { pertanyaan: 'Dosen menyampaikan materi dengan jelas dan sistematis', urutan: 1 },
    { pertanyaan: 'Dosen hadir tepat waktu dan sesuai jadwal', urutan: 2 },
    { pertanyaan: 'Dosen memberikan tugas yang relevan dengan materi', urutan: 3 },
    { pertanyaan: 'Dosen terbuka terhadap pertanyaan & diskusi', urutan: 4 },
    { pertanyaan: 'Penilaian dosen objektif dan transparan', urutan: 5 },
  ];
  for (const a of edomAspekData) {
    await prisma.edomAspek.upsert({
      where: { kuesionerId_urutan: { kuesionerId: edomK.id, urutan: a.urutan } },
      update: {},
      create: { kuesionerId: edomK.id, pertanyaan: a.pertanyaan, urutan: a.urutan },
    });
  }
  // Sample response: Aisyah ke 1 kelas
  const sampleKelas = kelasAktif[0];
  const aspekList = await prisma.edomAspek.findMany({ where: { kuesionerId: edomK.id } });
  if (sampleKelas && aspekList.length > 0) {
    const existResp = await prisma.edomResponse.findUnique({
      where: { kuesionerId_mahasiswaId_kelasId: { kuesionerId: edomK.id, mahasiswaId: aisyah.id, kelasId: sampleKelas.id } },
    });
    if (!existResp) {
      await prisma.edomResponse.create({
        data: {
          kuesionerId: edomK.id,
          mahasiswaId: aisyah.id,
          kelasId: sampleKelas.id,
          jawaban: { create: aspekList.map((a, i) => ({ aspekId: a.id, nilai: 4 + (i % 2) })) },
        },
      });
    }
  }

  // ============================================================
  // MBKM
  // ============================================================
  console.log('▶ Seed: MBKM');
  let mbkm = await prisma.mbkm.findFirst({ where: { mahasiswaId: rizky.id, periode: '2025 Genap' } });
  if (!mbkm) {
    mbkm = await prisma.mbkm.create({
      data: {
        mahasiswaId: rizky.id,
        jenis: JenisMbkm.magang_industri,
        namaProgram: 'Magang Software Engineer di PT Tokopedia',
        mitra: 'PT Tokopedia',
        lokasi: 'Jakarta Selatan',
        periode: '2025 Genap',
        tanggalMulai: new Date('2025-08-01'),
        tanggalSelesai: new Date('2026-01-31'),
        dplDosenId: dosen1.id,
        status: StatusMbkm.berjalan,
        linkProposal: 'https://drive.example.com/proposal-mbkm-rizky.pdf',
      },
    });
  }

  // ============================================================
  // SKRIPSI
  // ============================================================
  console.log('▶ Seed: skripsi');
  const skripsiExist = await prisma.skripsi.findFirst({ where: { mahasiswaId: aisyah.id } });
  if (!skripsiExist) {
    await prisma.skripsi.create({
      data: {
        mahasiswaId: aisyah.id,
        judul: 'Implementasi Machine Learning untuk Deteksi Plagiarisme Hadits',
        topik: 'NLP / Machine Learning',
        pembimbing1Id: dosen1.id,
        pembimbing2Id: dosen2.id,
        status: StatusSkripsi.proposal,
        tanggalAjuan: new Date('2025-09-15'),
      },
    });
  }

  // ============================================================
  // PERIODE WISUDA + YUDISIUM
  // ============================================================
  console.log('▶ Seed: periode wisuda + yudisium');
  const pw = await prisma.periodeWisuda.upsert({
    where: { kode: '2026-1' },
    update: {},
    create: {
      kode: '2026-1', nama: 'Wisuda Periode I 2026',
      tanggal: new Date('2026-03-15'),
      isPendaftaranBuka: true,
      batasIpk: 2.0, batasSks: 144,
    },
  });
  // Yudisium dummy untuk Farah dengan status 'wisuda' agar verifikasi ijazah bisa diuji
  const yudExist = await prisma.yudisium.findUnique({
    where: { mahasiswaId_periodeWisudaId: { mahasiswaId: farah.id, periodeWisudaId: pw.id } },
  });
  if (!yudExist) {
    await prisma.yudisium.create({
      data: {
        mahasiswaId: farah.id, periodeWisudaId: pw.id,
        status: StatusYudisium.wisuda, ipk: 3.65, sksLulus: 146,
        predikat: PredikatYudisium.cumlaude,
        noIjazah: 'IJ/2026/0001', noSkl: 'SKL/2026/0001',
        tanggalLulus: new Date('2026-03-15'),
        verifikasiToken: sertifikatToken(),
      },
    });
  }
  // Update status Farah ke 'lulus'
  await prisma.mahasiswa.update({ where: { id: farah.id }, data: { status: 'lulus' } });

  // ============================================================
  // BEASISWA
  // ============================================================
  console.log('▶ Seed: beasiswa');
  const beasiswaBidikmisi = await prisma.beasiswa.upsert({
    where: { kode: 'BIDIKMISI-2025' },
    update: { persentase: 100, potongUkt: true },
    create: {
      kode: 'BIDIKMISI-2025', nama: 'Beasiswa Bidikmisi 2025 (UKT Penuh)',
      penyelenggara: 'Kemendikbudristek',
      deskripsi: 'Beasiswa untuk mahasiswa kurang mampu berprestasi. Menutupi 100% UKT.',
      kuota: 20, nominal: 0,
      persentase: 100, potongUkt: true,
      syaratIpk: 3.0,
      tanggalBuka: new Date('2025-07-01'), tanggalTutup: new Date('2025-08-15'),
    },
  });
  // Beasiswa parsial (50% UKT)
  const beasiswaPrestasi = await prisma.beasiswa.upsert({
    where: { kode: 'PRESTASI-2025' },
    update: { persentase: 50, potongUkt: true },
    create: {
      kode: 'PRESTASI-2025', nama: 'Beasiswa Prestasi Akademik (50% UKT)',
      penyelenggara: 'IAI Tazkia',
      deskripsi: 'Beasiswa untuk mahasiswa IPK ≥ 3.5. Memotong 50% UKT semester.',
      kuota: 10, nominal: 0,
      persentase: 50, potongUkt: true,
      syaratIpk: 3.5,
      tanggalBuka: new Date('2025-07-01'), tanggalTutup: new Date('2025-08-15'),
    },
  });
  // Beasiswa nominal tetap (Rp 1.5jt per semester, motong UKT)
  await prisma.beasiswa.upsert({
    where: { kode: 'YAYASAN-2025' },
    update: { persentase: null, potongUkt: true, nominal: 1500000 },
    create: {
      kode: 'YAYASAN-2025', nama: 'Beasiswa Yayasan Tazkia (Rp 1.5jt)',
      penyelenggara: 'Yayasan Tazkia',
      deskripsi: 'Potongan Rp 1.500.000 dari UKT semester.',
      kuota: 30, nominal: 1500000,
      persentase: null, potongUkt: true,
      tanggalBuka: new Date('2025-07-01'), tanggalTutup: new Date('2025-08-15'),
    },
  });

  const pdfBeasiswa = await prisma.pendaftaranBeasiswa.findFirst({
    where: { mahasiswaId: aisyah.id, beasiswaId: beasiswaBidikmisi.id },
  });
  if (!pdfBeasiswa) {
    await prisma.pendaftaranBeasiswa.create({
      data: {
        mahasiswaId: aisyah.id, beasiswaId: beasiswaBidikmisi.id,
        motivasi: 'Saya berasal dari keluarga prasejahtera namun tetap berprestasi akademik. Beasiswa ini akan membantu saya menyelesaikan studi tanpa harus terbebani biaya.',
        ipkSaatDaftar: 3.7,
        semesterSaatDaftar: '20261',
        status: 'diterima',
      },
    });
  }
  // Rizky → beasiswa prestasi 50% (parsial)
  if (rizky) {
    const pdfRizky = await prisma.pendaftaranBeasiswa.findFirst({ where: { mahasiswaId: rizky.id, beasiswaId: beasiswaPrestasi.id } });
    if (!pdfRizky) {
      await prisma.pendaftaranBeasiswa.create({
        data: {
          mahasiswaId: rizky.id, beasiswaId: beasiswaPrestasi.id,
          motivasi: 'IPK saya 3.6 dan saya aktif organisasi. Saya mengajukan beasiswa prestasi untuk mengurangi beban UKT.',
          ipkSaatDaftar: 3.6,
          semesterSaatDaftar: '20261',
          status: 'diterima',
        },
      });
    }
  }

  // ============================================================
  // SURAT permohonan
  // ============================================================
  console.log('▶ Seed: surat');
  const suratExist = await prisma.surat.findFirst({ where: { mahasiswaId: aisyah.id, jenis: 'aktif_kuliah' } });
  if (!suratExist) {
    await prisma.surat.create({
      data: {
        mahasiswaId: aisyah.id, jenis: 'aktif_kuliah',
        judul: 'Surat Keterangan Aktif Kuliah',
        keperluan: 'Untuk pendaftaran beasiswa Djarum Foundation',
        status: 'diajukan',
      },
    });
  }

  // ============================================================
  // KONSULTASI DPA
  // ============================================================
  console.log('▶ Seed: konsultasi DPA');
  const konsExist = await prisma.konsultasiDpa.findFirst({ where: { mahasiswaId: aisyah.id, dpaId: dosen1.id } });
  if (!konsExist) {
    await prisma.konsultasiDpa.create({
      data: {
        mahasiswaId: aisyah.id, dpaId: dosen1.id,
        topik: 'Konsultasi pilihan MK semester depan',
        agenda: 'Pak, saya ingin diskusi tentang pilihan MK pilihan yang relevan dengan minat AI saya.',
        waktuMulai: new Date('2026-02-10T09:00:00'),
        durasiMenit: 30,
        status: StatusKonsultasi.diajukan,
      },
    });
  }

  // ============================================================
  // TIKET helpdesk
  // ============================================================
  console.log('▶ Seed: tiket helpdesk');
  const tiketBaru = await prisma.tiket.findFirst({
    where: { judul: 'Tidak bisa login ke portal mahasiswa' },
  });
  if (!tiketBaru) {
    await prisma.tiket.create({
      data: {
        mahasiswaId: aisyah.id,
        kategori: KategoriTiket.akun,
        judul: 'Tidak bisa login ke portal mahasiswa',
        deskripsi: 'Saya sudah coba password lama tapi gagal login. Mohon bantuan reset password.',
        prioritas: PrioritasTiket.tinggi,
        status: StatusTiket.terbuka,
      },
    });
  }

  // ============================================================
  // SERTIFIKASI + PRESTASI mahasiswa
  // ============================================================
  console.log('▶ Seed: sertifikasi + prestasi mahasiswa');
  const sertif = await prisma.sertifikasi.findFirst({ where: { mahasiswaId: aisyah.id, nama: { contains: 'AWS' } } });
  if (!sertif) {
    await prisma.sertifikasi.create({
      data: {
        mahasiswaId: aisyah.id,
        jenis: JenisSertifikasi.kompetensi,
        nama: 'AWS Certified Cloud Practitioner',
        penerbit: 'Amazon Web Services',
        nomorSertifikat: 'AWS-CP-2025-12345',
        tanggalTerbit: new Date('2025-06-15'),
        tanggalKadaluwarsa: new Date('2028-06-15'),
        status: StatusVerifikasi.diverifikasi,
      },
    });
  }
  const prestasi = await prisma.prestasi.findFirst({ where: { mahasiswaId: aisyah.id, nama: { contains: 'Hackathon' } } });
  if (!prestasi) {
    await prisma.prestasi.create({
      data: {
        mahasiswaId: aisyah.id,
        jenis: JenisPrestasi.lomba_akademik,
        nama: 'Juara 2 Hackathon Nasional Code4Indonesia 2025',
        penyelenggara: 'Kominfo + Universitas Indonesia',
        tanggal: new Date('2025-04-20'),
        level: LevelKegiatan.nasional,
        peran: 'Anggota Tim - posisi Juara 2',
        status: StatusVerifikasi.diverifikasi,
      },
    });
  }

  // ============================================================
  // MUTASI mahasiswa (untuk demo)
  // ============================================================
  console.log('▶ Seed: mutasi (sample)');
  const mutasiExist = await prisma.mutasiMahasiswa.findFirst({ where: { mahasiswaId: rizky.id } });
  if (!mutasiExist) {
    await prisma.mutasiMahasiswa.create({
      data: {
        mahasiswaId: rizky.id,
        jenis: JenisMutasi.cuti,
        statusSebelum: 'aktif',
        statusSesudah: 'cuti',
        prodiAsalId: rizky.prodiId,
        semesterId: semGanjil.id,
        alasan: 'Cuti akademik 1 semester untuk persiapan magang luar negeri.',
        status: StatusMutasi.diajukan,
      },
    });
  }

  // ============================================================
  // WALI MAHASISWA
  // ============================================================
  console.log('▶ Seed: wali mahasiswa + akun wali');
  const waliUser = await prisma.user.upsert({
    where: { email: 'wali.aisyah@example.com' },
    update: {},
    create: {
      email: 'wali.aisyah@example.com',
      passwordHash: (await import('bcryptjs')).default.hashSync('password123', 10),
      role: 'wali',
      wali: {
        create: {
          nama: 'Hasan Putra',
          telepon: '081234567890',
          alamat: 'Jl. Pahlawan No. 12, Bogor',
        },
      },
    },
    include: { wali: true },
  });
  const wali = waliUser.wali!;
  const linkWali = await prisma.waliMahasiswa.findUnique({
    where: { waliId_mahasiswaId: { waliId: wali.id, mahasiswaId: aisyah.id } },
  });
  if (!linkWali) {
    await prisma.waliMahasiswa.create({
      data: { waliId: wali.id, mahasiswaId: aisyah.id, hubungan: HubunganWali.ayah },
    });
  }

  // ============================================================
  // DOKUMEN — Pusat dokumen
  // ============================================================
  console.log('▶ Seed: pusat dokumen');
  const katAkademik = await prisma.kategoriDokumen.upsert({
    where: { kode: 'PANDUAN' },
    update: {},
    create: { kode: 'PANDUAN', nama: 'Panduan Akademik', deskripsi: 'Panduan & SOP akademik' },
  });
  const katRegulasi = await prisma.kategoriDokumen.upsert({
    where: { kode: 'REGULASI' },
    update: {},
    create: { kode: 'REGULASI', nama: 'Regulasi & Tata Tertib', deskripsi: 'Peraturan kampus' },
  });
  const dok1 = await prisma.dokumen.findFirst({ where: { judul: 'Buku Panduan Akademik 2025' } });
  if (!dok1) {
    await prisma.dokumen.create({
      data: {
        kategoriId: katAkademik.id,
        judul: 'Buku Panduan Akademik 2025',
        deskripsi: 'Panduan lengkap tata tertib akademik, kalender, dan ketentuan KRS.',
        fileUrl: '/files/panduan-akademik-2025.pdf',
        jenisFile: 'pdf',
        target: 'all',
        versi: '2025',
      },
    });
  }
  const dok2 = await prisma.dokumen.findFirst({ where: { judul: 'Tata Tertib Mahasiswa' } });
  if (!dok2) {
    await prisma.dokumen.create({
      data: {
        kategoriId: katRegulasi.id,
        judul: 'Tata Tertib Mahasiswa',
        deskripsi: 'Aturan etika, berpakaian, kehadiran, dan disiplin mahasiswa.',
        fileUrl: '/files/tata-tertib-mahasiswa.pdf',
        jenisFile: 'pdf',
        target: 'mahasiswa',
      },
    });
  }

  // ============================================================
  // FEEDER CONFIG (master)
  // ============================================================
  console.log('▶ Seed: feeder config');
  await prisma.feederConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      baseUrl: 'https://api-pddikti.kemdikbud.go.id/v1',
      semesterAktif: '20251',
      dryRun: true,
      isEnabled: false,
    },
  });

  // ============================================================
  // BKD (Beban Kerja Dosen)
  // ============================================================
  console.log('▶ Seed: BKD laporan dosen');
  let bkd = await prisma.bkdLaporan.findUnique({
    where: { dosenId_semesterId: { dosenId: dosen1.id, semesterId: semGanjil.id } },
  });
  if (!bkd) {
    bkd = await prisma.bkdLaporan.create({
      data: {
        dosenId: dosen1.id, semesterId: semGanjil.id,
        status: StatusBkd.disetujui,
        totalSks: 12,
        items: {
          create: [
            { kategori: KategoriBkd.pengajaran, jenis: 'Mengajar Kelas', deskripsi: 'Mengajar RPL & Kecerdasan Buatan', bobotSks: 6 },
            { kategori: KategoriBkd.penelitian, jenis: 'Penelitian (Ketua)', deskripsi: 'Klasifikasi Hadits dengan AI', bobotSks: 3 },
            { kategori: KategoriBkd.pengabdian, jenis: 'Pengabdian (Anggota)', deskripsi: 'Literasi Coding Pesantren', bobotSks: 2 },
            { kategori: KategoriBkd.penunjang, jenis: 'Bimbingan Skripsi', deskripsi: 'Pembimbing 1 (3 mhs)', bobotSks: 1 },
          ],
        },
      },
    });
  }
  // Dosen 2 — laporan draft
  const bkd2 = await prisma.bkdLaporan.findUnique({
    where: { dosenId_semesterId: { dosenId: dosen2.id, semesterId: semGanjil.id } },
  });
  if (!bkd2) {
    await prisma.bkdLaporan.create({
      data: {
        dosenId: dosen2.id, semesterId: semGanjil.id,
        status: StatusBkd.draft, totalSks: 6,
        items: {
          create: [
            { kategori: KategoriBkd.pengajaran, jenis: 'Mengajar Kelas', deskripsi: 'Basis Data Lanjut + Pemrograman Web', bobotSks: 6 },
          ],
        },
      },
    });
  }

  // ============================================================
  // OBE — CPL, CPMK, mapping, NilaiCpmk
  // ============================================================
  console.log('▶ Seed: OBE (CPL + CPMK)');
  const cplData = [
    { kode: 'CPL-1', deskripsi: 'Mampu menerapkan algoritma & pemrograman untuk pemecahan masalah komputasional.', aspek: AspekCpl.ketrampilan_khusus, urutan: 1 },
    { kode: 'CPL-2', deskripsi: 'Mampu merancang sistem informasi dengan pendekatan rekayasa perangkat lunak.', aspek: AspekCpl.ketrampilan_khusus, urutan: 2 },
    { kode: 'CPL-3', deskripsi: 'Berperilaku jujur, profesional, dan bertanggungjawab dalam karya akademik.', aspek: AspekCpl.sikap, urutan: 3 },
  ];
  for (const c of cplData) {
    await prisma.cpl.upsert({
      where: { prodiId_kode: { prodiId: prodiTI.id, kode: c.kode } },
      update: {},
      create: { prodiId: prodiTI.id, kode: c.kode, deskripsi: c.deskripsi, aspek: c.aspek, urutan: c.urutan },
    });
  }
  const cplList = await prisma.cpl.findMany({ where: { prodiId: prodiTI.id } });
  const cplMap: Record<string, string> = Object.fromEntries(cplList.map((c) => [c.kode, c.id]));

  // CPMK untuk MK IF-3101 (RPL)
  const mkRpl = await prisma.mataKuliah.findUnique({ where: { kode: 'IF-3101' } });
  if (mkRpl) {
    const cpmkData = [
      { kode: 'CPMK-RPL-1', deskripsi: 'Menerapkan SDLC pada studi kasus nyata' },
      { kode: 'CPMK-RPL-2', deskripsi: 'Menyusun spesifikasi kebutuhan dan diagram UML' },
    ];
    for (const c of cpmkData) {
      await prisma.cpmk.upsert({
        where: { mataKuliahId_kode: { mataKuliahId: mkRpl.id, kode: c.kode } },
        update: {},
        create: { mataKuliahId: mkRpl.id, kode: c.kode, deskripsi: c.deskripsi },
      });
    }
    const cpmkList = await prisma.cpmk.findMany({ where: { mataKuliahId: mkRpl.id } });
    // Mapping CPMK → CPL
    for (const cm of cpmkList) {
      for (const cpl of cplList.slice(0, 2)) {
        await prisma.cpmkCpl.upsert({
          where: { cpmkId_cplId: { cpmkId: cm.id, cplId: cpl.id } },
          update: { bobot: 0.5 },
          create: { cpmkId: cm.id, cplId: cpl.id, bobot: 0.5 },
        });
      }
    }
    // NilaiCpmk untuk KRS Aisyah pada RPL (semester ganjil aktif)
    const krsRpl = await prisma.krs.findFirst({
      where: { mahasiswaId: aisyah.id, kelas: { mataKuliahId: mkRpl.id, semesterId: semGanjil.id } },
    });
    if (krsRpl) {
      for (const cm of cpmkList) {
        await prisma.nilaiCpmk.upsert({
          where: { krsId_cpmkId: { krsId: krsRpl.id, cpmkId: cm.id } },
          update: {},
          create: { krsId: krsRpl.id, cpmkId: cm.id, nilai: 80 + Math.floor(Math.random() * 15), status: StatusCpmk.tuntas },
        });
      }
    }
  }
  void cplMap;

  // ============================================================
  // SERTIFIKAT DIGITAL
  // ============================================================
  console.log('▶ Seed: sertifikat digital');
  const sertifikatExist = await prisma.sertifikatDigital.findFirst({
    where: { mahasiswaId: aisyah.id, jenis: JenisSertifikatDigital.workshop },
  });
  if (!sertifikatExist) {
    await prisma.sertifikatDigital.create({
      data: {
        mahasiswaId: aisyah.id,
        jenis: JenisSertifikatDigital.workshop,
        judul: 'Workshop Machine Learning untuk Mahasiswa',
        deskripsi: 'Telah mengikuti workshop ML dasar selama 2 hari.',
        periode: 'November 2025',
        nomorSertifikat: 'SRT/WORKSHOP/2025/0001',
        verifikasiToken: sertifikatToken(),
        ttdNama: 'Kepala Bagian Akademik',
      },
    });
  }

  // ============================================================
  // SPMI — STANDAR MUTU (8 standar mencakup beragam kategori + sumberData)
  // ============================================================
  console.log('▶ Seed: SPMI — Standar Mutu');
  const standarData: Array<{
    kode: string; nama: string; kategori: KategoriStandar; deskripsi: string;
    satuan?: string; targetMin?: number; targetMax?: number; ambangCukup?: number;
    sumberData: SumberDataStandar; prodiId?: string | null;
  }> = [
    {
      kode: 'STD-PEND-01', nama: 'IPK rata-rata lulusan minimal 3.00',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'IPK rata-rata lulusan minimal 3.00 dari skala 4.00 untuk menjamin kualitas akademik.',
      satuan: 'IPK', targetMin: 3.0, ambangCukup: 2.75, sumberData: SumberDataStandar.ipk_lulusan,
    },
    {
      kode: 'STD-PEND-02', nama: 'Masa studi rata-rata maksimal 4.5 tahun',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'Masa studi rata-rata lulusan jenjang S1 tidak melebihi 4.5 tahun.',
      satuan: 'tahun', targetMax: 4.5, ambangCukup: 5.0, sumberData: SumberDataStandar.masa_studi,
    },
    {
      kode: 'STD-PEND-03', nama: 'EDOM rata-rata dosen minimal 80/100',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'Skor evaluasi dosen oleh mahasiswa (EDOM) rata-rata minimal 80 dari 100.',
      satuan: 'skor', targetMin: 80, ambangCukup: 70, sumberData: SumberDataStandar.edom_dosen,
    },
    {
      kode: 'STD-PEND-04', nama: 'Tingkat kehadiran mahasiswa minimal 80%',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'Persentase kehadiran mahasiswa dalam pertemuan kuliah minimal 80%.',
      satuan: '%', targetMin: 80, ambangCukup: 75, sumberData: SumberDataStandar.kehadiran_mahasiswa,
    },
    {
      kode: 'STD-PEND-05', nama: 'Rasio dosen : mahasiswa maksimal 1:30',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'Rasio dosen tetap dengan mahasiswa aktif tidak melebihi 1:30.',
      satuan: 'rasio', targetMax: 30, ambangCukup: 35, sumberData: SumberDataStandar.rasio_dosen_mhs,
    },
    {
      kode: 'STD-PEND-06', nama: 'Capaian CPL rata-rata minimal 75',
      kategori: KategoriStandar.pendidikan,
      deskripsi: 'Rata-rata nilai capaian CPMK mahasiswa minimal 75 sebagai indikator capaian CPL.',
      satuan: 'skor', targetMin: 75, ambangCukup: 65, sumberData: SumberDataStandar.capaian_cpl,
    },
    {
      kode: 'STD-DOS-01', nama: 'Compliance pelaporan BKD dosen 100%',
      kategori: KategoriStandar.pengelolaan,
      deskripsi: 'Persentase dosen yang melaporkan BKD dan disetujui dalam satu semester minimal 100%.',
      satuan: '%', targetMin: 100, ambangCukup: 80, sumberData: SumberDataStandar.bkd_compliance,
    },
    {
      kode: 'STD-LAY-01', nama: 'Kepuasan layanan akademik minimal 80',
      kategori: KategoriStandar.non_akademik,
      deskripsi: 'Indeks kepuasan layanan akademik dari survei mahasiswa minimal 80 (skala 100).',
      satuan: 'IKM', targetMin: 80, ambangCukup: 70, sumberData: SumberDataStandar.manual,
    },
    {
      kode: 'STD-INT-01', nama: 'Publikasi internasional terindeks Scopus per dosen ≥ 1/tahun',
      kategori: KategoriStandar.standar_internasional,
      deskripsi: 'Setiap dosen tetap menghasilkan minimal 1 publikasi internasional terindeks Scopus/WoS per tahun — Permenristekdikti 39/2025 adaptasi standar global.',
      satuan: 'rasio', targetMin: 1, ambangCukup: 0.5, sumberData: SumberDataStandar.manual,
    },
    {
      kode: 'STD-INT-02', nama: 'Pemeringkatan internasional (QS/THE) — minimal masuk world ranking',
      kategori: KategoriStandar.standar_internasional,
      deskripsi: 'Institusi terdaftar dan memperoleh peringkat di QS World University Rankings atau Times Higher Education — sebagai tolok ukur global.',
      satuan: 'status', sumberData: SumberDataStandar.manual,
    },
  ];

  const standarCreated: Record<string, string> = {};
  for (const s of standarData) {
    const std = await prisma.standarMutu.upsert({
      where: { kode: s.kode },
      update: {},
      create: {
        kode: s.kode, nama: s.nama, kategori: s.kategori, deskripsi: s.deskripsi,
        satuan: s.satuan ?? null,
        targetMin: s.targetMin ?? null,
        targetMax: s.targetMax ?? null,
        ambangCukup: s.ambangCukup ?? null,
        sumberData: s.sumberData,
        prodiId: s.prodiId ?? null,
        isAktif: true,
      },
    });
    standarCreated[s.kode] = std.id;
  }

  // Pengukuran sample (3 standar) untuk periode 2025
  console.log('▶ Seed: SPMI — Pengukuran sample');
  const pengukuranData: Array<{ kode: string; periode: string; nilai: number; status: StatusPencapaian; catatan?: string }> = [
    { kode: 'STD-PEND-01', periode: '2025', nilai: 3.45, status: StatusPencapaian.tercapai, catatan: 'IPK lulusan periode wisuda I 2025' },
    { kode: 'STD-PEND-02', periode: '2025', nilai: 4.2, status: StatusPencapaian.tercapai, catatan: 'Masa studi rata-rata lulusan' },
    { kode: 'STD-PEND-03', periode: '2025', nilai: 76, status: StatusPencapaian.cukup, catatan: 'Skor EDOM mendekati target' },
    { kode: 'STD-PEND-04', periode: '2025', nilai: 85, status: StatusPencapaian.tercapai },
    { kode: 'STD-DOS-01', periode: '2025', nilai: 50, status: StatusPencapaian.belum_tercapai, catatan: 'Banyak dosen belum lapor BKD' },
    { kode: 'STD-LAY-01', periode: '2025', nilai: 82, status: StatusPencapaian.tercapai, catatan: 'Dari survei kepuasan layanan akademik' },
  ];
  for (const p of pengukuranData) {
    const stdId = standarCreated[p.kode];
    if (!stdId) continue;
    await prisma.pengukuranStandar.upsert({
      where: { standarId_periode: { standarId: stdId, periode: p.periode } },
      update: {},
      create: {
        standarId: stdId, periode: p.periode, nilai: p.nilai,
        status: p.status, catatan: p.catatan ?? null,
      },
    });
  }

  // ============================================================
  // SPMI — AMI + Auditor + Lingkup + Temuan + CAPA
  // ============================================================
  console.log('▶ Seed: SPMI — AMI demo lengkap');
  const ami = await prisma.auditMutuInternal.upsert({
    where: { kode: 'AMI-2026-01' },
    update: {
      dilaporkanKeSpme: true,
      dilaporkanKeSpmePada: new Date('2026-03-05'),
      dampakAkreditasi: 'Hasil audit dilaporkan sebagai bagian dokumen pendukung re-akreditasi prodi TI dan SI tahun 2026 (Permenristekdikti 39/2025).',
    },
    create: {
      kode: 'AMI-2026-01',
      nama: 'Audit Mutu Internal Semester Ganjil 2025/2026',
      periode: '2025/2026 Ganjil',
      tanggalMulai: new Date('2026-01-15'),
      tanggalSelesai: new Date('2026-02-28'),
      status: StatusAmi.pelaksanaan,
      ruangLingkup: 'Audit pelaksanaan standar pendidikan untuk Prodi TI dan SI, fokus pada implementasi OBE.',
      dilaporkanKeSpme: true,
      dilaporkanKeSpmePada: new Date('2026-03-05'),
      dampakAkreditasi: 'Hasil audit dilaporkan sebagai bagian dokumen pendukung re-akreditasi prodi TI dan SI tahun 2026 (Permenristekdikti 39/2025).',
    },
  });

  // Auditor
  for (const d of [{ id: dosen1.id, peran: 'ketua' }, { id: dosen2.id, peran: 'auditor' }]) {
    const exist = await prisma.auditorAmi.findUnique({
      where: { amiId_dosenId: { amiId: ami.id, dosenId: d.id } },
    });
    if (!exist) {
      await prisma.auditorAmi.create({ data: { amiId: ami.id, dosenId: d.id, peran: d.peran } });
    }
  }

  // Lingkup prodi
  for (const p of [prodiTI, prodiSI]) {
    const exist = await prisma.lingkupAmi.findUnique({
      where: { amiId_prodiId: { amiId: ami.id, prodiId: p.id } },
    });
    if (!exist) {
      await prisma.lingkupAmi.create({ data: { amiId: ami.id, prodiId: p.id } });
    }
  }

  // Temuan
  const temuanData: Array<{ kode: string; kategori: KategoriTemuan; standarKode?: string; deskripsi: string; rekomendasi: string; capa?: { rencana: string; targetSelesai: Date; status: StatusCapa; realisasi?: string; tanggalSelesai?: Date } }> = [
    {
      kode: 'TMN-2026-01-001', kategori: KategoriTemuan.kts, standarKode: 'STD-PEND-06',
      deskripsi: 'Sebagian besar RPS mata kuliah belum mencantumkan pemetaan eksplisit CPMK ke CPL prodi.',
      rekomendasi: 'Lakukan review RPS oleh tim kurikulum sebelum awal semester berikutnya dan susun SOP review RPS.',
      capa: {
        rencana: 'Susun SOP review RPS dan jadwalkan review menyeluruh sebelum semester ganjil 2026/2027.',
        targetSelesai: new Date('2026-06-30'),
        status: StatusCapa.pelaksanaan,
        realisasiTindakan: 'SOP draft sudah disusun, tinggal sosialisasi ke dosen pengampu.',
      },
    },
    {
      kode: 'TMN-2026-01-002', kategori: KategoriTemuan.ktsm, standarKode: 'STD-DOS-01',
      deskripsi: 'Lebih dari 50% dosen belum melaporkan BKD untuk semester ganjil 2025/2026.',
      rekomendasi: 'Kirim reminder berkala, pertimbangkan menjadikan BKD sebagai prasyarat penerbitan SK mengajar.',
      capa: {
        rencana: 'Aktifkan reminder otomatis di SIAKAD setiap awal bulan + integrasi BKD sebagai prasyarat SK mengajar.',
        targetSelesai: new Date('2026-04-30'),
        status: StatusCapa.rencana,
      },
    },
    {
      kode: 'TMN-2026-01-003', kategori: KategoriTemuan.observasi,
      deskripsi: 'Beberapa kelas memiliki kehadiran mahasiswa di bawah 80% pada periode tengah semester.',
      rekomendasi: 'Tingkatkan komunikasi dengan DPA untuk follow-up mahasiswa dengan kehadiran rendah.',
    },
    {
      kode: 'TMN-2026-01-004', kategori: KategoriTemuan.saran,
      deskripsi: 'Materi bahan ajar di Sistem Akademik bisa ditambah dengan video pembelajaran untuk fleksibilitas mahasiswa.',
      rekomendasi: 'Sediakan pelatihan pembuatan video pembelajaran bagi dosen pada semester depan.',
    },
  ];
  for (const t of temuanData) {
    const exist = await prisma.temuanAmi.findUnique({
      where: { amiId_kode: { amiId: ami.id, kode: t.kode } },
    });
    if (exist) continue;
    const created = await prisma.temuanAmi.create({
      data: {
        amiId: ami.id, kode: t.kode, kategori: t.kategori,
        standarId: t.standarKode ? standarCreated[t.standarKode] : null,
        deskripsi: t.deskripsi, rekomendasi: t.rekomendasi,
      },
    });
    if (t.capa) {
      await prisma.tindakLanjutCapa.create({
        data: {
          temuanId: created.id,
          rencanaTindakan: t.capa.rencana,
          targetSelesai: t.capa.targetSelesai,
          status: t.capa.status,
          realisasiTindakan: t.capa.realisasi ?? null,
          tanggalSelesai: t.capa.tanggalSelesai ?? null,
          picDosenId: dosen1.id,
        },
      });
    }
  }

  // ============================================================
  // SPMI — RTM + Keputusan
  // ============================================================
  console.log('▶ Seed: SPMI — RTM demo');
  const rtm = await prisma.rapatTinjauanManajemen.upsert({
    where: { kode: 'RTM-2026-01' },
    update: {},
    create: {
      kode: 'RTM-2026-01',
      judul: 'Rapat Tinjauan Manajemen Semester Ganjil 2025/2026',
      tanggal: new Date('2026-03-01'),
      agenda: '1. Tinjauan capaian standar mutu periode 2025\n2. Pembahasan temuan AMI 2026-01\n3. Evaluasi kepuasan layanan akademik\n4. Tindak lanjut strategis',
      peserta: 'Rektor, Wakil Rektor I & II, Dekan FTI, Kaprodi TI/SI, Ketua LPM, Kepala BAAK',
      status: StatusRtm.selesai,
      notulen: 'Rapat membahas capaian SPMI 2025 yang menunjukkan 4 dari 8 standar tercapai. Catatan utama: kepatuhan BKD masih rendah. Rektor menugaskan Wakil Rektor I untuk memimpin program peningkatan kepatuhan BKD.',
    },
  });
  const keputusanData = [
    {
      deskripsi: 'Aktifkan reminder otomatis BKD di SIAKAD dan jadikan BKD sebagai prasyarat penerbitan SK mengajar mulai semester ganjil 2026/2027.',
      picCatatan: 'Wakil Rektor I',
      targetSelesai: new Date('2026-08-01'),
      status: StatusKeputusanRtm.in_progress,
    },
    {
      deskripsi: 'Implementasi SOP review RPS oleh tim kurikulum sebelum awal semester.',
      picCatatan: 'Dekan FTI',
      targetSelesai: new Date('2026-08-15'),
      status: StatusKeputusanRtm.open,
    },
    {
      deskripsi: 'Lakukan survei kepuasan layanan akademik setiap akhir semester (bukan tahunan).',
      picCatatan: 'Ketua LPM',
      targetSelesai: new Date('2026-06-30'),
      status: StatusKeputusanRtm.done,
    },
  ];
  for (const k of keputusanData) {
    const exist = await prisma.keputusanRtm.findFirst({
      where: { rtmId: rtm.id, deskripsi: k.deskripsi },
    });
    if (!exist) {
      await prisma.keputusanRtm.create({
        data: {
          rtmId: rtm.id,
          deskripsi: k.deskripsi,
          picCatatan: k.picCatatan,
          targetSelesai: k.targetSelesai,
          status: k.status,
        },
      });
    }
  }

  // ============================================================
  // SPMI — Survei Kepuasan + Pertanyaan + 5 sample response
  // ============================================================
  console.log('▶ Seed: SPMI — Survei Kepuasan demo');
  const survei = await prisma.kuesionerKepuasan.upsert({
    where: { kode: 'SRV-2026-AKD-01' },
    update: {},
    create: {
      kode: 'SRV-2026-AKD-01',
      judul: 'Survei Kepuasan Layanan Akademik 2026',
      deskripsi: 'Survei tahunan untuk mengukur kepuasan mahasiswa terhadap layanan akademik.',
      kategori: KategoriSurvei.layanan_akademik,
      target: 'mahasiswa',
      periode: '2025/2026',
      tokenPublic: surveiToken(),
      status: StatusSurvei.publish,
      mulai: new Date('2026-01-01'),
      selesai: new Date('2026-06-30'),
    },
  });

  const pertanyaanData = [
    { urutan: 1, pertanyaan: 'Bagaimana kecepatan respons layanan BAAK terhadap permintaan Anda?', jenis: JenisPertanyaanKepuasan.likert, wajib: true },
    { urutan: 2, pertanyaan: 'Bagaimana keramahan & profesionalisme staf BAAK?', jenis: JenisPertanyaanKepuasan.likert, wajib: true },
    { urutan: 3, pertanyaan: 'Bagaimana kemudahan penggunaan SIAKAD?', jenis: JenisPertanyaanKepuasan.likert, wajib: true },
    { urutan: 4, pertanyaan: 'Channel komunikasi mana yang paling Anda gunakan?', jenis: JenisPertanyaanKepuasan.pilihan, wajib: false, opsi: ['WhatsApp', 'Email', 'Telepon', 'Datang langsung'] },
    { urutan: 5, pertanyaan: 'Saran perbaikan layanan akademik:', jenis: JenisPertanyaanKepuasan.open, wajib: false },
  ];

  for (const p of pertanyaanData) {
    const exist = await prisma.pertanyaanKepuasan.findFirst({
      where: { kuesionerId: survei.id, urutan: p.urutan },
    });
    if (!exist) {
      await prisma.pertanyaanKepuasan.create({
        data: {
          kuesionerId: survei.id,
          urutan: p.urutan, pertanyaan: p.pertanyaan, jenis: p.jenis, wajib: p.wajib,
          opsi: p.opsi ?? undefined,
        },
      });
    }
  }

  const pList = await prisma.pertanyaanKepuasan.findMany({ where: { kuesionerId: survei.id }, orderBy: { urutan: 'asc' } });
  const existingResponseCount = await prisma.responseKepuasan.count({ where: { kuesionerId: survei.id } });
  if (existingResponseCount === 0 && pList.length === 5) {
    const sampleResponses = [
      { likert: [5, 4, 5], pilihan: 'WhatsApp', teks: 'Sudah baik, tingkatkan respons via WA grup BAAK.' },
      { likert: [4, 5, 4], pilihan: 'WhatsApp', teks: 'Perbaiki UI absensi di handphone.' },
      { likert: [3, 4, 3], pilihan: 'Datang langsung', teks: 'Loket BAAK terkadang antri terlalu lama.' },
      { likert: [5, 5, 5], pilihan: 'Email', teks: '' },
      { likert: [2, 3, 3], pilihan: 'Telepon', teks: 'Sulit menghubungi via telepon di jam kerja.' },
    ];
    for (const r of sampleResponses) {
      await prisma.responseKepuasan.create({
        data: {
          kuesionerId: survei.id,
          rolePelapor: 'mahasiswa',
          jawaban: {
            create: [
              { pertanyaanId: pList[0]!.id, nilai: r.likert[0] },
              { pertanyaanId: pList[1]!.id, nilai: r.likert[1] },
              { pertanyaanId: pList[2]!.id, nilai: r.likert[2] },
              { pertanyaanId: pList[3]!.id, pilihan: r.pilihan },
              ...(r.teks ? [{ pertanyaanId: pList[4]!.id, teks: r.teks }] : []),
            ],
          },
        },
      });
    }
  }

  console.log('✓ Seed fitur lanjutan + SPMI selesai.');
  void AksiDokumen; // suppress unused if not used elsewhere
}
