import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiPost, ApiError } from './api';
import { useApi } from './queries';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

// ============================================================
// Types
// ============================================================

export type KategoriStandar =
  | 'pendidikan' | 'penelitian' | 'pengabdian' | 'pengelolaan'
  | 'sarpras' | 'pembiayaan' | 'spmi_tambahan' | 'non_akademik'
  | 'standar_internasional';

export type SumberDataStandar =
  | 'manual' | 'ipk_lulusan' | 'masa_studi' | 'tingkat_kelulusan'
  | 'edom_dosen' | 'kehadiran_dosen' | 'kehadiran_mahasiswa'
  | 'rasio_dosen_mhs' | 'bkd_compliance' | 'capaian_cpl';

export type StatusPencapaian = 'belum_diukur' | 'tercapai' | 'cukup' | 'belum_tercapai';

export type StandarMutu = {
  id: string;
  kode: string;
  nama: string;
  kategori: KategoriStandar;
  deskripsi: string;
  rumusan: string | null;
  satuan: string | null;
  targetMin: number | null;
  targetMax: number | null;
  ambangCukup: number | null;
  sumberData: SumberDataStandar;
  prodiId: string | null;
  isAktif: boolean;
  prodi?: { kode: string; nama: string } | null;
  pengukuran?: PengukuranStandar[];
  _count?: { pengukuran: number };
};

export type PengukuranStandar = {
  id: string;
  standarId: string;
  periode: string;
  nilai: number;
  status: StatusPencapaian;
  catatan: string | null;
  sumberData: any;
  createdAt: string;
};

export type StatusAmi = 'perencanaan' | 'pelaksanaan' | 'selesai' | 'ditangguhkan';
export type KategoriTemuan = 'ktsm' | 'kts' | 'observasi' | 'saran';
export type StatusCapa = 'rencana' | 'pelaksanaan' | 'verifikasi' | 'closed' | 'ditolak';

export type Ami = {
  id: string;
  kode: string;
  nama: string;
  periode: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: StatusAmi;
  ruangLingkup: string | null;
  catatan: string | null;
  dilaporkanKeSpme?: boolean;
  dilaporkanKeSpmePada?: string | null;
  dampakAkreditasi?: string | null;
  auditor?: Array<{ id: string; peran: string; dosen: { id: string; nidn: string; nama: string; gelarDepan?: string | null; gelarBelakang?: string | null } }>;
  lingkup?: Array<{ id: string; prodi: { id: string; kode: string; nama: string } }>;
  temuan?: Temuan[];
  _count?: { temuan: number };
};

export type Temuan = {
  id: string;
  amiId: string;
  kode: string;
  kategori: KategoriTemuan;
  standarId: string | null;
  deskripsi: string;
  buktiUrl: string | null;
  rekomendasi: string | null;
  standar?: { kode: string; nama: string } | null;
  capa?: Capa | null;
};

export type Capa = {
  id: string;
  temuanId: string;
  akarMasalah: string | null;
  rencanaTindakan: string;
  picUserId: string | null;
  picDosenId: string | null;
  targetSelesai: string;
  realisasiTindakan: string | null;
  bukti: string | null;
  tanggalSelesai: string | null;
  verifikator: string | null;
  verifikasiPada: string | null;
  catatanVerifikasi: string | null;
  status: StatusCapa;
  temuan?: { kode: string; deskripsi: string; ami: { id: string; kode: string; nama: string }; standar?: { kode: string; nama: string } | null };
  picUser?: { id: string; email: string; akademik?: { nama: string } | null } | null;
  picDosen?: { id: string; nidn: string; nama: string } | null;
};

export type StatusRtm = 'perencanaan' | 'selesai';
export type StatusKeputusan = 'open' | 'in_progress' | 'done' | 'cancelled';

export type Rtm = {
  id: string;
  kode: string;
  judul: string;
  tanggal: string;
  agenda: string;
  notulen: string | null;
  peserta: string | null;
  status: StatusRtm;
  keputusan?: Keputusan[];
  _count?: { keputusan: number };
};

export type Keputusan = {
  id: string;
  rtmId: string;
  deskripsi: string;
  picUserId: string | null;
  picCatatan: string | null;
  targetSelesai: string | null;
  status: StatusKeputusan;
  catatan: string | null;
  picUser?: { id: string; email: string; akademik?: { nama: string } | null } | null;
};

export type KategoriSurvei =
  | 'layanan_akademik' | 'layanan_keuangan' | 'layanan_sarpras' | 'layanan_perpustakaan'
  | 'layanan_kemahasiswaan' | 'dosen_pembimbing' | 'lulusan' | 'pengguna_lulusan' | 'lain';

export type StatusSurvei = 'draft' | 'publish' | 'ditutup';
export type JenisPertanyaan = 'likert' | 'pilihan' | 'open';

export type Survei = {
  id: string;
  kode: string;
  judul: string;
  deskripsi: string | null;
  kategori: KategoriSurvei;
  periode: string | null;
  target: string;
  tokenPublic: string;
  status: StatusSurvei;
  mulai: string | null;
  selesai: string | null;
  pertanyaan?: Pertanyaan[];
  _count?: { pertanyaan: number; response: number };
};

export type Pertanyaan = {
  id: string;
  kuesionerId: string;
  urutan: number;
  pertanyaan: string;
  jenis: JenisPertanyaan;
  wajib: boolean;
  opsi: string[] | null;
};

// ============================================================
// Dashboard
// ============================================================

export type SpmiDashboard = {
  penetapan: { totalStandar: number; perKategori: { kategori: KategoriStandar; jumlah: number }[] };
  evaluasi: { capaian: Record<StatusPencapaian, number>; persenTercapai: number };
  ami: {
    perStatus: { status: StatusAmi; jumlah: number }[];
    temuanPerKategori: { kategori: KategoriTemuan; jumlah: number }[];
    total?: number;
    dilaporkanKeSpme?: number;
  };
  pengendalian: { capaPerStatus: { status: StatusCapa; jumlah: number }[]; overdue: number };
  peningkatan: { rtmPerStatus: { status: StatusRtm; jumlah: number }[]; keputusanOpen: number };
  survei: { surveiAktif: number; totalResponse: number };
};

export const useSpmiDashboard = () =>
  useApi<SpmiDashboard>(['spmi-dashboard'], '/akademik/spmi/dashboard');

// ============================================================
// Standar Mutu
// ============================================================

export const useStandarMutu = (filters: { kategori?: KategoriStandar; prodiId?: string; aktif?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.kategori) qs.set('kategori', filters.kategori);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  if (filters.aktif) qs.set('aktif', filters.aktif);
  return useApi<{ items: StandarMutu[] }>(['spmi-standar', qs.toString()], `/akademik/spmi/standar?${qs}`);
};

export const useStandarMutuDetail = (id: string | undefined) =>
  useApi<StandarMutu>(['spmi-standar-detail', id ?? ''], `/akademik/spmi/standar/${id}`, { enabled: !!id });

export function useStandarMutuActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['spmi-standar'] });
    qc.invalidateQueries({ queryKey: ['spmi-standar-detail'] });
    qc.invalidateQueries({ queryKey: ['spmi-dashboard'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: Partial<StandarMutu>) => apiPost('/akademik/spmi/standar', body),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<StandarMutu> }) =>
        api(`/akademik/spmi/standar/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api(`/akademik/spmi/standar/${id}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    ukur: useMutation({
      mutationFn: ({ id, periode }: { id: string; periode: string }) =>
        apiPost<{ pengukuran: PengukuranStandar; autoMeasured: boolean }>(`/akademik/spmi/standar/${id}/ukur`, { periode }),
      onSuccess: inv,
    }),
    pengukuranManual: useMutation({
      mutationFn: ({ id, periode, nilai, catatan }: { id: string; periode: string; nilai: number; catatan?: string }) =>
        apiPost<PengukuranStandar>(`/akademik/spmi/standar/${id}/pengukuran`, { periode, nilai, catatan }),
      onSuccess: inv,
    }),
    pengukuranHapus: useMutation({
      mutationFn: ({ id, periode }: { id: string; periode: string }) =>
        api(`/akademik/spmi/standar/${id}/pengukuran/${encodeURIComponent(periode)}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// AMI + Temuan + CAPA
// ============================================================

export const useAmiList = (filters: { status?: StatusAmi; periode?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.periode) qs.set('periode', filters.periode);
  return useApi<{ items: Ami[] }>(['spmi-ami', qs.toString()], `/akademik/spmi/ami?${qs}`);
};

export const useAmiDetail = (id: string | undefined) =>
  useApi<Ami>(['spmi-ami-detail', id ?? ''], `/akademik/spmi/ami/${id}`, { enabled: !!id });

export function useAmiActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['spmi-ami'] });
    qc.invalidateQueries({ queryKey: ['spmi-ami-detail'] });
    qc.invalidateQueries({ queryKey: ['spmi-dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: (body: Partial<Ami>) => apiPost('/akademik/spmi/ami', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Ami> }) =>
        api(`/akademik/spmi/ami/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/spmi/ami/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addAuditor: useMutation({
      mutationFn: ({ amiId, dosenId, peran }: { amiId: string; dosenId: string; peran?: string }) =>
        apiPost(`/akademik/spmi/ami/${amiId}/auditor`, { dosenId, peran }),
      onSuccess: inv,
    }),
    removeAuditor: useMutation({
      mutationFn: ({ amiId, auditorId }: { amiId: string; auditorId: string }) =>
        api(`/akademik/spmi/ami/${amiId}/auditor/${auditorId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addLingkup: useMutation({
      mutationFn: ({ amiId, prodiId }: { amiId: string; prodiId: string }) =>
        apiPost(`/akademik/spmi/ami/${amiId}/lingkup`, { prodiId }),
      onSuccess: inv,
    }),
    removeLingkup: useMutation({
      mutationFn: ({ amiId, lingkupId }: { amiId: string; lingkupId: string }) =>
        api(`/akademik/spmi/ami/${amiId}/lingkup/${lingkupId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    addTemuan: useMutation({
      mutationFn: ({ amiId, body }: { amiId: string; body: Partial<Temuan> }) =>
        apiPost(`/akademik/spmi/ami/${amiId}/temuan`, body),
      onSuccess: inv,
    }),
    updateTemuan: useMutation({
      mutationFn: ({ temuanId, body }: { temuanId: string; body: Partial<Temuan> }) =>
        api(`/akademik/spmi/temuan/${temuanId}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    removeTemuan: useMutation({
      mutationFn: (temuanId: string) => api(`/akademik/spmi/temuan/${temuanId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    createCapa: useMutation({
      mutationFn: ({ temuanId, body }: { temuanId: string; body: Partial<Capa> }) =>
        apiPost(`/akademik/spmi/temuan/${temuanId}/capa`, body),
      onSuccess: inv,
    }),
    updateCapa: useMutation({
      mutationFn: ({ capaId, body }: { capaId: string; body: Partial<Capa> }) =>
        api(`/akademik/spmi/capa/${capaId}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    verifikasiCapa: useMutation({
      mutationFn: ({ capaId, setuju, catatan }: { capaId: string; setuju: boolean; catatan?: string }) =>
        apiPost(`/akademik/spmi/capa/${capaId}/verifikasi`, { setuju, catatan }),
      onSuccess: inv,
    }),
  };
}

export const useCapaList = (filters: { status?: StatusCapa; overdue?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.overdue) qs.set('overdue', 'true');
  return useApi<{ items: Capa[] }>(['spmi-capa', qs.toString()], `/akademik/spmi/capa?${qs}`);
};

// ============================================================
// RTM
// ============================================================

export const useRtmList = (filters: { status?: StatusRtm } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  return useApi<{ items: Rtm[] }>(['spmi-rtm', qs.toString()], `/akademik/spmi/rtm?${qs}`);
};

export const useRtmDetail = (id: string | undefined) =>
  useApi<Rtm>(['spmi-rtm-detail', id ?? ''], `/akademik/spmi/rtm/${id}`, { enabled: !!id });

export function useRtmActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['spmi-rtm'] });
    qc.invalidateQueries({ queryKey: ['spmi-rtm-detail'] });
    qc.invalidateQueries({ queryKey: ['spmi-dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: (body: Partial<Rtm>) => apiPost('/akademik/spmi/rtm', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Rtm> }) =>
        api(`/akademik/spmi/rtm/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/spmi/rtm/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addKeputusan: useMutation({
      mutationFn: ({ rtmId, body }: { rtmId: string; body: Partial<Keputusan> }) =>
        apiPost(`/akademik/spmi/rtm/${rtmId}/keputusan`, body),
      onSuccess: inv,
    }),
    updateKeputusan: useMutation({
      mutationFn: ({ keputusanId, body }: { keputusanId: string; body: Partial<Keputusan> }) =>
        api(`/akademik/spmi/keputusan/${keputusanId}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    removeKeputusan: useMutation({
      mutationFn: (keputusanId: string) => api(`/akademik/spmi/keputusan/${keputusanId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Survei
// ============================================================

export const useSurveiList = (filters: { status?: StatusSurvei; kategori?: KategoriSurvei } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.kategori) qs.set('kategori', filters.kategori);
  return useApi<{ items: Survei[] }>(['spmi-survei', qs.toString()], `/akademik/spmi/survei?${qs}`);
};

export const useSurveiDetail = (id: string | undefined) =>
  useApi<Survei>(['spmi-survei-detail', id ?? ''], `/akademik/spmi/survei/${id}`, { enabled: !!id });

export type SurveiHasil = {
  totalResponse: number;
  hasil: Array<{
    pertanyaanId: string;
    urutan: number;
    pertanyaan: string;
    jenis: JenisPertanyaan;
    n: number;
    rataRata?: number;
    distribusi?: Record<string, number>;
    sample?: (string | null)[];
  }>;
};

export const useSurveiHasil = (id: string | undefined) =>
  useApi<SurveiHasil>(['spmi-survei-hasil', id ?? ''], `/akademik/spmi/survei/${id}/hasil`, { enabled: !!id });

export function useSurveiActions() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['spmi-survei'] });
    qc.invalidateQueries({ queryKey: ['spmi-survei-detail'] });
    qc.invalidateQueries({ queryKey: ['spmi-survei-hasil'] });
    qc.invalidateQueries({ queryKey: ['spmi-dashboard'] });
  };
  return {
    create: useMutation({ mutationFn: (body: Partial<Survei>) => apiPost('/akademik/spmi/survei', body), onSuccess: inv }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Survei> }) =>
        api(`/akademik/spmi/survei/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    remove: useMutation({ mutationFn: (id: string) => api(`/akademik/spmi/survei/${id}`, { method: 'DELETE' }), onSuccess: inv }),
    addPertanyaan: useMutation({
      mutationFn: ({ surveiId, body }: { surveiId: string; body: Partial<Pertanyaan> }) =>
        apiPost(`/akademik/spmi/survei/${surveiId}/pertanyaan`, body),
      onSuccess: inv,
    }),
    updatePertanyaan: useMutation({
      mutationFn: ({ pertanyaanId, body }: { pertanyaanId: string; body: Partial<Pertanyaan> }) =>
        api(`/akademik/spmi/pertanyaan/${pertanyaanId}`, { method: 'PATCH', body: JSON.stringify(body) }),
      onSuccess: inv,
    }),
    removePertanyaan: useMutation({
      mutationFn: (pertanyaanId: string) => api(`/akademik/spmi/pertanyaan/${pertanyaanId}`, { method: 'DELETE' }),
      onSuccess: inv,
    }),
    regenToken: useMutation({
      mutationFn: (surveiId: string) =>
        apiPost<{ tokenPublic: string }>(`/akademik/spmi/survei/${surveiId}/regen-token`, {}),
      onSuccess: inv,
    }),
  };
}

// ============================================================
// Laporan
// ============================================================

export type LaporanPencapaian = {
  periode: string;
  institusi: string;
  totalStandar: number;
  ringkasan: Record<StatusPencapaian, number>;
  persenTercapai: number;
  items: Array<{
    id: string;
    kode: string;
    nama: string;
    kategori: KategoriStandar;
    deskripsi: string;
    satuan: string | null;
    targetMin: number | null;
    targetMax: number | null;
    ambangCukup: number | null;
    sumberData: SumberDataStandar;
    prodi: { kode: string; nama: string } | null;
    pengukuran: PengukuranStandar | null;
  }>;
};

export const useLaporanPencapaian = (periode: string | undefined, opts: { kategori?: KategoriStandar; prodiId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (periode) qs.set('periode', periode);
  if (opts.kategori) qs.set('kategori', opts.kategori);
  if (opts.prodiId) qs.set('prodiId', opts.prodiId);
  return useApi<LaporanPencapaian>(
    ['spmi-laporan-pencapaian', qs.toString()],
    `/akademik/spmi/laporan/standar?${qs}`,
    { enabled: !!periode },
  );
};

export type LaporanPpepp = {
  periode: string;
  institusi: string;
  generatedAt: string;
  penetapan: {
    totalStandar: number;
    standar: Array<{
      id: string; kode: string; nama: string; kategori: KategoriStandar;
      targetMin: number | null; targetMax: number | null; satuan: string | null;
      prodi: { kode: string; nama: string } | null;
      pengukuran: PengukuranStandar | null;
    }>;
  };
  evaluasi: {
    capaian: Record<StatusPencapaian, number>;
    persenTercapai: number;
  };
  ami: Array<{
    id: string; kode: string; nama: string; periode: string;
    tanggalMulai: string; tanggalSelesai: string | null; status: StatusAmi;
    jumlahAuditor: number; jumlahLingkup: number;
    temuan: Array<{
      kode: string; kategori: KategoriTemuan; deskripsi: string;
      standar: { kode: string; nama: string } | null;
      capaStatus: StatusCapa | null;
    }>;
    ringkasanTemuan: { ktsm: number; kts: number; observasi: number; saran: number };
  }>;
  pengendalian: {
    capaAktif: Array<{
      id: string; status: StatusCapa; rencanaTindakan: string;
      targetSelesai: string; isOverdue: boolean;
      temuanKode: string; amiKode: string; pic: string | null;
    }>;
    jumlahOverdue: number;
  };
  peningkatan: {
    rtm: Array<{
      id: string; kode: string; judul: string; tanggal: string; status: StatusRtm;
      jumlahKeputusan: number; keputusanOpen: number;
      keputusan: Array<{
        deskripsi: string; status: StatusKeputusan;
        targetSelesai: string | null; pic: string | null;
      }>;
    }>;
  };
  survei: {
    total: number;
    items: Array<{
      id: string; kode: string; judul: string; kategori: KategoriSurvei;
      status: StatusSurvei; periode: string | null; jumlahResponse: number;
    }>;
  };
};

export const useLaporanPpepp = (periode: string | undefined) => {
  const qs = new URLSearchParams();
  if (periode) qs.set('periode', periode);
  return useApi<LaporanPpepp>(
    ['spmi-laporan-ppepp', qs.toString()],
    `/akademik/spmi/laporan/ppepp?${qs}`,
    { enabled: !!periode },
  );
};

// ============================================================
// Public survei (unauth)
// ============================================================

export type PublicSurvei = {
  id: string; kode: string; judul: string; deskripsi: string | null;
  kategori: KategoriSurvei; periode: string | null; target: string;
  pertanyaan: Pertanyaan[];
};

export const usePublicSurvei = (token: string | undefined) =>
  useQuery({
    queryKey: ['public-survei', token ?? ''],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/verifikasi/survei/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = body?.error ?? {};
        throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Tidak ditemukan');
      }
      return res.json() as Promise<PublicSurvei>;
    },
    enabled: !!token,
    retry: false,
  });

export type SubmitSurveiBody = {
  rolePelapor?: string;
  identitasOpsional?: string;
  jawaban: Array<{ pertanyaanId: string; nilai?: number | null; pilihan?: string | null; teks?: string | null }>;
};

export async function submitPublicSurvei(token: string, body: SubmitSurveiBody) {
  const res = await fetch(`${BASE_URL}/verifikasi/survei/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const err = b?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Gagal mengirim');
  }
  return res.json() as Promise<{ ok: true; responseId: string }>;
}
