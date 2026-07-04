import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiPost } from './api';
import { useApi } from './queries';

// ============================================================
// Dashboard, Profil, Laporan
// ============================================================

export type AkademikDashboard = {
  semester: { kode: string; nama: string };
  mahasiswa: { aktif: number; lulus: number; cuti: number; total: number };
  totalDosen: number;
  totalProdi: number;
  totalMK: number;
  totalKelasSemester: number;
  krsPending: number;
  tagihanBelumLunas: number;
  totalTagihanBelum: number;
  pengumuman: Array<{ id: string; judul: string; isi: string; tanggal: string; isPenting: boolean }>;
};
export const useAkademikDashboard = () =>
  useApi<AkademikDashboard>(['akademik-dashboard'], '/akademik/dashboard');

export type AkademikProfil = {
  id: string; nama: string; nip: string | null; jabatan: string | null;
  user: { email: string };
};
export const useAkademikProfil = () =>
  useApi<AkademikProfil>(['akademik-profil'], '/akademik/profil');

export type Laporan = {
  semester: { kode: string; nama: string };
  prodi: Array<{ id: string; kode: string; nama: string; jenjang: string; fakultas: string }>;
  mahasiswaPerProdi: Array<{
    prodi: string; kode: string;
    aktif: number; cuti: number; lulus: number; drop_out: number; total: number;
  }>;
  mahasiswaPerAngkatan: Array<{ prodi: string; angkatan: number; jumlah: number }>;
  dosenPerProdi: Array<{
    prodi: string; kode: string;
    asisten_ahli: number; lektor: number; lektor_kepala: number; guru_besar: number; tenaga_pengajar: number; total: number;
  }>;
  krsSemester: Record<string, number>;
  nilaiSelesai: number;
};
export const useLaporan = () => useApi<Laporan>(['laporan'], '/akademik/laporan');

// ============================================================
// Mahasiswa CRUD
// ============================================================

export type AdminMahasiswa = {
  id: string; nim: string; nama: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null; tanggalLahir: string | null;
  alamat: string | null; telepon: string | null;
  angkatan: number; status: string;
  user: { email: string; isActive: boolean };
  prodi: { kode: string; nama: string };
  dpa: { id: string; nama: string } | null;
  kategoriUkt: { id: string; kode: string; nama: string; nominalSemester: number } | null;
  defaultCicilanUkt: number;
  // PDDikti biodata (Phase 1)
  nik: string | null;
  nisn: string | null;
  npsn: string | null;
  namaSekolahAsal: string | null;
  jenisSekolahAsal: string | null;
  tahunLulusSekolah: number | null;
  kewarganegaraan: string | null;
  kodeWilayahAlamat: string | null;
  pembiayaan: string | null;
  kebutuhanKhusus: string | null;
  semesterAwal: string | null;
  agamaKode: number | null;
  jenisTinggalKode: number | null;
  alatTransportasiKode: number | null;
  jalurMasukKode: string | null;
};
export const useAdminMahasiswa = (filters: { q?: string; prodiId?: string; angkatan?: number; status?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.angkatan) qs.set('angkatan', filters.angkatan.toString());
  if (filters.status) qs.set('status', filters.status);
  return useApi<{ items: AdminMahasiswa[] }>(['admin-mhs', qs.toString()], `/akademik/mahasiswa?${qs}`);
};

export type CreateMahasiswaInput = {
  nim: string; nama: string; email: string; password?: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string; tanggalLahir?: string; alamat?: string; telepon?: string;
  angkatan: number; prodiId: string; dpaId?: string;
  kategoriUktId?: string | null;
  defaultCicilanUkt?: number;
  status?: string;
  // PDDikti biodata (Phase 1)
  nik?: string | null;
  nisn?: string | null;
  npsn?: string | null;
  namaSekolahAsal?: string | null;
  jenisSekolahAsal?: string | null;
  tahunLulusSekolah?: number | null;
  kewarganegaraan?: string | null;
  kodeWilayahAlamat?: string | null;
  pembiayaan?: string | null;
  kebutuhanKhusus?: string | null;
  semesterAwal?: string | null;
  agamaKode?: number | null;
  jenisTinggalKode?: number | null;
  alatTransportasiKode?: number | null;
  jalurMasukKode?: string | null;
};

// PDDikti reference tables (agama, jenis tinggal, alat transportasi, jalur masuk).
export type PddiktiRefs = {
  agama: Array<{ kode: number; nama: string }>;
  jenisTinggal: Array<{ kode: number; nama: string }>;
  alatTransportasi: Array<{ kode: number; nama: string }>;
  jalurMasuk: Array<{ kode: string; nama: string }>;
};
export const usePddiktiRefs = () =>
  useApi<PddiktiRefs>(['pddikti-refs'], '/akademik/pddikti/refs');

// Orang tua / wali mahasiswa.
export type OrangTuaJenis = 'ayah' | 'ibu' | 'wali';
export type OrangTuaItem = {
  id: string; mahasiswaId: string;
  jenis: OrangTuaJenis;
  nama: string;
  nik: string | null;
  tahunLahir: number | null;
  pendidikan: string | null;
  pekerjaan: string | null;
  penghasilan: number | null;
};
export type OrangTuaInput = {
  jenis: OrangTuaJenis;
  nama: string;
  nik?: string | null;
  tahunLahir?: number | null;
  pendidikan?: string | null;
  pekerjaan?: string | null;
  penghasilan?: number | null;
};
export const useMahasiswaOrangTua = (mahasiswaId?: string) =>
  useApi<{ items: OrangTuaItem[] }>(
    ['mhs-orang-tua', mahasiswaId ?? ''],
    `/akademik/mahasiswa/${mahasiswaId}/orang-tua`,
    { enabled: Boolean(mahasiswaId) },
  );

export function useOrangTuaActions(mahasiswaId?: string) {
  const qc = useQueryClient();
  return {
    save: useMutation({
      mutationFn: (items: OrangTuaInput[]) =>
        api(`/akademik/mahasiswa/${mahasiswaId}/orang-tua`, {
          method: 'PUT',
          body: JSON.stringify({ items }),
        }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['mhs-orang-tua', mahasiswaId ?? ''] }),
    }),
  };
}

export function useMahasiswaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-mhs'] });
  return {
    create: useMutation({ mutationFn: (input: CreateMahasiswaInput) => apiPost('/akademik/mahasiswa', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateMahasiswaInput> }) =>
        api(`/akademik/mahasiswa/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/mahasiswa/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    resetPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password?: string }) =>
        apiPost(`/akademik/mahasiswa/${id}/reset-password`, password ? { password } : {}),
    }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResult>('/akademik/mahasiswa/import', { rows }),
      onSuccess: inv,
    }),
  };
}

export type ImportResult = {
  totalRows: number;
  created: number;
  failed: number;
  results: Array<{ row: number; nim: string | null; status: 'created' | 'failed'; message?: string }>;
};

// ============================================================
// Dosen CRUD
// ============================================================

export type AdminDosen = {
  id: string; nidn: string; nama: string;
  gelarDepan: string | null; gelarBelakang: string | null;
  jabatanFungsional: string | null; jabatanStruktural: string | null;
  isDpa: boolean;
  user: { email: string };
  prodi: { kode: string; nama: string };
  _count: { kelas: number; mahasiswaBimbingan: number };
};
export const useAdminDosen = (filters: { q?: string; prodiId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  return useApi<{ items: AdminDosen[] }>(['admin-dosen', qs.toString()], `/akademik/dosen?${qs}`);
};

export type CreateDosenInput = {
  nidn: string; nama: string; email: string; password?: string;
  gelarDepan?: string; gelarBelakang?: string;
  prodiId: string;
  jabatanFungsional?: string; jabatanStruktural?: string;
  isDpa?: boolean;
};

export function useDosenActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-dosen'] });
  return {
    create: useMutation({ mutationFn: (input: CreateDosenInput) => apiPost('/akademik/dosen', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateDosenInput> }) =>
        api(`/akademik/dosen/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/dosen/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    resetPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password?: string }) =>
        apiPost(`/akademik/dosen/${id}/reset-password`, password ? { password } : {}),
    }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResultKey>('/akademik/dosen/import', { rows }),
      onSuccess: inv,
    }),
  };
}
export type ImportResultKey = {
  totalRows: number;
  created: number;
  failed: number;
  results: Array<{ row: number; key: string | null; status: 'created' | 'failed'; message?: string }>;
};

// ============================================================
// Master kurikulum (Prodi, MK, Kelas, Ruangan)
// ============================================================

export type Fakultas = { id: string; kode: string; nama: string; _count?: { prodi: number } };
export const useFakultas = () => useApi<{ items: Fakultas[] }>(['fakultas'], '/akademik/fakultas');

export type FakultasInput = { kode: string; nama: string };
export function useFakultasActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['fakultas'] });
    qc.invalidateQueries({ queryKey: ['prodi'] });
  };
  return {
    create: useMutation({ mutationFn: (body: FakultasInput) => apiPost<Fakultas>('/akademik/fakultas', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<FakultasInput> }) =>
        api(`/akademik/fakultas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/fakultas/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResultKey>('/akademik/fakultas/import', { rows }),
      onSuccess: inv,
    }),
  };
}

export type Prodi = {
  id: string; kode: string; nama: string; jenjang: string;
  tarifSppDefault: number | null;
  tarifUangPangkal: number | null;
  fakultas: { kode: string; nama: string };
  _count: { mahasiswa: number; dosen: number; mataKuliah: number };
};
export const useProdi = () => useApi<{ items: Prodi[] }>(['prodi'], '/akademik/prodi');

/**
 * Read-only prodi list utk dropdown — dapat diakses semua sub-role
 * akademik (termasuk keuangan/spmi). Endpoint `/akademik/ref/prodi`.
 */
export type ProdiRef = {
  id: string; kode: string; nama: string; jenjang: string;
  fakultas: { kode: string; nama: string };
};
export const useProdiRef = () => useApi<{ items: ProdiRef[] }>(['prodi-ref'], '/akademik/ref/prodi');

/**
 * Read-only dosen list utk dropdown — dapat diakses semua sub-role.
 * Endpoint `/akademik/ref/dosen`.
 */
export type DosenRef = {
  id: string; nidn: string; nama: string;
  gelarDepan: string | null; gelarBelakang: string | null;
  prodi: { kode: string; nama: string };
};
export const useDosenRef = () => useApi<{ items: DosenRef[] }>(['dosen-ref'], '/akademik/ref/dosen');

export type ProdiInput = {
  kode: string; nama: string; jenjang: 'd3' | 'd4' | 's1' | 's2' | 's3' | 'profesi';
  fakultasId: string;
  tarifSppDefault?: number | null;
  tarifUangPangkal?: number | null;
};
export function useProdiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['prodi'] });
  return {
    create: useMutation({ mutationFn: (body: ProdiInput) => apiPost<Prodi>('/akademik/prodi', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<ProdiInput> }) =>
        api(`/akademik/prodi/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/prodi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResultKey>('/akademik/prodi/import', { rows }),
      onSuccess: inv,
    }),
  };
}

export type KategoriUkt = {
  id: string; prodiId: string; kode: string; nama: string;
  nominalSemester: number; deskripsi: string | null; isAktif: boolean;
  prodi: { kode: string; nama: string };
  _count: { mahasiswa: number };
};
export type KategoriUktInput = {
  prodiId: string; kode: string; nama: string;
  nominalSemester: number; deskripsi?: string; isAktif?: boolean;
};
export const useKategoriUkt = (prodiId?: string) => {
  const qs = prodiId ? `?prodiId=${prodiId}` : '';
  return useApi<{ items: KategoriUkt[] }>(['kategori-ukt', prodiId ?? ''], `/akademik/kategori-ukt${qs}`);
};
export function useKategoriUktActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['kategori-ukt'] });
  return {
    create: useMutation({ mutationFn: (input: KategoriUktInput) => apiPost('/akademik/kategori-ukt', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<KategoriUktInput> }) =>
        api(`/akademik/kategori-ukt/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/kategori-ukt/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export const KELOMPOK_MATKUL = ['MKWU', 'MKDK', 'MKWK', 'MKK', 'MKB', 'MPK'] as const;
export type KelompokMatkul = typeof KELOMPOK_MATKUL[number];
export type Mk = {
  id: string; kode: string; nama: string; namaInggris: string | null;
  sks: number; sksTeori: number; sksPraktik: number; jenis: string;
  kelompokMatkul?: KelompokMatkul | null;
  prodi: { kode: string; nama: string };
};
export const useMataKuliah = (filters: { q?: string; prodiId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  return useApi<{ items: Mk[] }>(['mata-kuliah', qs.toString()], `/akademik/mata-kuliah?${qs}`);
};

export type MkInput = {
  kode: string; nama: string; namaInggris?: string;
  sks: number; sksTeori?: number; sksPraktik?: number;
  jenis?: 'wajib_universitas' | 'wajib_prodi' | 'pilihan';
  kelompokMatkul?: KelompokMatkul | null;
  prodiId: string;
};
export function useMkActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['mata-kuliah'] });
  return {
    create: useMutation({ mutationFn: (input: MkInput) => apiPost('/akademik/mata-kuliah', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<MkInput> }) =>
        api(`/akademik/mata-kuliah/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/mata-kuliah/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<MkImportResult>('/akademik/mata-kuliah/import', { rows }),
      onSuccess: inv,
    }),
  };
}
export type MkImportResult = {
  totalRows: number;
  created: number;
  failed: number;
  results: Array<{ row: number; kode: string | null; status: 'created' | 'failed'; message?: string }>;
};

export type Ruangan = { id: string; kode: string; nama: string; gedung: string | null; lantai: number | null; kapasitas: number };
export const useRuangan = () => useApi<{ items: Ruangan[] }>(['ruangan'], '/akademik/ruangan');

export type RuanganInput = { kode: string; nama: string; gedung?: string; lantai?: number; kapasitas?: number };
export function useRuanganActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['ruangan'] });
  return {
    create: useMutation({ mutationFn: (input: RuanganInput) => apiPost('/akademik/ruangan', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<RuanganInput> }) =>
        api(`/akademik/ruangan/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/ruangan/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResultKey>('/akademik/ruangan/import', { rows }),
      onSuccess: inv,
    }),
  };
}

export type Kelas = {
  id: string;
  mataKuliahId: string;
  semesterId: string;
  dosenId: string;
  ruanganId: string | null;
  kodeKelas: string;
  kapasitas: number;
  hari: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  mataKuliah: { kode: string; nama: string; sks: number; prodi: { kode: string; nama: string } };
  dosen: { nidn: string; nama: string; gelarDepan: string | null; gelarBelakang: string | null; prodi: { kode: string; nama: string } };
  ruangan: { kode: string } | null;
  semester: { kode: string; jenis: string; tahunAjaran: { kode: string } };
  _count: { krs: number };
};
export const useKelasAdmin = (filters: { semesterId?: string; dosenId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.dosenId) qs.set('dosenId', filters.dosenId);
  return useApi<{ items: Kelas[] }>(['admin-kelas', qs.toString()], `/akademik/kelas?${qs}`);
};

export type KelasInput = {
  mataKuliahId: string; semesterId: string; dosenId: string;
  ruanganId?: string | null;
  kodeKelas: string;
  kapasitas?: number;
  hari?: 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu' | null;
  jamMulai?: string | null;
  jamSelesai?: string | null;
};
export function useKelasActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-kelas'] });
  return {
    create: useMutation({ mutationFn: (input: KelasInput) => apiPost('/akademik/kelas', input), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<KelasInput> }) =>
        api(`/akademik/kelas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/kelas/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    importCsv: useMutation({
      mutationFn: (rows: Array<Record<string, string>>) =>
        apiPost<ImportResultKey>('/akademik/kelas/import', { rows }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Team teaching — anggota dosen per kelas
// ============================================================

export type KelasTeamItem = {
  id: string;
  dosenId: string;
  nidn: string;
  nama: string;
  gelarDepan: string | null;
  gelarBelakang: string | null;
  prodi?: { kode: string; nama: string };
  peran: 'lead' | 'anggota' | 'asisten';
};

export const useKelasTeam = (kelasId: string | null) =>
  useApi<{ items: KelasTeamItem[] }>(['admin-kelas-team', kelasId ?? ''], `/akademik/kelas/${kelasId}/dosen`, { enabled: !!kelasId });

export function useKelasTeamActions(kelasId: string | null) {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['admin-kelas-team', kelasId ?? ''] });
    qc.invalidateQueries({ queryKey: ['admin-kelas'] });
  };
  return {
    add: useMutation({
      mutationFn: (input: { dosenId: string; peran: KelasTeamItem['peran'] }) =>
        apiPost(`/akademik/kelas/${kelasId}/dosen`, input),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ dosenId, peran }: { dosenId: string; peran: KelasTeamItem['peran'] }) =>
        api(`/akademik/kelas/${kelasId}/dosen/${dosenId}`, { method: 'PATCH', body: JSON.stringify({ peran }) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (dosenId: string) =>
        api(`/akademik/kelas/${kelasId}/dosen/${dosenId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Surat akademik
// ============================================================

export type AdminSuratItem = {
  id: string;
  jenis: string;
  judul: string;
  keperluan: string;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'selesai' | 'batal';
  catatan: string | null;
  nomorSurat: string | null;
  tanggalDiajukan: string;
  tanggalDisetujui: string | null;
  tanggalSelesai: string | null;
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
};

export const useAdminSurat = (filters: { status?: string; jenis?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.jenis) qs.set('jenis', filters.jenis);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: AdminSuratItem[] }>(['admin-surat', qs.toString()], `/akademik/surat?${qs}`);
};

// ============================================================
// Skala Nilai — konfigurasi global threshold + bobot huruf
// ============================================================
export type SlotKey = 'A' | 'AB' | 'B' | 'BC' | 'C' | 'D' | 'E';
export type SkalaRow = {
  slot: SlotKey;
  huruf: string;     // display label, default = slot key
  minNilai: number;
  bobot: number;
};
export type SkalaNilaiResp = { skala: SkalaRow[] };
export type SkalaNilaiBody = {
  minA: number; minAB: number; minB: number; minBC: number; minC: number; minD: number;
  bobotA: number; bobotAB: number; bobotB: number; bobotBC: number; bobotC: number; bobotD: number; bobotE: number;
  hurufA?: string; hurufAB?: string; hurufB?: string; hurufBC?: string; hurufC?: string; hurufD?: string; hurufE?: string;
};
export type RecomputeResult = { scanned: number; changed: number; message: string };

export const useAdminSkalaNilai = () =>
  useApi<SkalaNilaiResp>(['admin-skala-nilai'], '/akademik/skala-nilai');

export function useAdminSkalaNilaiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-skala-nilai'] });
  return {
    save: useMutation({
      mutationFn: (body: SkalaNilaiBody) =>
        api('/akademik/skala-nilai', { method: 'PUT', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    reset: useMutation({
      mutationFn: () => apiPost<SkalaNilaiResp>('/akademik/skala-nilai/reset', {}),
      onSuccess: inv,
    }),
    recompute: useMutation({
      mutationFn: (status: 'all' | 'finalized' | 'draft' | 'belum' = 'all') =>
        apiPost<RecomputeResult>('/akademik/skala-nilai/recompute', { status }),
    }),
  };
}

export type AdminSuratDetail = {
  id: string;
  jenis: string;
  judul: string;
  keperluan: string;
  status: 'diajukan' | 'disetujui' | 'ditolak' | 'selesai' | 'batal';
  catatan: string | null;
  nomorSurat: string | null;
  tanggalDiajukan: string;
  tanggalDisetujui: string | null;
  tanggalSelesai: string | null;
  mahasiswa: {
    id: string; nim: string; nama: string;
    tempatLahir: string | null; tanggalLahir: string | null;
    angkatan: number; jenisKelamin: 'L' | 'P' | null;
    prodi: { kode: string; nama: string; fakultas: { nama: string } };
  };
};
export const useAdminSuratDetail = (id: string | undefined) =>
  useApi<AdminSuratDetail>(['admin-surat-detail', id], `/akademik/surat/${id}`, { enabled: !!id });

export function useAdminSuratActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-surat'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: { status?: AdminSuratItem['status']; catatan?: string | null; nomorSurat?: string | null } }) =>
        api(`/akademik/surat/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Beasiswa akademik
// ============================================================

export type BeasiswaMasterItem = {
  id: string;
  kode: string;
  nama: string;
  penyelenggara: string;
  deskripsi: string | null;
  kuota: number | null;
  nominal: number;
  syaratIpk: number | null;
  syaratAngkatanMin: number | null;
  syaratAngkatanMax: number | null;
  pendaftaranBuka: boolean;
  tanggalBuka: string | null;
  tanggalTutup: string | null;
  jumlahPendaftar: number;
};
export type BeasiswaMasterInput = {
  kode: string; nama: string; penyelenggara: string;
  deskripsi?: string | null;
  kuota?: number | null;
  nominal: number;
  syaratIpk?: number | null;
  syaratAngkatanMin?: number | null;
  syaratAngkatanMax?: number | null;
  pendaftaranBuka?: boolean;
  tanggalBuka?: string | null;
  tanggalTutup?: string | null;
};
export const useAdminBeasiswa = () =>
  useApi<{ items: BeasiswaMasterItem[] }>(['admin-beasiswa'], '/akademik/beasiswa');

export function useAdminBeasiswaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-beasiswa'] });
  return {
    create: useMutation({ mutationFn: (body: BeasiswaMasterInput) => apiPost('/akademik/beasiswa', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<BeasiswaMasterInput> }) =>
        api(`/akademik/beasiswa/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/beasiswa/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type AdminPendaftarBeasiswaItem = {
  id: string;
  status: 'diajukan' | 'dalam_seleksi' | 'diterima' | 'ditolak' | 'batal';
  catatan: string | null;
  motivasi: string;
  linkDokumen: string | null;
  ipkSaatDaftar: number;
  semesterSaatDaftar: string;
  createdAt: string;
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
};
export const useAdminPendaftarBeasiswa = (beasiswaId: string | undefined, status?: string) => {
  const qs = status ? `?status=${status}` : '';
  return useApi<{ items: AdminPendaftarBeasiswaItem[] }>(['admin-pendaftar-beasiswa', beasiswaId, status], `/akademik/beasiswa/${beasiswaId}/pendaftar${qs}`, { enabled: !!beasiswaId });
};

export function useAdminPendaftarBeasiswaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-pendaftar-beasiswa'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: { status?: AdminPendaftarBeasiswaItem['status']; catatan?: string | null } }) =>
        api(`/akademik/beasiswa/pendaftaran/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Periode Wisuda + Yudisium akademik
// ============================================================

export type PeriodeWisudaItem = {
  id: string;
  kode: string;
  nama: string;
  tanggal: string;
  isPendaftaranBuka: boolean;
  batasIpk: number | null;
  batasSks: number | null;
  _count: { yudisium: number };
};
export type PeriodeWisudaInput = {
  kode: string;
  nama: string;
  tanggal: string;
  isPendaftaranBuka?: boolean;
  batasIpk?: number | null;
  batasSks?: number | null;
};
export const usePeriodeWisuda = () =>
  useApi<{ items: PeriodeWisudaItem[] }>(['periode-wisuda'], '/akademik/periode-wisuda');

export function usePeriodeWisudaActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['periode-wisuda'] });
  return {
    create: useMutation({ mutationFn: (body: PeriodeWisudaInput) => apiPost('/akademik/periode-wisuda', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<PeriodeWisudaInput> }) =>
        api(`/akademik/periode-wisuda/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/periode-wisuda/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}

export type AdminYudisiumItem = {
  id: string;
  status: 'pendaftaran' | 'verifikasi' | 'layak' | 'tidak_layak' | 'wisuda' | 'batal';
  ipk: number;
  sksLulus: number;
  predikat: 'cumlaude' | 'sangat_memuaskan' | 'memuaskan' | 'tidak_lulus' | null;
  catatan: string | null;
  noIjazah: string | null;
  noSkl: string | null;
  tanggalLulus: string | null;
  verifikasiToken: string | null;
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string } };
  periodeWisuda: { id: string; kode: string; nama: string; tanggal: string };
};

export const useAdminYudisium = (filters: { status?: string; periodeWisudaId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.periodeWisudaId) qs.set('periodeWisudaId', filters.periodeWisudaId);
  return useApi<{ items: AdminYudisiumItem[] }>(['admin-yudisium', qs.toString()], `/akademik/yudisium?${qs}`);
};

export function useAdminYudisiumActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-yudisium'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{
        status: AdminYudisiumItem['status'];
        predikat: AdminYudisiumItem['predikat'] | null;
        catatan: string | null; noIjazah: string | null; noSkl: string | null; tanggalLulus: string | null;
      }> }) => api(`/akademik/yudisium/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    regenToken: useMutation({
      mutationFn: (id: string) =>
        apiPost<{ verifikasiToken: string }>(`/akademik/yudisium/${id}/regen-token`, {}),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Skripsi akademik
// ============================================================

export type AdminSkripsiItem = {
  id: string;
  judul: string;
  abstrak: string | null;
  topik: string | null;
  status: 'diajukan' | 'disetujui' | 'proposal' | 'penelitian' | 'sidang' | 'lulus' | 'ditolak' | 'batal';
  catatan: string | null;
  tanggalAjuan: string;
  tanggalDisetujui: string | null;
  tanggalSidang: string | null;
  nilaiHuruf: string | null;
  linkDokumen: string | null;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
  pembimbing1: { id: string; nidn: string; nama: string } | null;
  pembimbing2: { id: string; nidn: string; nama: string } | null;
};

export const useAdminSkripsi = (filters: { status?: string; prodiId?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: AdminSkripsiItem[] }>(['admin-skripsi', qs.toString()], `/akademik/skripsi?${qs}`);
};

export type AdminSkripsiPatch = Partial<{
  pembimbing1Id: string | null;
  pembimbing2Id: string | null;
  status: AdminSkripsiItem['status'];
  catatan: string | null;
  topik: string | null;
  tanggalSidang: string | null;
  nilaiHuruf: string | null;
}>;

export function useAdminSkripsiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-skripsi'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: AdminSkripsiPatch }) =>
        api(`/akademik/skripsi/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/skripsi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// EDOM akademik
// ============================================================

export type EdomKuesionerItem = {
  id: string; judul: string; isAktif: boolean; semesterId: string;
  semester: { kode: string; jenis: string };
  _count: { aspek: number; response: number };
};
export const useEdomKuesionerList = () =>
  useApi<{ items: EdomKuesionerItem[] }>(['edom-kuesioner'], '/akademik/edom/kuesioner');

export type EdomAspek = { id: string; urutan: number; pertanyaan: string; createdAt?: string };

export type EdomKuesionerDetail = {
  id: string; judul: string; isAktif: boolean; semesterId: string;
  semester: { kode: string; jenis: string };
  aspek: EdomAspek[];
};
export const useEdomKuesionerDetail = (id: string | undefined) =>
  useApi<EdomKuesionerDetail>(['edom-kuesioner', id], `/akademik/edom/kuesioner/${id}`, { enabled: !!id });

export type EdomRekap = {
  kuesioner: { id: string; judul: string };
  aspek: Array<{ id: string; urutan: number; pertanyaan: string }>;
  items: Array<{
    kelasId: string;
    kodeMK: string; namaMK: string; kodeKelas: string;
    dosen: { id: string; nidn: string; nama: string };
    totalResponse: number;
    peserta: number;
    responseRate: number;
    rataAspek: Record<string, number>;
    rataAgregat: number;
  }>;
};
export const useEdomRekap = (kuesionerId: string | undefined) =>
  useApi<EdomRekap>(['edom-rekap', kuesionerId], `/akademik/edom/kuesioner/${kuesionerId}/rekap`, { enabled: !!kuesionerId });

export function useEdomAkademikActions() {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['edom-kuesioner'] }),
    qc.invalidateQueries({ queryKey: ['edom-rekap'] }),
  ]);
  return {
    createKuesioner: useMutation({
      mutationFn: (body: { judul: string; semesterId: string }) => apiPost('/akademik/edom/kuesioner', body),
      onSuccess: inv,
    }),
    updateKuesioner: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: { judul?: string; isAktif?: boolean } }) =>
        api(`/akademik/edom/kuesioner/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    deleteKuesioner: useMutation({
      mutationFn: (id: string) => api(`/akademik/edom/kuesioner/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addAspek: useMutation({
      mutationFn: ({ kuesionerId, pertanyaan }: { kuesionerId: string; pertanyaan: string }) =>
        apiPost(`/akademik/edom/kuesioner/${kuesionerId}/aspek`, { pertanyaan }),
      onSuccess: inv,
    }),
    deleteAspek: useMutation({
      mutationFn: (aspekId: string) => api(`/akademik/edom/aspek/${aspekId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// MBKM akademik (list + edit + konversi)
// ============================================================

export type AdminMbkmItem = {
  id: string;
  jenis: string;
  namaProgram: string; mitra: string; lokasi: string | null;
  periode: string;
  tanggalMulai: string | null; tanggalSelesai: string | null;
  status: 'pengajuan' | 'disetujui' | 'berjalan' | 'selesai' | 'ditolak';
  catatan: string | null;
  linkProposal: string | null; linkLaporan: string | null; linkSertifikat: string | null;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
  dpl: { id: string; nidn: string; nama: string } | null;
  konversi: Array<{ id: string; mataKuliahId: string; kodeMK: string; namaMK: string; sks: number; nilaiHuruf: string | null; bobot: number | null }>;
  totalSksKonversi: number;
};
export type AdminMbkmList = { items: AdminMbkmItem[]; periodeList: string[] };

export const useAdminMbkm = (filters: { periode?: string; status?: string; jenis?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.periode) qs.set('periode', filters.periode);
  if (filters.status) qs.set('status', filters.status);
  if (filters.jenis) qs.set('jenis', filters.jenis);
  return useApi<AdminMbkmList>(['admin-mbkm', qs.toString()], `/akademik/mbkm?${qs}`);
};

export function useAdminMbkmActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-mbkm'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{
        dplDosenId: string | null; tanggalMulai: string | null; tanggalSelesai: string | null;
        status: AdminMbkmItem['status']; catatan: string | null; lokasi: string | null;
      }> }) => api(`/akademik/mbkm/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/mbkm/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addKonversi: useMutation({
      mutationFn: ({ id, mataKuliahId, nilaiHuruf }: { id: string; mataKuliahId: string; nilaiHuruf?: string }) =>
        apiPost(`/akademik/mbkm/${id}/konversi`, { mataKuliahId, nilaiHuruf }),
      onSuccess: inv,
    }),
    setNilai: useMutation({
      mutationFn: ({ id, konversiId, nilaiHuruf }: { id: string; konversiId: string; nilaiHuruf: string }) =>
        api(`/akademik/mbkm/${id}/konversi/${konversiId}`, { method: 'PATCH', body: JSON.stringify({ nilaiHuruf }) }),
      onSuccess: inv,
    }),
    removeKonversi: useMutation({
      mutationFn: ({ id, konversiId }: { id: string; konversiId: string }) =>
        api(`/akademik/mbkm/${id}/konversi/${konversiId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// KKN akademik (list + edit)
// ============================================================

export type AdminKknItem = {
  id: string;
  periode: string;
  lokasi: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  status: 'pendaftaran' | 'ditugaskan' | 'berjalan' | 'selesai';
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  nilai: string | null;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
  dpl: { id: string; nidn: string; nama: string } | null;
};
export type AdminKknList = { items: AdminKknItem[]; periodeList: string[] };

export const useAdminKkn = (filters: { periode?: string; status?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.periode) qs.set('periode', filters.periode);
  if (filters.status) qs.set('status', filters.status);
  return useApi<AdminKknList>(['admin-kkn', qs.toString()], `/akademik/kkn?${qs}`);
};

export type AdminKknPatch = Partial<{
  lokasi: string; desa: string | null; kecamatan: string | null; kabupaten: string | null;
  dplDosenId: string | null;
  tanggalMulai: string | null; tanggalSelesai: string | null;
  nilai: string | null;
  status: 'pendaftaran' | 'ditugaskan' | 'berjalan' | 'selesai';
}>;
export function useAdminKknActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-kkn'] });
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: AdminKknPatch }) =>
        api(`/akademik/kkn/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/kkn/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Pengumuman akademik (CRUD)
// ============================================================

export type Pengumuman = {
  id: string;
  judul: string;
  isi: string;
  target: string; // "all" | "mahasiswa" | "dosen" | "prodi:<id>"
  pengirim: string | null;
  isPenting: boolean;
  tanggal: string;
  createdAt: string;
  updatedAt: string;
};
export type PengumumanInput = {
  judul: string;
  isi: string;
  target: string;
  pengirim?: string | null;
  isPenting?: boolean;
  tanggal?: string | null;
};
export const usePengumumanAkademik = () =>
  useApi<{ items: Pengumuman[] }>(['pengumuman-akademik'], '/akademik/pengumuman');

export function usePengumumanActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['pengumuman-akademik'] });
  return {
    create: useMutation({
      mutationFn: (body: PengumumanInput) => apiPost('/akademik/pengumuman', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<PengumumanInput> }) =>
        api(`/akademik/pengumuman/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/pengumuman/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Laporan kehadiran
// ============================================================

export type LaporanKehadiran = {
  semester: { id: string };
  threshold: number;
  ringkasan: {
    totalKelas: number;
    totalPertemuan: number;
    totalAbsensiSemua: number;
    persentaseGlobal: number | null;
    totalKritis: number;
  };
  items: Array<{
    kelasId: string;
    kodeMK: string; namaMK: string; kodeKelas: string;
    prodi: { kode: string; nama: string };
    dosen: string;
    totalPertemuan: number;
    totalPeserta: number;
    totalAbsensiTerisi: number;
    ringkasan: { hadir: number; izin: number; sakit: number; alpa: number };
    persentaseRata: number | null;
    kritis: number;
  }>;
};
export const useLaporanKehadiran = (filters: { prodiId?: string; semesterId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  return useApi<LaporanKehadiran>(['laporan-kehadiran', qs.toString()], `/akademik/laporan/kehadiran?${qs}`);
};

export type LaporanHonorDosen = {
  periode: { tanggalMulai: string; tanggalSelesai: string };
  ringkasan: {
    totalDosen: number;
    totalKelas: number;
    totalPertemuan: number;
    totalSksPertemuan: number;
  };
  items: Array<{
    dosen: { id: string; nidn: string; nama: string; gelarLengkap: string; jabatan: string | null };
    totalKelas: number;
    totalPertemuan: number;
    totalSksPertemuan: number;
    kelas: Array<{
      kelasId: string;
      kodeMK: string; namaMK: string; kodeKelas: string;
      sks: number;
      semesterKode: string;
      prodi: { kode: string; nama: string };
      pertemuan: Array<{
        id: string; pertemuanKe: number; tanggal: string; topik: string | null; jumlahPeserta: number;
      }>;
    }>;
  }>;
};

export const useLaporanHonorDosen = (filters: { tanggalMulai?: string; tanggalSelesai?: string; dosenId?: string; prodiId?: string }) => {
  const qs = new URLSearchParams();
  if (filters.tanggalMulai) qs.set('tanggalMulai', filters.tanggalMulai);
  if (filters.tanggalSelesai) qs.set('tanggalSelesai', filters.tanggalSelesai);
  if (filters.dosenId) qs.set('dosenId', filters.dosenId);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  return useApi<LaporanHonorDosen>(
    ['laporan-honor-dosen', qs.toString()],
    `/akademik/laporan/honor-dosen?${qs}`,
    { enabled: !!filters.tanggalMulai && !!filters.tanggalSelesai },
  );
};

// ============================================================
// Periode (TA + Semester)
// ============================================================

export type Periode = {
  items: Array<{
    id: string; kode: string; nama: string; tahunMulai: number; tahunSelesai: number; isAktif: boolean;
    semester: Array<{
      id: string; kode: string; jenis: string; isAktif: boolean;
      krsMulai: string | null; krsSelesai: string | null;
      prsMulai: string | null; prsSelesai: string | null;
      nilaiMulai: string | null; nilaiSelesai: string | null;
    }>;
  }>;
};
export const usePeriode = () => useApi<Periode>(['periode'], '/akademik/periode');

/**
 * Read-only periode list utk dropdown semester — dapat diakses semua
 * sub-role akademik. Bentuk sama dgn usePeriode. Endpoint `/akademik/ref/periode`.
 */
export const usePeriodeRef = () => useApi<Periode>(['periode-ref'], '/akademik/ref/periode');

// ============================================================
// Akreditasi dashboard
// ============================================================

export type AkreditasiData = {
  ringkasan: {
    totalMahasiswa: number;
    totalDosen: number;
    totalProdi: number;
    rasioDosenMahasiswa: number | null;
    ipkRataRata: number | null;
    masaStudiRataRataBulan: number | null;
    edomRataRata: number | null;
    tingkatKelulusanPersen: number;
  };
  statusBreakdown: Record<string, number>;
  perProdi: Array<{
    prodi: { id: string; kode: string; nama: string; fakultas: { kode: string; nama: string } };
    totalMhs: number;
    totalDosen: number;
    rasioDosenMhs: number | null;
    ipkRataRata: number | null;
    masaStudiRataRataBulan: number | null;
    edomRataRata: number | null;
    statusBreakdown: Record<string, number>;
  }>;
};

export const useAkreditasi = (prodiId?: string) => {
  const qs = prodiId ? `?prodiId=${prodiId}` : '';
  return useApi<AkreditasiData>(['akreditasi', prodiId ?? ''], `/akademik/akreditasi${qs}`);
};

export function usePeriodeActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['periode'] });
    qc.invalidateQueries({ queryKey: ['akademik-dashboard'] });
  };
  return {
    // Tahun Ajaran
    createTa: useMutation({
      mutationFn: (body: { kode: string; nama: string; tahunMulai: number; tahunSelesai: number }) =>
        apiPost('/akademik/periode/tahun-ajaran', body),
      onSuccess: inv,
    }),
    updateTa: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<{ kode: string; nama: string; tahunMulai: number; tahunSelesai: number }> }) =>
        api(`/akademik/periode/tahun-ajaran/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    aktifkanTa: useMutation({
      mutationFn: (id: string) => apiPost(`/akademik/periode/tahun-ajaran/${id}/aktifkan`, {}),
      onSuccess: inv,
    }),
    removeTa: useMutation({
      mutationFn: (id: string) => api(`/akademik/periode/tahun-ajaran/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    // Semester
    createSemester: useMutation({
      mutationFn: (body: {
        kode: string; jenis: 'ganjil' | 'genap' | 'pendek'; tahunAjaranId: string;
        krsMulai?: string | null; krsSelesai?: string | null;
        prsMulai?: string | null; prsSelesai?: string | null;
        nilaiMulai?: string | null; nilaiSelesai?: string | null;
      }) => apiPost('/akademik/periode/semester', body),
      onSuccess: inv,
    }),
    aktifkan: useMutation({
      mutationFn: (semesterId: string) => apiPost(`/akademik/periode/semester/${semesterId}/aktifkan`, {}),
      onSuccess: inv,
    }),
    updateSemester: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{ krsMulai: string; krsSelesai: string; prsMulai: string; prsSelesai: string; nilaiMulai: string; nilaiSelesai: string }> }) =>
        api(`/akademik/periode/semester/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    removeSemester: useMutation({
      mutationFn: (id: string) => api(`/akademik/periode/semester/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// Akademik KRS item actions — add/remove/update item KRS mahasiswa manual
export function useAkademikKrsItemActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['akademik-krs-detail'] });
    qc.invalidateQueries({ queryKey: ['akademik-krs-list'] });
  };
  return {
    addItem: useMutation({
      mutationFn: ({ mahasiswaId, body }: { mahasiswaId: string; body: { kelasId: string; status?: 'draft' | 'diajukan' | 'disetujui'; catatan?: string | null } }) =>
        apiPost(`/akademik/krs/${mahasiswaId}/items`, body),
      onSuccess: inv,
    }),
    removeItem: useMutation({
      mutationFn: (krsId: string) => api(`/akademik/krs/items/${krsId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    updateItem: useMutation({
      mutationFn: ({ krsId, body }: { krsId: string; body: { status: 'draft' | 'diajukan' | 'disetujui' | 'ditolak'; catatan?: string | null } }) =>
        api(`/akademik/krs/items/${krsId}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Validasi KRS
// ============================================================

export type AkademikKrsList = {
  items: Array<{
    id: string; nim: string; nama: string; angkatan: number;
    prodi: { kode: string; nama: string };
    dpa: string | null;
    krsStatus: string;
    krsTotal: number; krsSks: number;
    perluValidasi: boolean;
    isPrsRevisi: boolean;
  }>;
};
export const useAkademikKrs = (filters: { status?: string; prodiId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  return useApi<AkademikKrsList>(['akademik-krs', qs.toString()], `/akademik/krs?${qs}`);
};

export type AkademikKrsItem = {
  id: string; status: string; catatan: string | null;
  tipe: 'krs' | 'prs-tambah' | 'prs-drop';
  kelasId: string;
  kelas: {
    kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
    hari: string | null; jamMulai: string | null; jamSelesai: string | null;
    ruangan: string | null; dosen: string;
  };
};
export type AkademikKrsDetail = {
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string }; dpa: { nama: string; nidn: string } | null; defaultCicilanUkt: number };
  semester: { kode: string; prsMulai: string | null; prsSelesai: string | null } | null;
  inPrsPeriode: boolean;
  items: AkademikKrsItem[];
  totalSks: number;
  sksEfektif: number;
};
export const useAkademikKrsDetail = (mahasiswaId: string | undefined) =>
  useApi<AkademikKrsDetail>(['akademik-krs', mahasiswaId], `/akademik/krs/${mahasiswaId}`, { enabled: !!mahasiswaId });

export type ValidasiKrsResult = {
  ok: boolean;
  updated: number;
  tagihanInfo?: {
    dibuat: boolean;
    nominal?: number;
    potonganBeasiswa?: number;
    cicilan?: number;
    fullBeasiswa?: boolean;
    sudahAda?: boolean;
  };
};
export function useAkademikValidasiKrs(mahasiswaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, catatan, cicilanUkt }: { action: 'setujui' | 'tolak'; catatan?: string; cicilanUkt?: number }) =>
      apiPost<ValidasiKrsResult>(`/akademik/krs/${mahasiswaId}/validasi`, { action, catatan, cicilanUkt }),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['akademik-krs'] }),
      qc.invalidateQueries({ queryKey: ['akademik-dashboard'] }),
    ]),
  });
}

// ============================================================
// Keuangan (akademik)
// ============================================================

export type AkademikTagihan = {
  id: string;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
  semester: string;
  jenis: string;
  deskripsi: string;
  jumlah: number; dibayar: number; sisa: number;
  jatuhTempo: string; status: string;
  jumlahPembayaran: number;
};
export const useAkademikTagihan = (filters: { status?: string; semesterId?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: AkademikTagihan[] }>(['akademik-tagihan', qs.toString()], `/akademik/keuangan/tagihan?${qs}`);
};

export type TagihanInput = {
  mahasiswaId: string; semesterId: string;
  jenis: string; deskripsi: string; jumlah: number; jatuhTempo: string;
  status?: string;
};
export type BulkTagihanInput = {
  semesterId: string;
  jenis: string; deskripsi: string; jumlah: number; jatuhTempo: string;
  prodiId?: string; angkatan?: number;
};
export type PembayaranInput = {
  tagihanId: string; jumlah: number; tanggalBayar: string;
  metode: 'transfer_bank' | 'va' | 'tunai' | 'qris' | 'ewallet';
  buktiUrl?: string; catatan?: string;
};

export function useKeuanganActions() {
  const qc = useQueryClient();
  const inv = () => Promise.all([
    qc.invalidateQueries({ queryKey: ['akademik-tagihan'] }),
    qc.invalidateQueries({ queryKey: ['akademik-pembayaran'] }),
    qc.invalidateQueries({ queryKey: ['akademik-dashboard'] }),
  ]);
  return {
    createTagihan: useMutation({ mutationFn: (input: TagihanInput) => apiPost('/akademik/keuangan/tagihan', input), onSuccess: inv }),
    createBulk: useMutation({ mutationFn: (input: BulkTagihanInput) => apiPost('/akademik/keuangan/tagihan/bulk', input), onSuccess: inv }),
    deleteTagihan: useMutation({ mutationFn: (id: string) => api(`/akademik/keuangan/tagihan/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    createPembayaran: useMutation({ mutationFn: (input: PembayaranInput) => apiPost('/akademik/keuangan/pembayaran', input), onSuccess: inv }),
    verifikasiPembayaran: useMutation({
      mutationFn: ({ id, action, catatan }: { id: string; action: 'setujui' | 'tolak'; catatan?: string }) =>
        apiPost(`/akademik/keuangan/pembayaran/${id}/verifikasi`, { action, catatan }),
      onSuccess: inv,
    }),
  };
}

// Pembayaran admin (verifikasi list)
export type PembayaranAdmin = {
  id: string;
  tanggalBayar: string;
  mahasiswa: { nim: string; nama: string };
  tagihan: { jenis: string; deskripsi: string };
  jumlah: number;
  metode: string;
  buktiUrl: string | null;
  catatan: string | null;
  status: 'menunggu' | 'disetujui' | 'ditolak';
  bankPengirim: string | null;
  bankPenerima: string | null;
  noReferensi: string | null;
  divalidasiOleh: string | null;
  validasiPada: string | null;
  catatanValidasi: string | null;
};

export const useAdminPembayaran = (filters: { status?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: PembayaranAdmin[] }>(['akademik-pembayaran', qs.toString()], `/akademik/keuangan/pembayaran?${qs}`);
};

export type Rekonsiliasi = {
  periode: { dari: string; sampai: string };
  ringkasan: {
    total: number;
    jumlahTransaksi: number;
    perMetode: Array<{ metode: string; count: number; total: number }>;
  };
  items: Array<{
    id: string;
    tanggalBayar: string;
    mahasiswa: { nim: string; nama: string; prodi: { kode: string; nama: string } };
    tagihan: { jenis: string; deskripsi: string; semester: { kode: string } | null };
    jumlah: number;
    metode: string;
    bankPengirim: string | null;
    bankPenerima: string | null;
    noReferensi: string | null;
    buktiUrl: string | null;
    divalidasiOleh: string | null;
    validasiPada: string | null;
  }>;
};

export const useRekonsiliasi = (filters: { dari: string; sampai: string; bankPenerima?: string; metode?: string }) => {
  const qs = new URLSearchParams();
  qs.set('dari', filters.dari);
  qs.set('sampai', filters.sampai);
  if (filters.bankPenerima) qs.set('bankPenerima', filters.bankPenerima);
  if (filters.metode) qs.set('metode', filters.metode);
  return useApi<Rekonsiliasi>(
    ['akademik-rekonsiliasi', qs.toString()],
    `/akademik/keuangan/rekonsiliasi?${qs}`,
    { enabled: !!filters.dari && !!filters.sampai },
  );
};

// ============================================================
// Audit Log
// ============================================================

export type AuditEntry = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditFilters = {
  q?: string;
  action?: string;
  entity?: string;
  actorRole?: string;
  since?: string;
  until?: string;
  skip?: number;
  take?: number;
};

export const useAuditLog = (filters: AuditFilters = {}) => {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.action) qs.set('action', filters.action);
  if (filters.entity) qs.set('entity', filters.entity);
  if (filters.actorRole) qs.set('actorRole', filters.actorRole);
  if (filters.since) qs.set('since', filters.since);
  if (filters.until) qs.set('until', filters.until);
  if (filters.skip) qs.set('skip', filters.skip.toString());
  if (filters.take) qs.set('take', filters.take.toString());
  return useApi<{ items: AuditEntry[]; total: number; take: number; skip: number }>(
    ['audit', qs.toString()],
    `/akademik/audit?${qs}`,
  );
};


// ============================================================
// Akademik — Verifikasi Heregistrasi
// ============================================================
export type HeregistrasiAdmin = {
  id: string; jenis: 'aktif' | 'cuti';
  status: 'diajukan' | 'disetujui' | 'ditolak';
  alasan: string | null;
  dokumenUrl: string | null;
  catatanAkademik: string | null;
  diverifikasiPada: string | null;
  createdAt: string;
  mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string; nama: string } };
  semester: { kode: string; jenis: string; tahunAjaran: { kode: string } };
};
export const useAdminHeregistrasi = (filters: { status?: string; semesterId?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: HeregistrasiAdmin[] }>(['admin-heregistrasi', qs.toString()], `/akademik/heregistrasi?${qs}`);
};
export function useAdminHeregistrasiActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['admin-heregistrasi'] });
  return {
    verifikasi: useMutation({
      mutationFn: ({ id, status, catatan }: { id: string; status: 'disetujui' | 'ditolak'; catatan?: string }) =>
        api(`/akademik/heregistrasi/${id}/verifikasi`, { method: 'PATCH', body: JSON.stringify({ status, catatanAkademik: catatan ?? null }) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/heregistrasi/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// EWS — Early Warning System (peringatan dini DO)
// ============================================================
export type EwsIndikator = {
  jenis: 'ipk' | 'sks_progres' | 'absensi' | 'tunggakan' | 'heregistrasi' | 'nilai_buruk';
  severity: 'tinggi' | 'sedang' | 'rendah';
  judul: string;
  detail: string;
  nilai: number | string;
  threshold: number | string;
  poin: number;
};
export type EwsMahasiswa = {
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
  indikator: EwsIndikator[];
};
export type EwsList = {
  ringkasan: { total: number; tinggi: number; sedang: number; rendah: number };
  items: EwsMahasiswa[];
};
export const useEws = (filters: { prodiId?: string; angkatan?: number; tingkat?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.angkatan) qs.set('angkatan', filters.angkatan.toString());
  if (filters.tingkat) qs.set('tingkat', filters.tingkat);
  return useApi<EwsList>(['ews', qs.toString()], `/akademik/ews?${qs}`);
};
export const useEwsMahasiswa = (mahasiswaId: string | undefined) =>
  useApi<EwsMahasiswa>(['ews-mhs', mahasiswaId], `/akademik/ews/${mahasiswaId}`, { enabled: !!mahasiswaId });

// ============================================================
// Akademik — Transkrip & Kehadiran mahasiswa (cetak)
// ============================================================
export type AdminTranskripItem = {
  semesterKode: string; semesterNama: string;
  kodeMK: string; namaMK: string; sks: number;
  nilaiHuruf: string | null; nilaiAngka: number | null; bobot: number | null;
};
export type AdminTranskrip = {
  mahasiswa: {
    nim: string; nama: string; angkatan: number;
    prodi: { kode: string; nama: string; jenjang: string };
    fakultas: { kode: string; nama: string };
  };
  ipk: number; totalSksLulus: number;
  items: AdminTranskripItem[];
};
export const useAdminTranskrip = (mahasiswaId: string | undefined) =>
  useApi<AdminTranskrip>(['admin-transkrip', mahasiswaId], `/akademik/mahasiswa/${mahasiswaId}/transkrip`, { enabled: !!mahasiswaId });

export type AdminAbsensiItem = {
  kelasId: string;
  kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
  dosen: string;
  totalPertemuan: number; totalDinilai: number;
  ringkasan: { hadir: number; izin: number; sakit: number; alpa: number };
  persentaseHadir: number | null;
  detail: Array<{ pertemuanKe: number; tanggal: string; topik: string | null; status: string | null; catatan: string | null }>;
};
export type AdminAbsensi = {
  mahasiswa: { nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string }; fakultas: { nama: string } };
  semester: { id: string; kode: string; jenis: string; tahunAjaran: { kode: string } };
  items: AdminAbsensiItem[];
};
export const useAdminAbsensi = (mahasiswaId: string | undefined, semesterId?: string) => {
  const qs = semesterId ? `?semesterId=${semesterId}` : '';
  return useApi<AdminAbsensi>(
    ['admin-absensi', mahasiswaId, semesterId ?? ''],
    `/akademik/mahasiswa/${mahasiswaId}/absensi${qs}`,
    { enabled: !!mahasiswaId },
  );
};

// ============================================================
// Phase 2 PDDikti — AKM, Aktivitas Mahasiswa, Daya Tampung
// ============================================================

// AKM (Aktivitas Kuliah Mahasiswa) per semester
export type AkmItem = {
  id: string;
  mahasiswaId: string;
  semesterId: string;
  status: 'aktif' | 'cuti' | 'non_aktif' | 'kampus_merdeka' | 'mengundurkan_diri' | 'lulus' | 'drop_out';
  ips: number | null;
  ipk: number | null;
  sksSemester: number | null;
  sksTotal: number | null;
  biayaKuliah: number | null;
  feederId: string | null;
  lastSyncedAt: string | null;
  mahasiswa: { id: string; nim: string; nama: string; status: string; prodi: { id: string; kode: string; nama: string } };
  semester: { kode: string; jenis: string; tahunAjaran: { kode: string } };
};
export const useAkm = (filters: { semesterId?: string; prodiId?: string; status?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.status) qs.set('status', filters.status);
  if (filters.q) qs.set('q', filters.q);
  return useApi<{ items: AkmItem[] }>(['akm', qs.toString()], `/akademik/akm?${qs}`);
};

export type AkmInput = Partial<{
  mahasiswaId: string; semesterId: string; status: AkmItem['status'];
  ips: number | null; ipk: number | null;
  sksSemester: number | null; sksTotal: number | null;
  biayaKuliah: number | null;
}>;

export function useAkmActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['akm'] });
  return {
    create: useMutation({ mutationFn: (body: AkmInput) => apiPost('/akademik/akm', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: AkmInput }) =>
        api(`/akademik/akm/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/akm/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    generate: useMutation({
      mutationFn: (body: { semesterId: string; prodiId?: string }) =>
        apiPost<{ semester: string; processed: number; created: number; updated: number }>(
          '/akademik/akm/generate', body,
        ),
      onSuccess: inv,
    }),
  };
}

// Aktivitas Mahasiswa (MBKM, Pertukaran, Magang, Riset, dll)
export type AktivitasMhsJenis =
  | 'pertukaran_pelajar' | 'magang' | 'asistensi_mengajar' | 'riset'
  | 'pengabdian_masyarakat' | 'kewirausahaan' | 'proyek_independen'
  | 'proyek_kemanusiaan' | 'bela_negara' | 'kkn_tematik' | 'kerja_praktek'
  | 'studi_independen' | 'ppl' | 'lainnya';

export type AktivitasMhsStatus = 'diajukan' | 'berjalan' | 'selesai' | 'dibatalkan';

export type AktivitasMhsListItem = {
  id: string;
  jenis: AktivitasMhsJenis;
  nama: string;
  deskripsi: string | null;
  semesterId: string;
  lokasi: string | null;
  mitra: string | null;
  isMbkm: boolean;
  isFlagship: boolean;
  isEksternal: boolean;
  linkProposal: string | null;
  linkLaporan: string | null;
  linkSertifikat: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  status: AktivitasMhsStatus;
  catatan: string | null;
  feederId: string | null;
  semester: { kode: string; jenis: string };
  peserta: Array<{
    id: string; mahasiswaId: string; peran: string | null; konversiSks: number | null;
    mahasiswa: { id: string; nim: string; nama: string; prodi: { kode: string } };
  }>;
  pembimbing: Array<{
    id: string; dosenId: string; peran: string | null;
    dosen: { id: string; nidn: string; nama: string };
  }>;
};
export const useAktivitasMhs = (filters: { semesterId?: string; jenis?: string; status?: string; isMbkm?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  if (filters.jenis) qs.set('jenis', filters.jenis);
  if (filters.status) qs.set('status', filters.status);
  if (filters.isMbkm) qs.set('isMbkm', 'true');
  return useApi<{ items: AktivitasMhsListItem[] }>(
    ['aktivitas-mhs', qs.toString()],
    `/akademik/aktivitas-mahasiswa?${qs}`,
  );
};

export const useAktivitasMhsDetail = (id?: string) =>
  useApi<AktivitasMhsListItem>(['aktivitas-mhs', id ?? ''], `/akademik/aktivitas-mahasiswa/${id}`, { enabled: Boolean(id) });

export type AktivitasMhsInput = Partial<Omit<AktivitasMhsListItem, 'id' | 'feederId' | 'semester' | 'peserta' | 'pembimbing'>>;

export function useAktivitasMhsActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['aktivitas-mhs'] });
  return {
    create: useMutation({ mutationFn: (body: AktivitasMhsInput) => apiPost('/akademik/aktivitas-mahasiswa', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: AktivitasMhsInput }) =>
        api(`/akademik/aktivitas-mahasiswa/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/aktivitas-mahasiswa/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    setPeserta: useMutation({
      mutationFn: ({ id, items }: { id: string; items: Array<{ mahasiswaId: string; peran?: string | null; konversiSks?: number | null }> }) =>
        api(`/akademik/aktivitas-mahasiswa/${id}/peserta`, { method: 'PUT', body: JSON.stringify({ items }) }),
      onSuccess: inv,
    }),
    setPembimbing: useMutation({
      mutationFn: ({ id, items }: { id: string; items: Array<{ dosenId: string; peran?: string | null }> }) =>
        api(`/akademik/aktivitas-mahasiswa/${id}/pembimbing`, { method: 'PUT', body: JSON.stringify({ items }) }),
      onSuccess: inv,
    }),
  };
}

// Daya Tampung
export type DayaTampungItem = {
  id: string;
  prodiId: string;
  semesterId: string;
  dayaTampung: number;
  jumlahDaftar: number | null;
  jumlahLulusSeleksi: number | null;
  jumlahRegistrasi: number | null;
  feederId: string | null;
  prodi: { id: string; kode: string; nama: string; jenjang: string };
  semester: { kode: string; jenis: string; tahunAjaran: { kode: string } };
};
export const useDayaTampung = (filters: { prodiId?: string; semesterId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.semesterId) qs.set('semesterId', filters.semesterId);
  return useApi<{ items: DayaTampungItem[] }>(['daya-tampung', qs.toString()], `/akademik/daya-tampung?${qs}`);
};

export type DayaTampungInput = {
  prodiId: string; semesterId: string;
  dayaTampung: number;
  jumlahDaftar?: number | null;
  jumlahLulusSeleksi?: number | null;
  jumlahRegistrasi?: number | null;
};

export function useDayaTampungActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['daya-tampung'] });
  return {
    create: useMutation({ mutationFn: (body: DayaTampungInput) => apiPost('/akademik/daya-tampung', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<DayaTampungInput> }) =>
        api(`/akademik/daya-tampung/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/daya-tampung/${id}`, { method: 'DELETE' }), onSuccess: inv }),
  };
}
