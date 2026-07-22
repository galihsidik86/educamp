import type { ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * Warna nilai. SENGAJA dinamai menurut ARTI, bukan "highlight" — sebelum
 * konsolidasi ini tujuh halaman punya salinan komponen serupa dengan prop
 * `highlight`/`warn`/`ok` yang artinya berbeda-beda: di Laporan Honor Dosen
 * `highlight` berwarna oranye, di Laporan Kehadiran justru MERAH. Pengguna
 * tak mungkin belajar arti sebuah angka yang disorot kalau warnanya tidak
 * konsisten antar halaman.
 */
type Tone = 'default' | 'accent' | 'warning' | 'danger' | 'success';

type Props = {
  label: string;
  value: ReactNode;
  /** Ikon kecil di samping label (bukan di samping nilai). */
  icon?: ReactNode;
  tone?: Tone;
  /** Tampilkan ikon centang/silang di samping nilai — hanya untuk tone success/danger. */
  statusIcon?: boolean;
};

/**
 * Pasangan label + nilai di DALAM sebuah Card — bukan kartu KPI berdiri
 * sendiri. Kalau butuh tile KPI utuh (punya kotak, border, aksen kiri),
 * pakai <StatCard> dari @/ds, jangan komponen ini: membungkus DataPair
 * dengan Card sendiri akan menghasilkan Card bersarang.
 *
 * Nilai selalu mono + tabular-nums karena isinya selalu data (IPK, SKS,
 * jumlah, rupiah, persen) — sesuai aturan font di CLAUDE.md.
 */
export function DataPair({ label, value, icon, tone = 'default', statusIcon = false }: Props) {
  return (
    <div className="data-pair">
      <div className="data-pair__label">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`data-pair__value data-pair__value--${tone}`}>
        {statusIcon && tone === 'success' && <CheckCircle2 size={16} />}
        {statusIcon && tone === 'danger' && <XCircle size={16} />}
        {value}
      </div>
    </div>
  );
}
