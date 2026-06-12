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
  angkatan: number; status: string;
  user: { email: string; isActive: boolean };
  prodi: { kode: string; nama: string };
  dpa: { id: string; nama: string } | null;
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
  status?: string;
};

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
  };
}

// ============================================================
// Master kurikulum (Prodi, MK, Kelas, Ruangan)
// ============================================================

export type Fakultas = { id: string; kode: string; nama: string };
export const useFakultas = () => useApi<{ items: Fakultas[] }>(['fakultas'], '/akademik/fakultas');

export type Prodi = {
  id: string; kode: string; nama: string; jenjang: string;
  fakultas: { kode: string; nama: string };
  _count: { mahasiswa: number; dosen: number; mataKuliah: number };
};
export const useProdi = () => useApi<{ items: Prodi[] }>(['prodi'], '/akademik/prodi');

export type Mk = {
  id: string; kode: string; nama: string; namaInggris: string | null;
  sks: number; sksTeori: number; sksPraktik: number; jenis: string;
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
  };
}

export type Ruangan = { id: string; kode: string; nama: string; gedung: string | null; lantai: number | null; kapasitas: number };
export const useRuangan = () => useApi<{ items: Ruangan[] }>(['ruangan'], '/akademik/ruangan');

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
  mataKuliah: { kode: string; nama: string; sks: number };
  dosen: { nidn: string; nama: string; gelarDepan: string | null; gelarBelakang: string | null };
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

export function usePeriodeActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['periode'] });
  return {
    aktifkan: useMutation({
      mutationFn: (semesterId: string) => apiPost(`/akademik/periode/semester/${semesterId}/aktifkan`, {}),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['periode'] });
        qc.invalidateQueries({ queryKey: ['akademik-dashboard'] });
      },
    }),
    updateSemester: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<{ krsMulai: string; krsSelesai: string; prsMulai: string; prsSelesai: string; nilaiMulai: string; nilaiSelesai: string }> }) =>
        api(`/akademik/periode/semester/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
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
  kelas: {
    kodeMK: string; namaMK: string; sks: number; kodeKelas: string;
    hari: string | null; jamMulai: string | null; jamSelesai: string | null;
    ruangan: string | null; dosen: string;
  };
};
export type AkademikKrsDetail = {
  mahasiswa: { id: string; nim: string; nama: string; angkatan: number; prodi: { kode: string; nama: string }; dpa: { nama: string; nidn: string } | null };
  semester: { kode: string; prsMulai: string | null; prsSelesai: string | null } | null;
  inPrsPeriode: boolean;
  items: AkademikKrsItem[];
  totalSks: number;
  sksEfektif: number;
};
export const useAkademikKrsDetail = (mahasiswaId: string | undefined) =>
  useApi<AkademikKrsDetail>(['akademik-krs', mahasiswaId], `/akademik/krs/${mahasiswaId}`, { enabled: !!mahasiswaId });

export function useAkademikValidasiKrs(mahasiswaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, catatan }: { action: 'setujui' | 'tolak'; catatan?: string }) =>
      apiPost(`/akademik/krs/${mahasiswaId}/validasi`, { action, catatan }),
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
    qc.invalidateQueries({ queryKey: ['akademik-dashboard'] }),
  ]);
  return {
    createTagihan: useMutation({ mutationFn: (input: TagihanInput) => apiPost('/akademik/keuangan/tagihan', input), onSuccess: inv }),
    createBulk: useMutation({ mutationFn: (input: BulkTagihanInput) => apiPost('/akademik/keuangan/tagihan/bulk', input), onSuccess: inv }),
    deleteTagihan: useMutation({ mutationFn: (id: string) => api(`/akademik/keuangan/tagihan/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    createPembayaran: useMutation({ mutationFn: (input: PembayaranInput) => apiPost('/akademik/keuangan/pembayaran', input), onSuccess: inv }),
  };
}

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
