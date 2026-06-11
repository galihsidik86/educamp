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
  };
}

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
