import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Select } from '@/ds';
import { Calendar, Download, Printer, Users, BookOpen, Layers, FileText } from 'lucide-react';
import { useLaporanHonorDosen, useAdminDosen, useProdi } from '@/lib/queries-akademik';
import { api } from '@/lib/api';
import { PageHead } from '@/components/PageHead';
import { formatTanggal } from '@/lib/format';
import { Skeleton } from '@/components/Skeleton';
import { DataPair } from '@/components/DataPair';

/** YYYY-MM-DD untuk input type="date". */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function AkademikLaporanHonorDosen() {
  const today = new Date();
  const [tanggalMulai, setTanggalMulai] = useState<string>(ymd(firstOfMonth(today)));
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(ymd(lastOfMonth(today)));
  const [dosenId, setDosenId] = useState('');
  const [prodiId, setProdiId] = useState('');

  const { data, isLoading, error } = useLaporanHonorDosen({
    tanggalMulai, tanggalSelesai,
    dosenId: dosenId || undefined,
    prodiId: prodiId || undefined,
  });
  const dosen = useAdminDosen();
  const prodi = useProdi();

  const cetakUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set('tanggalMulai', tanggalMulai);
    qs.set('tanggalSelesai', tanggalSelesai);
    if (dosenId) qs.set('dosenId', dosenId);
    if (prodiId) qs.set('prodiId', prodiId);
    return `/akademik/laporan/honor-dosen/cetak?${qs}`;
  }, [tanggalMulai, tanggalSelesai, dosenId, prodiId]);

  const presetBulanIni = () => {
    setTanggalMulai(ymd(firstOfMonth(today)));
    setTanggalSelesai(ymd(lastOfMonth(today)));
  };
  const presetBulanLalu = () => {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    setTanggalMulai(ymd(firstOfMonth(lastMonth)));
    setTanggalSelesai(ymd(lastOfMonth(lastMonth)));
  };
  const presetSemester = () => {
    // Semester ganjil ≈ Aug-Jan; semester genap ≈ Feb-Jul
    const m = today.getMonth();
    if (m >= 7 || m <= 0) {
      // Ganjil
      const year = m === 0 ? today.getFullYear() - 1 : today.getFullYear();
      setTanggalMulai(`${year}-08-01`);
      setTanggalSelesai(`${year + 1}-01-31`);
    } else {
      setTanggalMulai(`${today.getFullYear()}-02-01`);
      setTanggalSelesai(`${today.getFullYear()}-07-31`);
    }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="LAPORAN"
        title="Honor Mengajar Dosen"
        subtitle="Rekap kehadiran dosen per periode untuk pengajuan honor mengajar ke bagian SDM."
        right={
          <div className="row" style={{ gap: 6 }}>
            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />} onClick={() => downloadCsv({ tanggalMulai, tanggalSelesai, dosenId, prodiId })}>
              Export CSV
            </Button>
            <Link to={cetakUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" leftIcon={<Printer size={14} />}>Buka & Cetak</Button>
            </Link>
          </div>
        }
      />

      {/* Filter periode */}
      <Card>
        <div className="row" style={{ gap: 6, marginBottom: 'var(--space-2)' }}>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Periode pelaporan
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 180 }}>
            <Input label="Tanggal mulai" type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai((e.target as HTMLInputElement).value)} />
          </div>
          <div style={{ minWidth: 180 }}>
            <Input label="Tanggal selesai" type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai((e.target as HTMLInputElement).value)} />
          </div>
          <div className="row" style={{ gap: 4, alignSelf: 'center', marginTop: 18 }}>
            <Button variant="ghost" size="sm" onClick={presetBulanIni}>Bulan ini</Button>
            <Button variant="ghost" size="sm" onClick={presetBulanLalu}>Bulan lalu</Button>
            <Button variant="ghost" size="sm" onClick={presetSemester}>Semester berjalan</Button>
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          <div style={{ minWidth: 240 }}>
            <Select label="Dosen (opsional)" value={dosenId} onChange={(e) => setDosenId((e.target as HTMLSelectElement).value)}>
              <option value="">Semua dosen</option>
              {dosen.data?.items.map((d) => (
                <option key={d.id} value={d.id}>{d.nidn} — {d.nama}</option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 200 }}>
            <Select label="Prodi (opsional)" value={prodiId} onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}>
              <option value="">Semua prodi</option>
              {prodi.data?.items.map((p) => (
                <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {error && <Alert variant="danger" title="Gagal memuat">{(error as any)?.message ?? 'Coba ulangi.'}</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      {data && (
        <>
          {/* Ringkasan strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
            <SummaryTile icon={<Users size={18} />} label="Total Dosen" value={data.ringkasan.totalDosen} />
            <SummaryTile icon={<Layers size={18} />} label="Total Kelas" value={data.ringkasan.totalKelas} />
            <SummaryTile icon={<Calendar size={18} />} label="Total Pertemuan" value={data.ringkasan.totalPertemuan} />
            <SummaryTile icon={<BookOpen size={18} />} label="Ekuivalen SKS-Pertemuan" value={data.ringkasan.totalSksPertemuan} />
          </div>

          {/* Daftar dosen */}
          {data.items.length === 0 ? (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-5)', gap: 'var(--space-2)' }}>
                <div className="muted" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'grid', placeItems: 'center' }}>
                  <FileText size={28} />
                </div>
                <strong style={{ color: 'var(--text-strong)' }}>Tidak ada data pertemuan</strong>
                <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0, textAlign: 'center', maxWidth: 360 }}>
                  Tidak ada pertemuan terlaksana dalam periode <strong>{formatTanggal(data.periode.tanggalMulai)} – {formatTanggal(data.periode.tanggalSelesai)}</strong> pada filter ini.
                </p>
              </div>
            </Card>
          ) : (
            <div className="stack">
              {data.items.map((it) => (
                <Card key={it.dosen.id}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>{it.dosen.gelarLengkap}</strong>
                      <div className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>NIDN {it.dosen.nidn}</div>
                      {it.dosen.jabatan && (
                        <Badge variant="neutral" style={{ marginTop: 4 }}>{labelJabatan(it.dosen.jabatan)}</Badge>
                      )}
                    </div>
                    <div className="row" style={{ gap: 'var(--space-3)' }}>
                      <DataPair label="Kelas" value={it.totalKelas} />
                      <DataPair label="Pertemuan" value={it.totalPertemuan} tone="accent" />
                      <DataPair label="Total SKS" value={it.totalSksPertemuan} />
                    </div>
                  </div>

                  <div className="tz-table-wrap" style={{ marginTop: 'var(--space-3)' }}>
                    <table className="tz-table">
                      <thead>
                        <tr>
                          <th>Mata Kuliah</th>
                          <th>Prodi</th>
                          <th className="num">SKS</th>
                          <th className="num">Pertemuan</th>
                          <th className="num">SKS × Prtm</th>
                          <th>Tanggal Pertemuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {it.kelas.map((k) => (
                          <tr key={k.kelasId}>
                            <td>
                              <strong className="mono">{k.kodeMK}</strong> — {k.namaMK}
                              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Kelas {k.kodeKelas} · {k.semesterKode}</div>
                            </td>
                            <td className="muted" style={{ fontSize: 'var(--text-sm)' }}>{k.prodi.kode}</td>
                            <td className="num mono">{k.sks}</td>
                            <td className="num mono"><strong>{k.pertemuan.length}</strong></td>
                            <td className="num mono">{k.sks * k.pertemuan.length}</td>
                            <td style={{ fontSize: 'var(--text-xs)' }}>
                              {k.pertemuan.map((p) => formatTanggal(p.tanggal)).join(' · ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="row muted" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>{icon}<span>{label}</span></div>
      <div className="mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-strong)' }}>{value}</div>
    </Card>
  );
}


function labelJabatan(j: string): string {
  const map: Record<string, string> = { asisten_ahli: 'Asisten Ahli', lektor: 'Lektor', lektor_kepala: 'Lektor Kepala', guru_besar: 'Guru Besar', tenaga_pengajar: 'Tenaga Pengajar' };
  return map[j] ?? j;
}

async function downloadCsv(filters: { tanggalMulai: string; tanggalSelesai: string; dosenId?: string; prodiId?: string }) {
  const qs = new URLSearchParams();
  qs.set('tanggalMulai', filters.tanggalMulai);
  qs.set('tanggalSelesai', filters.tanggalSelesai);
  if (filters.dosenId) qs.set('dosenId', filters.dosenId);
  if (filters.prodiId) qs.set('prodiId', filters.prodiId);
  let data: import('@/lib/queries-akademik').LaporanHonorDosen;
  try {
    data = await api(`/akademik/laporan/honor-dosen?${qs}`);
  } catch {
    alert('Gagal mengunduh laporan');
    return;
  }
  const rows: string[] = [];
  rows.push(['NIDN', 'Nama Dosen', 'Jabatan', 'Kode MK', 'Nama MK', 'Kelas', 'Prodi', 'SKS', 'Jumlah Pertemuan', 'SKS × Pertemuan', 'Tanggal Pertemuan'].join(','));
  for (const it of data.items) {
    for (const k of it.kelas) {
      rows.push([
        it.dosen.nidn,
        `"${it.dosen.gelarLengkap.replace(/"/g, '""')}"`,
        it.dosen.jabatan ?? '',
        k.kodeMK,
        `"${k.namaMK.replace(/"/g, '""')}"`,
        k.kodeKelas,
        k.prodi.kode,
        k.sks,
        k.pertemuan.length,
        k.sks * k.pertemuan.length,
        `"${k.pertemuan.map((p) => new Date(p.tanggal).toLocaleDateString('id-ID')).join(' / ')}"`,
      ].join(','));
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `honor-dosen-${filters.tanggalMulai}-sd-${filters.tanggalSelesai}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
