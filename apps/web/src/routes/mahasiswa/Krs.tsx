import { useMemo, useState } from 'react';
import { Alert, Button } from '@/ds';
import { Send, Trash2, Undo2, Printer, History, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKrs, usePenawaran, useKrsActions, type KrsItem } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { TableSkeletonRows } from '@/components/Skeleton';
import { formatTanggalWaktu, capitalize } from '@/lib/format';
import { ApiError } from '@/lib/api';

const HARI_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export function MahasiswaKrs() {
  const penawaran = usePenawaran();
  const krs = useKrs();
  const { addItem, removeItem, submit, withdraw, dropItem } = useKrsActions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [sembunyikanLulusBagus, setSembunyikanLulusBagus] = useState(false);
  const navigate = useNavigate();

  const sudahDipilih = useMemo(() => {
    // item ditolak/drop tidak menghalangi pemilihan ulang
    return new Set(
      (krs.data?.items ?? [])
        .filter((i) => i.status !== 'ditolak')
        .map((i) => i.kelas.id),
    );
  }, [krs.data]);

  const inKrs = krs.data?.inKrsPeriode ?? false;
  const inPrs = krs.data?.inPrsPeriode ?? false;
  const periodeAktif = inKrs || inPrs;

  const onAdd = async (kelasId: string) => {
    setActionError(null);
    try { await addItem.mutateAsync(kelasId); }
    catch (e) { if (e instanceof ApiError) setActionError(e.message); }
  };
  const onRemove = async (id: string) => {
    setActionError(null);
    try { await removeItem.mutateAsync(id); }
    catch (e) { if (e instanceof ApiError) setActionError(e.message); }
  };
  const onSubmit = async () => {
    setActionError(null);
    try { await submit.mutateAsync(); }
    catch (e) { if (e instanceof ApiError) setActionError(e.message); }
  };
  const onWithdraw = async () => {
    setActionError(null);
    try { await withdraw.mutateAsync(); }
    catch (e) { if (e instanceof ApiError) setActionError(e.message); }
  };
  const onDrop = async (id: string) => {
    setActionError(null);
    if (!confirm('Drop kelas ini? Tindakan ini perlu validasi Akademik dan terekam di riwayat.')) return;
    try { await dropItem.mutateAsync(id); }
    catch (e) { if (e instanceof ApiError) setActionError(e.message); }
  };

  const totalSks = krs.data?.totalSks ?? 0;
  const maxSks = krs.data?.maxSks ?? 24;
  const status = krs.data?.status ?? 'kosong';
  const hasDraft = (krs.data?.items ?? []).some((it) => it.status === 'draft');
  const hasDiajukan = (krs.data?.items ?? []).some((it) => it.status === 'diajukan');
  const canSubmit = hasDraft && periodeAktif;
  const canWithdraw = hasDiajukan && periodeAktif;
  const canPrint = status === 'disetujui';
  const catatanAkademik = useMemo(() => {
    const notes = (krs.data?.items ?? [])
      .map((i) => i.catatan?.trim())
      .filter((c): c is string => !!c);
    return [...new Set(notes)].join(' · ') || null;
  }, [krs.data]);
  const kelasSorted = useMemo(() => {
    if (!penawaran.data) return [];
    let list = [...penawaran.data.kelas];
    if (sembunyikanLulusBagus) {
      // Sembunyikan MK yang sudah lulus dengan nilai ≥ B (bobot ≥ 3.0)
      list = list.filter((k) => !(k.riwayat?.lulus && (k.riwayat?.bobot ?? 0) >= 3.0));
    }
    return list.sort((a, b) => {
      const ah = a.hari ? HARI_ORDER.indexOf(a.hari) : 99;
      const bh = b.hari ? HARI_ORDER.indexOf(b.hari) : 99;
      if (ah !== bh) return ah - bh;
      return (a.jamMulai ?? '').localeCompare(b.jamMulai ?? '');
    });
  }, [penawaran.data, sembunyikanLulusBagus]);

  // Hitung berapa MK yang sudah lulus bagus (≥B) — untuk label checkbox
  const jumlahLulusBagus = useMemo(() => {
    return (penawaran.data?.kelas ?? []).filter((k) => k.riwayat?.lulus && (k.riwayat?.bobot ?? 0) >= 3.0).length;
  }, [penawaran.data]);

  return (
    <div className="stack">
      <PageHead
        eyebrow={penawaran.data ? `SEMESTER ${penawaran.data.semester.jenis.toUpperCase()} ${penawaran.data.semester.kode}` : ''}
        title="Kartu Rencana Studi"
        subtitle={
          penawaran.data?.semester.krsSelesai
            ? `Periode KRS ditutup ${formatTanggalWaktu(penawaran.data.semester.krsSelesai)}`
            : undefined
        }
        right={<StatusPill status={status} />}
      />

      {actionError && <Alert variant="danger" title="Gagal">{actionError}</Alert>}
      {!periodeAktif && <Alert variant="warning" title="Periode KRS/PRS telah ditutup">Anda tidak dapat menambah/menghapus kelas.</Alert>}
      {inPrs && (
        <Alert variant="info" title="Periode PRS (Perubahan Rencana Studi)">
          {krs.data?.semester.prsSelesai
            ? `Anda dapat menambah atau men-drop kelas hingga ${formatTanggalWaktu(krs.data.semester.prsSelesai)}. Perubahan tetap memerlukan validasi Akademik.`
            : 'Anda dapat menambah atau men-drop kelas. Perubahan tetap memerlukan validasi Akademik.'}
        </Alert>
      )}
      {status === 'ditolak' && catatanAkademik && (
        <Alert variant="danger" title="KRS ditolak oleh Akademik">
          Catatan: {catatanAkademik}. Silakan perbaiki lalu ajukan kembali.
        </Alert>
      )}
      {hasDiajukan && (
        <Alert variant="info" title="KRS sedang menunggu validasi">
          Akademik akan memeriksa pengajuan Anda. Anda masih dapat menarik kembali selama periode berlangsung.
        </Alert>
      )}

      <div className="krs-layout">
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>Penawaran kelas</h3>
            {jumlahLulusBagus > 0 && (
              <label className="row" style={{ gap: 6, alignItems: 'center', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sembunyikanLulusBagus}
                  onChange={(e) => setSembunyikanLulusBagus(e.target.checked)}
                />
                Sembunyikan MK yang sudah lulus (≥ B) — {jumlahLulusBagus} MK
              </label>
            )}
          </div>
          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Mata Kuliah</th>
                  <th className="center">SKS</th>
                  <th>Kelas</th>
                  <th>Jadwal</th>
                  <th>Dosen</th>
                  <th className="center">Sisa</th>
                  <th>Riwayat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {penawaran.isLoading && <TableSkeletonRows cols={9} rows={5} />}
                {kelasSorted.map((k) => {
                  const dipilih = sudahDipilih.has(k.id);
                  const penuh = k.terisi >= k.kapasitas;
                  const riw = k.riwayat;
                  return (
                    <tr key={k.id}>
                      <td className="mono">
                        {k.kodeMK}
                        {k.jenisMK === 'wajib_universitas' && (
                          <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>Univ.</div>
                        )}
                      </td>
                      <td>{k.namaMK}</td>
                      <td className="num">{k.sks}</td>
                      <td>{k.kodeKelas}</td>
                      <td className="mono">
                        {k.hari ? `${capitalize(k.hari)}, ${k.jamMulai}–${k.jamSelesai}` : '—'}
                        {k.ruangan && <span className="muted"> · {k.ruangan}</span>}
                      </td>
                      <td>{k.dosen}</td>
                      <td className="num">{k.kapasitas - k.terisi}/{k.kapasitas}</td>
                      <td style={{ fontSize: 'var(--text-xs)' }}>
                        {riw == null ? (
                          <span className="muted">—</span>
                        ) : riw.lulus ? (
                          <span className="pill pill--success" title={`Sudah lulus dengan nilai ${riw.nilaiHuruf ?? '—'}`}>
                            Lulus {riw.nilaiHuruf ?? ''}
                          </span>
                        ) : (
                          <span className="pill pill--warning" title="Mengulang — sebelumnya tidak lulus">Mengulang</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant={dipilih ? 'ghost' : 'secondary'}
                          disabled={dipilih || penuh || !periodeAktif || addItem.isPending}
                          onClick={() => onAdd(k.id)}
                        >
                          {dipilih ? 'Dipilih' : penuh ? 'Penuh' : 'Tambah'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {penawaran.data && kelasSorted.length === 0 && (
                  <tr><td colSpan={9} className="muted center">Belum ada penawaran.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="krs-summary">
          <h3>Ringkasan KRS</h3>
          <div className="krs-summary__row">
            <span className="muted">Status</span>
            <StatusPill status={status} />
          </div>
          <div className="krs-summary__row">
            <span className="muted">Total SKS</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalSks} / {maxSks}</strong>
          </div>
          {krs.data?.prevIp != null && (
            <div className="krs-summary__row" style={{ fontSize: 'var(--text-xs)' }}>
              <span className="muted">Batas SKS (IP {krs.data.prevIp.toFixed(2)})</span>
              <span className="muted" style={{ fontFamily: 'var(--font-mono)' }}>{maxSks}</span>
            </div>
          )}
          <div className="krs-summary__row">
            <span className="muted">Jumlah MK</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{krs.data?.items.length ?? 0}</strong>
          </div>
          <div className="krs-summary__divider" />

          <div className="stack" style={{ gap: 8, maxHeight: 240, overflow: 'auto' }}>
            {(krs.data?.items ?? []).map((it: KrsItem) => {
              const isDropped = it.status === 'ditolak' && it.catatan?.includes('PRS');
              return (
                <div key={it.id} style={{ fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'space-between', gap: 8, opacity: it.status === 'ditolak' ? 0.6 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'var(--text-strong)', textDecoration: it.status === 'ditolak' ? 'line-through' : 'none' }}>
                      {it.kelas.namaMK}
                    </strong>
                    <div className="muted">
                      {it.kelas.kodeMK} · {it.kelas.sks} SKS
                      {isDropped && ' · Drop PRS'}
                    </div>
                  </div>
                  {(it.status === 'draft' || it.status === 'ditolak') && periodeAktif && !isDropped && (
                    <Button size="sm" variant="ghost" onClick={() => onRemove(it.id)} leftIcon={<Trash2 size={14} />}>
                      Hapus
                    </Button>
                  )}
                  {it.status === 'disetujui' && inPrs && (
                    <Button size="sm" variant="danger" onClick={() => onDrop(it.id)} leftIcon={<MinusCircle size={14} />}>
                      Drop
                    </Button>
                  )}
                </div>
              );
            })}
            {(!krs.data || krs.data.items.length === 0) && <p className="muted" style={{ margin: 0 }}>Belum ada kelas dipilih.</p>}
          </div>

          <div className="krs-summary__divider" />

          {hasDraft && (
            <Button
              block
              variant="primary"
              disabled={!canSubmit || submit.isPending}
              onClick={onSubmit}
              leftIcon={<Send size={16} />}
            >
              {submit.isPending
                ? 'Mengirim…'
                : inPrs
                  ? 'Ajukan perubahan'
                  : status === 'ditolak'
                    ? 'Ajukan ulang'
                    : 'Ajukan KRS'}
            </Button>
          )}
          {hasDiajukan && (
            <Button
              block
              variant="secondary"
              disabled={!canWithdraw || withdraw.isPending}
              onClick={onWithdraw}
              leftIcon={<Undo2 size={16} />}
              style={hasDraft ? { marginTop: 'var(--space-2)' } : undefined}
            >
              {withdraw.isPending ? 'Memproses…' : 'Tarik kembali'}
            </Button>
          )}

          <div className="krs-summary__actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canPrint}
              onClick={() => navigate('/mahasiswa/krs/cetak')}
              leftIcon={<Printer size={14} />}
            >
              Cetak KRS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/mahasiswa/krs/riwayat')}
              leftIcon={<History size={14} />}
            >
              Riwayat
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
