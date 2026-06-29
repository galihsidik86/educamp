import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Select } from '@/ds';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';
import {
  useAkademikKrs, useAkademikKrsDetail, useAkademikValidasiKrs,
  useProdi, useKelasAdmin, useAkademikKrsItemActions,
} from '@/lib/queries-akademik';
import { Modal } from '@/components/Modal';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { capitalize } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AdminValidasiKrsList() {
  const [filters, setFilters] = useState({ status: 'diajukan', prodiId: '' });
  const { data, isLoading, error } = useAkademikKrs(filters);
  const prodi = useProdi();
  const perlu = data?.items.filter((i) => i.perluValidasi).length ?? 0;

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Validasi KRS"
        subtitle="Kelola pengajuan KRS lintas mahasiswa semester aktif."
      />

      {error && error instanceof ApiError && error.status === 404 && /semester aktif/i.test(error.message) ? (
        <Alert variant="info" title="Belum ada semester aktif">
          Validasi KRS butuh semester aktif. Buat Tahun Ajaran & Semester (centang "Aktif") di menu{' '}
          <Link to="/akademik/periode" style={{ color: 'var(--text-link)' }}>Periode KRS</Link> dulu.
        </Alert>
      ) : error ? (
        <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>
      ) : null}
      {perlu > 0 && filters.status !== 'diajukan' && (
        <Alert variant="info" title={`${perlu} mahasiswa menunggu validasi`}>
          Ganti filter status ke "diajukan" untuk fokus pada antrian.
        </Alert>
      )}

      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <Select label="Status KRS" value={filters.status} onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            <option value="draft">Draft</option>
            <option value="diajukan">Diajukan</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </Select>
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Prodi" value={filters.prodiId} onChange={(e) => setFilters({ ...filters, prodiId: (e.target as HTMLSelectElement).value })}>
            <option value="">Semua</option>
            {prodi.data?.items.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </Select>
        </div>
      </div>

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th><th>Prodi</th>
              <th className="center">Angkatan</th>
              <th>DPA</th><th>Status</th>
              <th className="num">MK</th>
              <th className="num">SKS</th><th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="muted center">Memuat…</td></tr>}
            {data?.items.length === 0 && <tr><td colSpan={9} className="muted center">Tidak ada data.</td></tr>}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.nim}</td>
                <td>{m.nama}</td>
                <td>{m.prodi.nama}</td>
                <td className="center mono">{m.angkatan}</td>
                <td>{m.dpa ?? <span className="muted">—</span>}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <StatusPill status={m.krsStatus} />
                    {m.isPrsRevisi && (
                      <span className="pill pill--prs" title="Revisi saat PRS">
                        Revisi PRS
                      </span>
                    )}
                  </div>
                </td>
                <td className="num">{m.krsTotal}</td>
                <td className="num">{m.krsSks}</td>
                <td className="num">
                  <Link to={`/akademik/krs/${m.id}`} style={{ color: 'var(--text-link)', textDecoration: 'none' }}>
                    Detail <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminValidasiKrsDetail() {
  const { mahasiswaId } = useParams<{ mahasiswaId: string }>();
  const { data, isLoading, error } = useAkademikKrsDetail(mahasiswaId);
  const validasi = useAkademikValidasiKrs(mahasiswaId);
  const itemActions = useAkademikKrsItemActions();
  const [catatan, setCatatan] = useState('');
  const [cicilanUkt, setCicilanUkt] = useState<number | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actOk, setActOk] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Mahasiswa tidak ditemukan.</Alert>;

  const diajukan = data.items.filter((i) => i.status === 'diajukan');
  const prsTambah = data.items.filter((i) => i.tipe === 'prs-tambah');
  const prsDrop = data.items.filter((i) => i.tipe === 'prs-drop');
  const isPrsContext = prsTambah.length > 0 || prsDrop.length > 0;

  const act = async (action: 'setujui' | 'tolak') => {
    setActErr(null); setActOk(null);
    try {
      const effectiveCicilan = cicilanUkt ?? data.mahasiswa.defaultCicilanUkt ?? 1;
      const r = await validasi.mutateAsync({ action, catatan: catatan.trim() || undefined, cicilanUkt: action === 'setujui' ? effectiveCicilan : undefined });
      const ti = (r as any).tagihanInfo;
      let msg = `${action === 'setujui' ? 'Disetujui' : 'Ditolak'} (${(r as any).updated} item)`;
      if (ti?.dibuat) {
        msg += ti.cicilan > 1
          ? ` · Tagihan UKT dibuat ${ti.cicilan} cicilan bulanan, total Rp ${ti.nominal.toLocaleString('id-ID')}`
          : ` · Tagihan UKT Rp ${ti.nominal.toLocaleString('id-ID')} dibuat`;
        if (ti.potonganBeasiswa > 0) msg += ` (potongan beasiswa Rp ${ti.potonganBeasiswa.toLocaleString('id-ID')})`;
      } else if (ti?.fullBeasiswa) {
        msg += ` · Mahasiswa penerima beasiswa penuh — tidak ada tagihan UKT`;
      } else if (ti?.sudahAda) {
        msg += ` · Tagihan UKT sudah ada sebelumnya`;
      }
      setActOk(msg);
      setCatatan('');
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  return (
    <div className="stack">
      <Link to="/akademik/krs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar
      </Link>

      <PageHead
        eyebrow="VALIDASI KRS"
        title={data.mahasiswa.nama}
        subtitle={`NIM ${data.mahasiswa.nim} · ${data.mahasiswa.prodi.nama} · Angkatan ${data.mahasiswa.angkatan}${data.mahasiswa.dpa ? ' · DPA: ' + data.mahasiswa.dpa.nama : ''}`}
        right={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Tambah Kelas Manual
          </Button>
        }
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {actOk && <Alert variant="success" title="Berhasil">{actOk}</Alert>}
      {isPrsContext && (
        <Alert variant="info" title="Pengajuan revisi PRS">
          Mahasiswa mengajukan perubahan saat periode PRS:
          {prsTambah.length > 0 && <> <strong>{prsTambah.length}</strong> tambah</>}
          {prsTambah.length > 0 && prsDrop.length > 0 && ' · '}
          {prsDrop.length > 0 && <> <strong>{prsDrop.length}</strong> drop</>}
          . Validasi hanya berlaku untuk item berstatus "diajukan"; drop sudah final.
        </Alert>
      )}

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th>Kode</th><th>Mata Kuliah</th>
              <th className="center">SKS</th><th>Kelas</th>
              <th>Jadwal</th><th>Dosen</th><th>Tipe</th><th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && <tr><td colSpan={9} className="muted center">Belum ada KRS.</td></tr>}
            {data.items.map((it) => (
              <tr key={it.id} style={{ opacity: it.tipe === 'prs-drop' ? 0.65 : 1 }}>
                <td className="mono">{it.kelas.kodeMK}</td>
                <td style={{ textDecoration: it.tipe === 'prs-drop' ? 'line-through' : 'none' }}>{it.kelas.namaMK}</td>
                <td className="num">{it.kelas.sks}</td>
                <td>{it.kelas.kodeKelas}</td>
                <td className="mono">
                  {it.kelas.hari ? `${capitalize(it.kelas.hari)}, ${it.kelas.jamMulai}–${it.kelas.jamSelesai}` : '—'}
                  {it.kelas.ruangan && <span className="muted"> · {it.kelas.ruangan}</span>}
                </td>
                <td>{it.kelas.dosen}</td>
                <td>
                  {it.tipe === 'prs-tambah' && <span className="pill pill--prs">PRS Tambah</span>}
                  {it.tipe === 'prs-drop' && <span className="pill pill--drop">PRS Drop</span>}
                  {it.tipe === 'krs' && <span className="muted">KRS</span>}
                </td>
                <td><StatusPill status={it.status} /></td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => {
                      if (!confirm(`Hapus ${it.kelas.kodeMK} ${it.kelas.kodeKelas} dari KRS mahasiswa?`)) return;
                      itemActions.removeItem.mutate(it.id, {
                        onSuccess: () => setActOk('Item dihapus.'),
                        onError: (e: any) => setActErr(e instanceof ApiError ? e.message : 'Gagal'),
                      });
                    }}
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>SKS efektif (tidak termasuk drop)</td>
              <td className="num"><strong>{data.sksEfektif}</strong></td>
              <td colSpan={6} className="muted">Total seluruh entri: {data.totalSks}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {diajukan.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>
            {isPrsContext ? `Validasi ${diajukan.length} perubahan PRS` : `Validasi ${diajukan.length} item`}
          </h3>
          {!isPrsContext && (
            <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end', marginBottom: 'var(--space-2)' }}>
              <div style={{ minWidth: 260 }}>
                <Select
                  label={`Skema Pembayaran UKT (default mhs: ${data.mahasiswa.defaultCicilanUkt === 1 ? 'Sekaligus' : `${data.mahasiswa.defaultCicilanUkt}× cicilan`})`}
                  value={String(cicilanUkt ?? data.mahasiswa.defaultCicilanUkt ?? 1)}
                  onChange={(e) => setCicilanUkt(Number((e.target as HTMLSelectElement).value))}
                >
                  <option value="1">Sekaligus (1× pembayaran)</option>
                  <option value="2">Cicilan 2× bulanan</option>
                  <option value="3">Cicilan 3× bulanan</option>
                  <option value="4">Cicilan 4× bulanan</option>
                  <option value="6">Cicilan 6× bulanan</option>
                  <option value="12">Cicilan 12× bulanan</option>
                </Select>
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-xs)', alignSelf: 'center', paddingBottom: 6 }}>
                Tagihan UKT akan dihitung otomatis dari kategori UKT mahasiswa + dipotong beasiswa aktif (jika ada).
              </div>
            </div>
          )}
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan untuk mahasiswa (opsional)…"
            className="tz-input"
            style={{ width: '100%', minHeight: 80, padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
          <div className="row" style={{ marginTop: 12, gap: 'var(--space-2)' }}>
            <Button variant="primary" leftIcon={<CheckCircle2 size={16} />} disabled={validasi.isPending} onClick={() => act('setujui')}>
              {isPrsContext ? 'Setujui perubahan' : 'Setujui semua'}
            </Button>
            <Button variant="danger" leftIcon={<XCircle size={16} />} disabled={validasi.isPending} onClick={() => act('tolak')}>
              {isPrsContext ? 'Tolak perubahan' : 'Tolak semua'}
            </Button>
          </div>
        </Card>
      )}

      {mahasiswaId && (
        <AddKrsItemModal
          open={addOpen}
          mahasiswaId={mahasiswaId}
          alreadyTakenKelasIds={data.items.filter((i) => i.status !== 'ditolak').map((i) => i.kelasId)}
          onClose={() => setAddOpen(false)}
          onErr={setActErr}
          onOk={(m) => setActOk(m)}
        />
      )}
    </div>
  );
}

function AddKrsItemModal({
  open, mahasiswaId, alreadyTakenKelasIds, onClose, onErr, onOk,
}: {
  open: boolean;
  mahasiswaId: string;
  alreadyTakenKelasIds: string[];
  onClose: () => void;
  onErr: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const itemActions = useAkademikKrsItemActions();
  const kelasList = useKelasAdmin();
  const [kelasId, setKelasId] = useState('');
  const [statusVal, setStatusVal] = useState<'draft' | 'diajukan' | 'disetujui'>('disetujui');
  const [catatan, setCatatan] = useState('');
  const takenSet = new Set(alreadyTakenKelasIds);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Kelas ke KRS Mahasiswa" width={600}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kelasId) { onErr('Pilih kelas dulu'); return; }
          itemActions.addItem.mutate(
            { mahasiswaId, body: { kelasId, status: statusVal, catatan: catatan.trim() || undefined } },
            {
              onSuccess: () => {
                onOk('Kelas ditambahkan ke KRS.');
                setKelasId(''); setCatatan('');
                onClose();
              },
              onError: (er: any) => onErr(er instanceof ApiError ? er.message : 'Gagal menambah'),
            },
          );
        }}
      >
        <Alert variant="info">
          Penambahan manual oleh akademik bypass validasi periode KRS, prasyarat, bentrok jadwal, dan max SKS. Pastikan kelas yang dipilih benar.
        </Alert>
        <Select label="Kelas" value={kelasId} onChange={(e) => setKelasId((e.target as HTMLSelectElement).value)}>
          <option value="">Pilih kelas…</option>
          {kelasList.data?.items.map((k) => {
            const isTaken = takenSet.has(k.id);
            const label = `${k.mataKuliah.kode} ${k.kodeKelas} — ${k.mataKuliah.nama} · ${k.semester.kode}${isTaken ? ' (sudah ada di KRS)' : ''}`;
            return <option key={k.id} value={k.id} disabled={isTaken}>{label}</option>;
          })}
        </Select>
        <div className="row" style={{ gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <Select label="Status awal" value={statusVal} onChange={(e) => setStatusVal((e.target as HTMLSelectElement).value as any)}>
              <option value="disetujui">Disetujui (langsung sah)</option>
              <option value="diajukan">Diajukan (perlu validasi)</option>
              <option value="draft">Draft</option>
            </Select>
          </div>
        </div>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan (opsional, mis. alasan late registration)…"
          className="tz-input"
          rows={2}
          style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
        />
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" disabled={itemActions.addItem.isPending}>
            {itemActions.addItem.isPending ? 'Menyimpan…' : 'Tambahkan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
