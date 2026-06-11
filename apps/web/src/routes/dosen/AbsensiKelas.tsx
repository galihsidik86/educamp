import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Plus, Trash2, ChevronRight, Printer } from 'lucide-react';
import { useDosenPertemuan, useDosenAbsensiActions, useDosenKehadiranRekap } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

type Tab = 'pertemuan' | 'rekap';

export function DosenAbsensiKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDosenPertemuan(kelasId);
  const rekap = useDosenKehadiranRekap(kelasId);
  const { createPertemuan, deletePertemuan } = useDosenAbsensiActions(kelasId);

  const [tab, setTab] = useState<Tab>('pertemuan');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tanggal: '', topik: '', catatan: '' });
  const [actErr, setActErr] = useState<string | null>(null);

  const submitNew = async () => {
    setActErr(null);
    if (!form.tanggal) { setActErr('Tanggal wajib diisi'); return; }
    try {
      await createPertemuan.mutateAsync({
        tanggal: form.tanggal,
        topik: form.topik.trim() || null,
        catatan: form.catatan.trim() || null,
      });
      setForm({ tanggal: '', topik: '', catatan: '' });
      setShowForm(false);
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  const onDelete = async (id: string, ke: number) => {
    if (!confirm(`Hapus pertemuan ke-${ke}? Semua data absensi pada pertemuan ini akan hilang.`)) return;
    setActErr(null);
    try { await deletePertemuan.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Kelas tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link
        to="/dosen/absensi"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.kelas.namaMK}
        subtitle="Daftar pertemuan dan rekap kehadiran peserta."
        right={
          tab === 'pertemuan'
            ? (
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Tutup' : 'Tambah Pertemuan'}
              </Button>
            )
            : (
              <Button variant="ghost" size="sm" leftIcon={<Printer size={14} />} onClick={() => window.print()}>
                Cetak rekap
              </Button>
            )
        }
      />

      <div className="tablist">
        <button onClick={() => setTab('pertemuan')} aria-selected={tab === 'pertemuan'}>Daftar Pertemuan</button>
        <button onClick={() => setTab('rekap')} aria-selected={tab === 'rekap'}>Rekap Peserta</button>
      </div>

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      {tab === 'pertemuan' && <>
      {showForm && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>Pertemuan baru</h3>
          <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="Tanggal pertemuan" type="datetime-local" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 2, minWidth: 300 }}>
              <Input label="Topik (opsional)" value={form.topik} onChange={(e) => setForm({ ...form, topik: (e.target as HTMLInputElement).value })} placeholder="mis. Pengantar Algoritma" />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Input label="Catatan (opsional)" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: (e.target as HTMLInputElement).value })} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={createPertemuan.isPending} onClick={submitNew}>
              {createPertemuan.isPending ? 'Menyimpan…' : 'Simpan pertemuan'}
            </Button>
          </div>
        </Card>
      )}

      {data.items.length === 0 && !showForm && (
        <Alert variant="info" title="Belum ada pertemuan">Klik "Tambah Pertemuan" untuk mulai mencatat kehadiran.</Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Tanggal</th>
              <th>Topik</th>
              <th className="num">Hadir</th>
              <th className="num">Izin</th>
              <th className="num">Sakit</th>
              <th className="num">Alpa</th>
              <th className="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td className="num mono">{p.pertemuanKe}</td>
                <td className="mono">{formatTanggalWaktu(p.tanggal)}</td>
                <td>{p.topik ?? <span className="muted">—</span>}</td>
                <td className="num">{p.ringkasan.hadir}</td>
                <td className="num">{p.ringkasan.izin}</td>
                <td className="num">{p.ringkasan.sakit}</td>
                <td className="num">{p.ringkasan.alpa}</td>
                <td className="num">{p.totalAbsensi}</td>
                <td>
                  <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/dosen/absensi/${kelasId}/${p.id}`)}
                      rightIcon={<ChevronRight size={14} />}
                    >
                      Absensi
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(p.id, p.pertemuanKe)} leftIcon={<Trash2 size={14} />}>
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

      {tab === 'rekap' && (
        <>
          {rekap.isLoading && <p className="muted">Memuat…</p>}
          {rekap.data && (
            <>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Threshold kritis: kehadiran &lt; <strong>{rekap.data.threshold}%</strong>. Total pertemuan: <strong style={{ fontFamily: 'var(--font-mono)' }}>{rekap.data.totalPertemuan}</strong>.
              </div>
              <div className="tz-table-wrap">
                <table className="tz-table">
                  <thead>
                    <tr>
                      <th className="num">#</th>
                      <th>NIM</th>
                      <th>Nama</th>
                      <th className="num">Hadir</th>
                      <th className="num">Izin</th>
                      <th className="num">Sakit</th>
                      <th className="num">Alpa</th>
                      <th className="num">Total</th>
                      <th className="num">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.data.items.length === 0 && (
                      <tr><td colSpan={9} className="muted center">Belum ada peserta.</td></tr>
                    )}
                    {rekap.data.items.map((p, i) => (
                      <tr key={p.mahasiswaId} style={p.kritis ? { background: 'var(--danger-surface)' } : undefined}>
                        <td className="num mono">{i + 1}</td>
                        <td className="mono">{p.nim}</td>
                        <td>{p.nama}</td>
                        <td className="num">{p.ringkasan.hadir}</td>
                        <td className="num">{p.ringkasan.izin}</td>
                        <td className="num">{p.ringkasan.sakit}</td>
                        <td className="num">{p.ringkasan.alpa}</td>
                        <td className="num">{p.totalDinilai}</td>
                        <td className="num">
                          {p.persentaseHadir != null
                            ? (p.kritis
                                ? <span className="pill pill--danger">{p.persentaseHadir}%</span>
                                : <strong>{p.persentaseHadir}%</strong>)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
