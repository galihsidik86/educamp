type DosenName = {
  nama: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
};

/** Format nama dosen lengkap dengan gelar depan & belakang. */
export function fullDosenName(d: DosenName): string {
  return [d.gelarDepan, d.nama, d.gelarBelakang].filter(Boolean).join(' ');
}

type TeamMember = { dosen: DosenName; peran: 'lead' | 'anggota' | 'asisten' };

/**
 * Bentuk label dosen pengampu untuk tampilan mahasiswa:
 * - 1 dosen → "Dr. Budi Santoso M.Kom."
 * - >1 dosen (team teaching) → "Dr. Budi Santoso M.Kom. +1 lainnya"
 *
 * Lead muncul lebih dulu. Bila tidak ada team data, fallback ke leadDosen saja.
 */
export function formatDosenLabel(leadDosen: DosenName, team?: TeamMember[]): string {
  if (!team || team.length <= 1) return fullDosenName(leadDosen);
  const others = team.length - 1;
  return `${fullDosenName(leadDosen)} +${others} lainnya`;
}
