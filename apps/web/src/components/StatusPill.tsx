import { formatStatus } from '@/lib/format';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const VARIANTS: Record<string, Variant> = {
  // KRS
  draft: 'neutral', diajukan: 'info', disetujui: 'success', ditolak: 'danger',
  // Nilai
  belum: 'neutral', finalized: 'success',
  // Tagihan
  belum_bayar: 'warning', cicil: 'info', lunas: 'success', jatuh_tempo: 'danger',
  // Kegiatan
  proposal: 'neutral', berjalan: 'info', selesai: 'success',
  // KKN
  pendaftaran: 'neutral', ditugaskan: 'info',
  // Mahasiswa
  aktif: 'success', cuti: 'neutral', lulus: 'success', drop_out: 'danger', mengundurkan_diri: 'danger',
  campuran: 'warning', kosong: 'neutral',
};

export function StatusPill({ status, override }: { status: string; override?: Variant }) {
  const v: Variant = override ?? VARIANTS[status] ?? 'neutral';
  return <span className={`pill pill--${v}`}>{formatStatus(status)}</span>;
}
