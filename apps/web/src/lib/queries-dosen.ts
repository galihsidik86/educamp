import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

// ============================================================
// Dashboard, Profil, Jadwal
// ============================================================

export type DosenDashboardData = {
  semester: { kode: string; nama: string };
  kelasCount: number;
  totalSks: number;
  totalMahasiswa: number;
  totalBimbingan: number;
  penelitianAktif: number;
  pengabdianAktif: number;
  jadwalHariIni: Array<{ kode: string; nama: string; kodeKelas: string; jamMulai: string | null; jamSelesai: string | null; ruangan: string | null }>;
  pengumuman: Array<{ id: string; judul: string; isi: string; tanggal: string; isPenting: boolean }>;
  today: string;
};
export const useDosenDashboard = () => useApi<DosenDashboardData>(['dosen-dashboard'], '/dosen/dashboard');

export type DosenProfil = {
  id: string; nidn: string; nama: string;
  gelarDepan: string | null; gelarBelakang: string | null;
  jabatanFungsional: string | null; jabatanStruktural: string | null;
  isDpa: boolean;
  user: { email: string };
  prodi: { kode: string; nama: string; fakultas: { nama: string } };
  _count: { kelas: number; mahasiswaBimbingan: number; penelitian: number; pengabdian: number };
};
export const useDosenProfil = () => useApi<DosenProfil>(['dosen-profil'], '/dosen/profil');

export type DosenProfilUpdate = { nama?: string; gelarDepan?: string | null; gelarBelakang?: string | null };
export function useUpdateDosenProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: DosenProfilUpdate) => api('/dosen/profil', { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-profil'] }),
  });
}

export type DosenJadwalItem = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  ruangan: string | null;
  hari: string; jamMulai: string; jamSelesai: string;
  pesertaCount: number;
};
export const useDosenJadwal = () =>
  useApi<{ semester: { kode: string; jenis: string }; jadwal: DosenJadwalItem[] }>(['dosen-jadwal'], '/dosen/jadwal');

// ============================================================
// Kelas + Input Nilai
// ============================================================

export type DosenKelas = {
  id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  hari: string | null; jamMulai: string | null; jamSelesai: string | null;
  ruangan: string | null; pesertaCount: number; semester: string;
  peran: 'lead' | 'anggota' | 'asisten';
};
export const useDosenKelas = () =>
  useApi<{ kelas: DosenKelas[] }>(['dosen-kelas'], '/dosen/kelas');

export type DosenKelasDetail = {
  kelas: {
    id: string; kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
    hari: string | null; jamMulai: string | null; jamSelesai: string | null;
    ruangan: string | null;
    semester: { kode: string; nama: string };
    periodeNilai: { mulai: string | null; selesai: string | null };
    peran: 'lead' | 'anggota' | 'asisten';
    team: Array<{
      dosenId: string; nidn: string; nama: string;
      gelarDepan: string | null; gelarBelakang: string | null;
      peran: 'lead' | 'anggota' | 'asisten';
    }>;
    bobotNilai: BobotNilai | null;
  };
  peserta: Array<{
    krsId: string;
    statusKrs: string;
    mahasiswa: { id: string; nim: string; nama: string; angkatan: number };
    nilai: {
      tugas: number | null; uts: number | null; uas: number | null;
      praktikum: number | null; kehadiran: number | null;
      nilaiAngka: number | null; nilaiHuruf: string | null; bobot: number | null;
      status: 'belum' | 'draft' | 'finalized';
    } | null;
  }>;
};
export const useDosenKelasDetail = (id: string | undefined) =>
  useApi<DosenKelasDetail>(['dosen-kelas', id], `/dosen/kelas/${id}`, { enabled: !!id });

export type NilaiPatch = {
  tugas?: number | null; uts?: number | null; uas?: number | null;
  praktikum?: number | null; kehadiran?: number | null;
  nilaiAngka?: number | null;
  status?: 'belum' | 'draft' | 'finalized';
};
export function useUpdateNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ krsId, patch }: { krsId: string; patch: NilaiPatch }) =>
      api(`/dosen/nilai/${krsId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

// ============================================================
// Bobot nilai per kelas — dosen set persentase komponen.
// ============================================================
export type BobotNilai = {
  tugas: number; uts: number; uas: number;
  praktikum: number; kehadiran: number;
};
export function useUpdateBobotNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bobot: BobotNilai) =>
      api(`/dosen/kelas/${kelasId}/bobot`, { method: 'PUT', body: JSON.stringify(bobot) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

/**
 * Sumber nilai per komponen per mahasiswa.
 * - tugas: rerata SubmitTugas (jenis=tugas) yang dinilai + KuisAttempt (masukNilaiTugas)
 * - uts/uas/praktikum: rerata SubmitTugas dengan jenis sesuai
 * Dipakai oleh hint Sync per kolom dan tombol "Sinkron semua mahasiswa".
 */
export type Komponen = 'tugas' | 'uts' | 'uas' | 'praktikum';
export type NilaiSumberItem = Partial<Record<Komponen, { rerata: number; dinilai: number }>>;
export type KelasNilaiSumber = {
  total: Record<Komponen, number>;
  items: Record<string, NilaiSumberItem>;
};
export const useDosenKelasNilaiSumber = (kelasId: string | undefined) =>
  useApi<KelasNilaiSumber>(['dosen-kelas-nilai-sumber', kelasId], `/dosen/kelas/${kelasId}/nilai-sumber`, { enabled: !!kelasId });

export type SinkronNilaiResult = { updated: number; mahasiswa: number; message: string };
export function useSinkronNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<SinkronNilaiResult>(`/dosen/kelas/${kelasId}/sinkron-nilai`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

/** Hitung nilai akhir dari komponen × bobot. Komponen null diabaikan
 *  (bobot-nya tidak diakumulasi), bukan dianggap 0 — supaya dosen yang
 *  belum input semua komponen tidak ke-penalty unfair. */
export function hitungNilaiDariBobot(
  k: { tugas?: number | null; uts?: number | null; uas?: number | null; praktikum?: number | null; kehadiran?: number | null },
  b: BobotNilai,
): number | null {
  const pairs: Array<[number | null | undefined, number]> = [
    [k.tugas, b.tugas], [k.uts, b.uts], [k.uas, b.uas],
    [k.praktikum, b.praktikum], [k.kehadiran, b.kehadiran],
  ];
  let totalNilai = 0;
  let totalBobot = 0;
  for (const [val, bobot] of pairs) {
    if (val == null || bobot === 0) continue;
    totalNilai += val * bobot;
    totalBobot += bobot;
  }
  if (totalBobot === 0) return null;
  // Re-scale: bagi dengan totalBobot yang dipakai (bukan 100), supaya komponen
  // yang belum diinput tidak menarik nilai akhir turun.
  return Math.round((totalNilai / totalBobot) * 100) / 100;
}

export type NilaiImportResult = {
  totalRows: number;
  created: number;
  failed: number;
  results: Array<{ row: number; key: string | null; status: 'created' | 'failed'; message?: string }>;
};
export function useImportNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<Record<string, string>>) =>
      apiPost<NilaiImportResult>(`/dosen/kelas/${kelasId}/nilai/import`, { rows }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

export type FinalizeAllResult = { ok: boolean; finalized: number; belumDinilai: number; sudahFinal: number; message: string };
export function useFinalizeAllNilai(kelasId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<FinalizeAllResult>(`/dosen/kelas/${kelasId}/nilai/finalize-all`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dosen-kelas', kelasId] }),
  });
}

// ============================================================
// Tugas dosen
// ============================================================

export type DosenTugasItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  deadline: string;
  maxNilai: number;
  linkLampiran: string | null;
  pertemuanKe: number | null;
  jenis: Komponen;
  totalSubmit: number;
  totalDinilai: number;
};
export type DosenTugasList = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  items: DosenTugasItem[];
};
export const useDosenTugas = (kelasId: string | undefined) =>
  useApi<DosenTugasList>(['dosen-tugas', kelasId], `/dosen/kelas/${kelasId}/tugas`, { enabled: !!kelasId });

export type DosenTugasInput = {
  judul: string;
  deskripsi?: string | null;
  deadline: string;
  maxNilai?: number;
  linkLampiran?: string | null;
  pertemuanId?: string | null;
  jenis?: Komponen;
};

export type DosenSubmissionItem = {
  mahasiswaId: string;
  nim: string;
  nama: string;
  submission: {
    id: string;
    linkJawaban: string | null;
    isiJawaban: string | null;
    waktuSubmit: string;
    terlambat: boolean;
    nilai: number | null;
    catatan: string | null;
    status: 'terkumpul' | 'terlambat' | 'dinilai';
  } | null;
};
export type DosenTugasSubmissionList = {
  tugas: { id: string; judul: string; deadline: string; maxNilai: number };
  kelas: { kodeMK: string; namaMK: string; kodeKelas: string };
  peserta: DosenSubmissionItem[];
};
export const useDosenTugasSubmission = (tugasId: string | undefined) =>
  useApi<DosenTugasSubmissionList>(['dosen-tugas-submission', tugasId], `/dosen/tugas/${tugasId}/submission`, { enabled: !!tugasId });

export function useDosenTugasActions(kelasId?: string, tugasId?: string) {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['dosen-tugas', kelasId] }),
    qc.invalidateQueries({ queryKey: ['dosen-tugas-submission', tugasId] }),
  ]);
  return {
    create: useMutation({
      mutationFn: (body: DosenTugasInput) => apiPost(`/dosen/kelas/${kelasId}/tugas`, body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<DosenTugasInput> }) =>
        api(`/dosen/tugas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/dosen/tugas/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    grade: useMutation({
      mutationFn: ({ submissionId, nilai, catatan }: { submissionId: string; nilai: number; catatan?: string | null }) =>
        api(`/dosen/submission/${submissionId}`, { method: 'PATCH', body: JSON.stringify({ nilai, catatan }) }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Bahan Ajar (dosen CRUD per kelas)
// ============================================================

export type JenisBahanAjar = 'link' | 'file' | 'text' | 'video';

export type BahanAjarItem = {
  id: string;
  jenis: JenisBahanAjar;
  judul: string;
  deskripsi: string | null;
  url: string | null;
  konten: string | null;
  urutan: number;
  pertemuanKe: number | null;
  pertemuanId: string | null;
  createdAt: string;
};

export type BahanAjarList = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  items: BahanAjarItem[];
};

export const useDosenBahanAjar = (kelasId: string | undefined) =>
  useApi<BahanAjarList>(['dosen-bahan-ajar', kelasId], `/dosen/kelas/${kelasId}/bahan-ajar`, { enabled: !!kelasId });

export type BahanAjarInput = {
  jenis: JenisBahanAjar;
  judul: string;
  deskripsi?: string | null;
  url?: string | null;
  konten?: string | null;
  pertemuanId?: string | null;
  urutan?: number;
};

export function useBahanAjarActions(kelasId: string | undefined) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['dosen-bahan-ajar', kelasId] });
  return {
    create: useMutation({
      mutationFn: (body: BahanAjarInput) => apiPost(`/dosen/kelas/${kelasId}/bahan-ajar`, body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<BahanAjarInput> }) =>
        api(`/dosen/bahan-ajar/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/dosen/bahan-ajar/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Skripsi bimbingan dosen
// ============================================================

export type DosenSkripsiItem = {
  id: string;
  judul: string;
  topik: string | null;
  status: string;
  catatan: string | null;
  tanggalAjuan: string;
  tanggalDisetujui: string | null;
  tanggalSidang: string | null;
  nilaiHuruf: string | null;
  linkDokumen: string | null;
  peran: 'pembimbing1' | 'pembimbing2';
  pembimbing1: string | null;
  pembimbing2: string | null;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
};
export const useDosenSkripsi = () =>
  useApi<{ items: DosenSkripsiItem[] }>(['dosen-skripsi'], '/dosen/skripsi');

// ============================================================
// Pengumuman (read-only untuk dosen)
// ============================================================

export type PengumumanItem = {
  id: string;
  judul: string;
  isi: string;
  target: string;
  pengirim: string | null;
  isPenting: boolean;
  tanggal: string;
};
export const useDosenPengumuman = () =>
  useApi<{ items: PengumumanItem[] }>(['dosen-pengumuman'], '/dosen/pengumuman');

// ============================================================
// Absensi
// ============================================================

export type AbsensiStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export type PertemuanItem = {
  id: string;
  pertemuanKe: number;
  tanggal: string;
  topik: string | null;
  catatan: string | null;
  totalAbsensi: number;
  ringkasan: { hadir: number; izin: number; sakit: number; alpa: number };
  tanggalAsli: string | null;
  alasanReschedule: string | null;
  ruangan: { kode: string; nama: string } | null;
};
export type PertemuanList = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  items: PertemuanItem[];
};
export const useDosenPertemuan = (kelasId: string | undefined) =>
  useApi<PertemuanList>(['dosen-pertemuan', kelasId], `/dosen/kelas/${kelasId}/pertemuan`, { enabled: !!kelasId });

export type RuanganDosen = { id: string; kode: string; nama: string; gedung: string | null; kapasitas: number };
export const useDosenRuangan = () =>
  useApi<{ items: RuanganDosen[] }>(['dosen-ruangan'], '/dosen/ruangan');

// ============================================================
// DPA Dashboard
// ============================================================

export type DpaDashboard = {
  ringkasan: {
    totalMahasiswa: number;
    krsPending: number;
    atRiskIpk: number;
    kritisKehadiran: number;
    ipkRataRata: number | null;
    semester: { kode: string; nama: string };
    threshold: { ipkAtRisk: number; kehadiranKritis: number };
  };
  items: Array<{
    id: string;
    nim: string;
    nama: string;
    angkatan: number;
    status: string;
    prodi: { kode: string; nama: string };
    ipk: number | null;
    sksAmbil: number;
    krsCount: number;
    krsPending: boolean;
    persenHadir: number | null;
    atRiskIpk: boolean;
    kritisKehadiran: boolean;
  }>;
};

export const useDpaDashboard = () =>
  useApi<DpaDashboard>(['dpa-dashboard'], '/dosen/dpa-dashboard');

export type KehadiranRekap = {
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  totalPertemuan: number;
  threshold: number;
  pertemuan: Array<{ id: string; pertemuanKe: number; tanggal: string; topik: string | null }>;
  items: Array<{
    mahasiswaId: string; nim: string; nama: string;
    ringkasan: { hadir: number; izin: number; sakit: number; alpa: number };
    totalDinilai: number;
    persentaseHadir: number | null;
    kritis: boolean;
  }>;
};
export const useDosenKehadiranRekap = (kelasId: string | undefined) =>
  useApi<KehadiranRekap>(['dosen-kehadiran-rekap', kelasId], `/dosen/kelas/${kelasId}/kehadiran-rekap`, { enabled: !!kelasId });

export type AbsensiPertemuan = {
  pertemuan: { id: string; pertemuanKe: number; tanggal: string; topik: string | null };
  kelas: { id: string; kodeMK: string; namaMK: string; kodeKelas: string };
  peserta: Array<{
    mahasiswaId: string; nim: string; nama: string;
    status: AbsensiStatus | null;
    catatan: string | null;
  }>;
};
export const useDosenAbsensiPertemuan = (pertemuanId: string | undefined) =>
  useApi<AbsensiPertemuan>(['dosen-absensi-pertemuan', pertemuanId], `/dosen/pertemuan/${pertemuanId}/absensi`, { enabled: !!pertemuanId });

export type PinStatus = {
  pin: string | null;
  expiresAt: string | null;
  dibuatPada: string | null;
  isActive: boolean;
  hadirViaPin: number;
  totalHadir: number;
};
export const useDosenPinStatus = (pertemuanId: string | undefined, opts: { refetchInterval?: number } = {}) =>
  useApi<PinStatus>(['dosen-pin-status', pertemuanId], `/dosen/pertemuan/${pertemuanId}/pin-status`, { enabled: !!pertemuanId, ...opts });

export function useDosenAbsensiActions(kelasId?: string, pertemuanId?: string) {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['dosen-pertemuan', kelasId] }),
    qc.invalidateQueries({ queryKey: ['dosen-absensi-pertemuan', pertemuanId] }),
  ]);
  return {
    createPertemuan: useMutation({
      mutationFn: (body: { pertemuanKe?: number; tanggal: string; topik?: string | null; catatan?: string | null }) =>
        apiPost(`/dosen/kelas/${kelasId}/pertemuan`, body),
      onSuccess: inv,
    }),
    updatePertemuan: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{ pertemuanKe: number; tanggal: string; topik: string | null; catatan: string | null }> }) =>
        api(`/dosen/pertemuan/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    deletePertemuan: useMutation({
      mutationFn: (id: string) => api(`/dosen/pertemuan/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    reschedulePertemuan: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { tanggal: string; ruanganId?: string | null; alasan: string; durasiMenit?: number } }) =>
        apiPost(`/dosen/pertemuan/${id}/reschedule`, body),
      onSuccess: inv,
    }),
    generatePin: useMutation({
      mutationFn: ({ id, durasiMenit }: { id: string; durasiMenit?: number }) =>
        apiPost<{ pin: string; expiresAt: string; dibuatPada: string }>(`/dosen/pertemuan/${id}/generate-pin`, { durasiMenit }),
    }),
    clearPin: useMutation({
      mutationFn: (id: string) => api(`/dosen/pertemuan/${id}/pin`, { method: 'DELETE' }),
    }),
    setAbsensi: useMutation({
      mutationFn: ({ pertemuanId: pid, items }: { pertemuanId: string; items: Array<{ mahasiswaId: string; status: AbsensiStatus; catatan?: string | null }> }) =>
        apiPost(`/dosen/pertemuan/${pid}/absensi`, { items }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Bimbingan Akademik
// ============================================================

export type Bimbingan = {
  semester: { kode: string; nama: string };
  items: Array<{
    id: string; nim: string; nama: string; angkatan: number;
    prodi: { kode: string; nama: string };
    krsStatus: 'kosong' | 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'campuran';
    krsTotal: number; krsSks: number;
    perluValidasi: boolean;
  }>;
};
export const useBimbingan = () => useApi<Bimbingan>(['bimbingan'], '/dosen/bimbingan');

export type BimbinganDetail = {
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
  semester: { kode: string };
  items: Array<{
    id: string; status: string; catatan: string | null;
    kelas: {
      kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
      hari: string | null; jamMulai: string | null; jamSelesai: string | null;
      ruangan: string | null; dosen: string;
    };
  }>;
  totalSks: number;
};
export const useBimbinganDetail = (mahasiswaId: string | undefined) =>
  useApi<BimbinganDetail>(['bimbingan', mahasiswaId, 'krs'], `/dosen/bimbingan/${mahasiswaId}/krs`, { enabled: !!mahasiswaId });

export function useValidasiKrs(mahasiswaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, catatan }: { action: 'setujui' | 'tolak'; catatan?: string }) =>
      apiPost(`/dosen/bimbingan/${mahasiswaId}/krs/validasi`, { action, catatan }),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['bimbingan'] }),
      qc.invalidateQueries({ queryKey: ['bimbingan', mahasiswaId] }),
    ]),
  });
}

// ============================================================
// Penelitian & Pengabdian
// ============================================================

export type DosenPenelitian = {
  id: string; judul: string; abstrak: string | null; tahun: number;
  sumberDana: string | null; jumlahDana: number | null; status: string;
  anggota: Array<{ id: string; peran: string; mahasiswa: { id: string; nim: string; nama: string } }>;
};
export const useDosenPenelitian = () =>
  useApi<{ items: DosenPenelitian[] }>(['dosen-penelitian'], '/dosen/penelitian');

export type DosenPengabdian = {
  id: string; judul: string; deskripsi: string | null; tahun: number;
  lokasi: string | null; sumberDana: string | null; jumlahDana: number | null; status: string;
  anggota: Array<{ id: string; peran: string; mahasiswa: { id: string; nim: string; nama: string } }>;
};
export const useDosenPengabdian = () =>
  useApi<{ items: DosenPengabdian[] }>(['dosen-pengabdian'], '/dosen/pengabdian');

export type KegiatanInput = {
  judul: string;
  tahun: number;
  sumberDana?: string;
  jumlahDana?: number;
  status?: 'proposal' | 'disetujui' | 'berjalan' | 'selesai' | 'ditolak';
  // penelitian
  abstrak?: string;
  // pengabdian
  deskripsi?: string;
  lokasi?: string;
};

export function usePenelitianActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['dosen-penelitian'] });
  return {
    create: useMutation({ mutationFn: (input: KegiatanInput) => apiPost('/dosen/penelitian', input), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: string) => api(`/dosen/penelitian/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addAnggota: useMutation({
      mutationFn: ({ id, nim, peran }: { id: string; nim: string; peran: string }) =>
        apiPost(`/dosen/penelitian/${id}/anggota`, { nim, peran }),
      onSuccess: inv,
    }),
    removeAnggota: useMutation({
      mutationFn: ({ id, anggotaId }: { id: string; anggotaId: string }) =>
        api(`/dosen/penelitian/${id}/anggota/${anggotaId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

export function usePengabdianActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['dosen-pengabdian'] });
  return {
    create: useMutation({ mutationFn: (input: KegiatanInput) => apiPost('/dosen/pengabdian', input), onSuccess: inv }),
    remove: useMutation({ mutationFn: (id: string) => api(`/dosen/pengabdian/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addAnggota: useMutation({
      mutationFn: ({ id, nim, peran }: { id: string; nim: string; peran: string }) =>
        apiPost(`/dosen/pengabdian/${id}/anggota`, { nim, peran }),
      onSuccess: inv,
    }),
    removeAnggota: useMutation({
      mutationFn: ({ id, anggotaId }: { id: string; anggotaId: string }) =>
        api(`/dosen/pengabdian/${id}/anggota/${anggotaId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// EWS — peringatan dini bimbingan DPA
// ============================================================
export type DosenEwsIndikator = {
  jenis: 'ipk' | 'sks_progres' | 'absensi' | 'tunggakan' | 'heregistrasi' | 'nilai_buruk';
  severity: 'tinggi' | 'sedang' | 'rendah';
  judul: string;
  detail: string;
  nilai: number | string;
  threshold: number | string;
  poin: number;
};
export type DosenEwsMahasiswa = {
  mahasiswaId: string;
  nim: string;
  nama: string;
  angkatan: number;
  status: string;
  prodi: { kode: string; nama: string };
  dpa: { id: string; nama: string } | null;
  semesterBerjalan: number;
  ipk: number;
  totalSks: number;
  skorRisiko: number;
  tingkat: 'tinggi' | 'sedang' | 'rendah' | 'aman';
  indikator: DosenEwsIndikator[];
};
export type DosenEwsList = {
  ringkasan: { total: number; tinggi: number; sedang: number; rendah: number };
  items: DosenEwsMahasiswa[];
};
export const useDosenEws = () => useApi<DosenEwsList>(['dosen-ews'], '/dosen/ews/bimbingan');
export const useDosenEwsMahasiswa = (mahasiswaId: string | undefined) =>
  useApi<DosenEwsMahasiswa>(['dosen-ews-mhs', mahasiswaId], `/dosen/ews/${mahasiswaId}`, { enabled: !!mahasiswaId });
