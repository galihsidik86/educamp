import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { ChevronLeft, Plus, Trash2, ChevronRight, Printer, CalendarClock } from 'lucide-react';
import { useDosenPertemuan, useDosenAbsensiActions, useDosenKehadiranRekap, useDosenRuangan, type PertemuanItem } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu, formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

type Tab = 'pertemuan' | 'rekap';

export function DosenAbsensiKelas() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDosenPertemuan(kelasId);
  const rekap = useDosenKehadiranRekap(kelasId);
  const { createPertemuan, deletePertemuan, reschedulePertemuan } = useDosenAbsensiActions(kelasId);

  const [tab, setTab] = useState<Tab>('pertemuan');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tanggal: '', topik: '', catatan: '' });
  const [actErr, setActErr] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<PertemuanItem | null>(null);

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
    if (!confirm(`Hapus pertemuan ke-${ke}? Semua data presensi pada pertemuan ini akan hilang.`)) return;
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
                <td className="mono">
                  {formatTanggalWaktu(p.tanggal)}
                  {p.tanggalAsli && (
                    <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      <CalendarClock size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                      Dipindah dari {formatTanggal(p.tanggalAsli)}
                    </div>
                  )}
                  {p.ruangan && (
                    <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Ruang: {p.ruangan.kode}</div>
                  )}
                </td>
                <td>
                  {p.topik ?? <span className="muted">—</span>}
                  {p.alasanReschedule && (
                    <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                      Alasan pindah: {p.alasanReschedule}
                    </div>
                  )}
                </td>
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
                      Presensi
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReschedule(p)} leftIcon={<CalendarClock size={14} />}>
                      Reschedule
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

      {reschedule && (
        <RescheduleModal
          item={reschedule}
          onClose={() => setReschedule(null)}
          onSubmit={async (body) => {
            try {
              await reschedulePertemuan.mutateAsync({ id: reschedule.id, body });
              setReschedule(null);
            } catch (e) { throw e; }
          }}
          pending={reschedulePertemuan.isPending}
        />
      )}
    </div>
  );
}

function RescheduleModal({ item, onClose, onSubmit, pending }: {
  item: PertemuanItem;
  onClose: () => void;
  onSubmit: (body: { tanggal: string; ruanganId?: string | null; alasan: string }) => Promise<void>;
  pending: boolean;
}) {
  const ruangan = useDosenRuangan();
  const [tanggal, setTanggal] = useState(toDateTimeLocal(item.tanggal));
  const [ruanganId, setRuanganId] = useState<string>('');
  const [alasan, setAlasan] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!tanggal) { setErr('Tanggal wajib diisi'); return; }
    if (alasan.trim().length < 10) { setErr('Alasan minimal 10 karakter'); return; }
    try {
      await onSubmit({ tanggal: new Date(tanggal).toISOString(), ruanganId: ruanganId || null, alasan });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Reschedule pertemuan ke-${item.pertemuanKe}`} width={620}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Mahasiswa akan menerima notifikasi otomatis setelah Anda submit.
        </div>
        <Input label="Tanggal & jam baru" type="datetime-local" value={tanggal} onChange={(e) => setTanggal((e.target as HTMLInputElement).value)} />
        <Select label="Ruangan (opsional — kosongkan untuk pakai ruangan default kelas)" value={ruanganId} onChange={(e) => setRuanganId((e.target as HTMLSelectElement).value)}>
          <option value="">— pakai ruangan default —</option>
          {ruangan.data?.items.map((r) => (
            <option key={r.id} value={r.id}>{r.kode} — {r.nama} ({r.kapasitas} kursi)</option>
          ))}
        </Select>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Alasan reschedule</label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            placeholder="mis. Dosen ada dinas luar kota, dipindah ke Rabu sore."
          />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" disabled={pending} onClick={submit}>{pending ? 'Memindah…' : 'Reschedule'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
