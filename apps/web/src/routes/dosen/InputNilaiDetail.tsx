import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Save, CheckCircle2, Upload, Calculator, SlidersHorizontal, RefreshCw, Search } from 'lucide-react';
import {
  useDosenKelasDetail, useUpdateNilai, useFinalizeAllNilai, useImportNilai, useUpdateBobotNilai,
  useDosenKelasNilaiSumber, useSinkronNilai,
  hitungNilaiDariBobot,
  type NilaiPatch, type BobotNilai,
} from '@/lib/queries-dosen';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/ConfirmDialog';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { capitalize, formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

const DEFAULT_BOBOT: BobotNilai = { tugas: 20, uts: 30, uas: 40, praktikum: 0, kehadiran: 10 };

type RowDraft = {
  krsId: string;
  tugas: string; uts: string; uas: string; praktikum: string; kehadiran: string;
  nilaiAngka: string;
  status: 'belum' | 'draft' | 'finalized';
  dirty: boolean;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
};

const fromServer = (n: NonNullable<ReturnType<typeof useDosenKelasDetail>['data']>['peserta'][number]): RowDraft => ({
  krsId: n.krsId,
  tugas: n.nilai?.tugas?.toString() ?? '',
  uts: n.nilai?.uts?.toString() ?? '',
  uas: n.nilai?.uas?.toString() ?? '',
  praktikum: n.nilai?.praktikum?.toString() ?? '',
  kehadiran: n.nilai?.kehadiran?.toString() ?? '',
  nilaiAngka: n.nilai?.nilaiAngka?.toString() ?? '',
  status: n.nilai?.status ?? 'belum',
  dirty: false,
  saving: false,
  message: null,
});

const numOrNull = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function DosenInputNilaiDetail() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const { data, isLoading, error } = useDosenKelasDetail(kelasId);
  const update = useUpdateNilai(kelasId);
  const finalizeAll = useFinalizeAllNilai(kelasId);
  const importNilai = useImportNilai(kelasId);
  const updateBobot = useUpdateBobotNilai(kelasId);
  const nilaiSumber = useDosenKelasNilaiSumber(kelasId);
  const sinkronNilai = useSinkronNilai(kelasId);
  const confirm = useConfirm();
  const [batchMsg, setBatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bobotOpen, setBobotOpen] = useState(false);
  const bobot: BobotNilai = data?.kelas.bobotNilai ?? DEFAULT_BOBOT;
  const bobotConfigured = data?.kelas.bobotNilai != null;

  const handleFinalizeAll = async () => {
    const ok = await confirm({
      title: 'Finalisasi semua nilai?',
      message: 'Semua nilai yang sudah lengkap di kelas ini akan difinalisasi. Mahasiswa akan menerima notifikasi.',
      variant: 'warning',
      confirmLabel: 'Finalisasi',
    });
    if (!ok) return;
    setBatchMsg(null);
    try {
      const r = await finalizeAll.mutateAsync();
      setBatchMsg({ ok: r.ok, text: r.message });
    } catch (e) {
      setBatchMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Gagal finalisasi batch' });
    }
  };

  const handleSinkronAll = async () => {
    const ok = await confirm({
      title: 'Sinkron nilai semua mahasiswa?',
      message: (
        <>
          Isi kolom <strong>Tugas / UTS / UAS / Praktikum</strong> dari rerata submission modul Pengumpulan untuk seluruh mahasiswa.
          Mahasiswa dengan nilai <strong>finalized</strong> akan di-skip. nilaiAngka, huruf, dan bobot tidak disentuh.
        </>
      ),
      variant: 'primary',
      confirmLabel: 'Sinkron',
    });
    if (!ok) return;
    setBatchMsg(null);
    try {
      const r = await sinkronNilai.mutateAsync();
      setBatchMsg({ ok: true, text: r.message });
    } catch (e) {
      setBatchMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Gagal sinkron' });
    }
  };
  const [rows, setRows] = useState<Record<string, RowDraft>>({});

  useEffect(() => {
    if (!data) return;
    setRows((prev) => {
      const next: Record<string, RowDraft> = {};
      for (const p of data.peserta) {
        next[p.krsId] = prev[p.krsId]?.dirty ? prev[p.krsId]! : fromServer(p);
      }
      return next;
    });
  }, [data]);

  const setRow = (krsId: string, patch: Partial<RowDraft>) =>
    setRows((r) => ({ ...r, [krsId]: { ...r[krsId]!, ...patch, dirty: true, message: null } }));

  const save = async (krsId: string, finalize = false) => {
    const r = rows[krsId];
    if (!r) return;
    setRows((rs) => ({ ...rs, [krsId]: { ...r, saving: true, message: null } }));

    const patch: NilaiPatch = {
      tugas: numOrNull(r.tugas),
      uts: numOrNull(r.uts),
      uas: numOrNull(r.uas),
      praktikum: numOrNull(r.praktikum),
      kehadiran: numOrNull(r.kehadiran),
      nilaiAngka: numOrNull(r.nilaiAngka),
      status: finalize ? 'finalized' : r.status,
    };
    try {
      await update.mutateAsync({ krsId, patch });
      setRows((rs) => ({
        ...rs,
        [krsId]: { ...rs[krsId]!, dirty: false, saving: false, message: { type: 'success', text: finalize ? 'Difinalisasi' : 'Tersimpan' } },
      }));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal menyimpan';
      setRows((rs) => ({ ...rs, [krsId]: { ...rs[krsId]!, saving: false, message: { type: 'error', text: msg } } }));
    }
  };

  const periodeAktif = useMemo(() => {
    if (!data?.kelas.periodeNilai.selesai) return true;
    return new Date(data.kelas.periodeNilai.selesai) > new Date();
  }, [data]);

  const [q, setQ] = useState('');
  const peserta = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data?.peserta ?? [];
    return (data?.peserta ?? []).filter((p) =>
      p.mahasiswa.nim.toLowerCase().includes(query) || p.mahasiswa.nama.toLowerCase().includes(query),
    );
  }, [data, q]);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Kelas tidak ditemukan atau Anda bukan pengampu.</Alert>;

  const k = data.kelas;

  return (
    <div className="stack">
      <Link to="/dosen/nilai" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar kelas
      </Link>

      <PageHead
        eyebrow={`KELAS ${k.kodeKelas} · ${k.semester.nama.toUpperCase()}`}
        title={k.namaMK}
        subtitle={`${k.kodeMK} · ${k.sks} SKS · ${k.hari ? capitalize(k.hari) + ', ' + k.jamMulai + '–' + k.jamSelesai : '—'}${k.ruangan ? ' · ' + k.ruangan : ''}`}
        right={
          <div className="row" style={{ gap: 6 }}>
            <Link to={`/dosen/nilai/${k.id}/cpmk`}>
              <Button variant="ghost" size="sm">Input Nilai CPMK</Button>
            </Link>
            <Link to={`/dosen/nilai/${k.id}/komponen-evaluasi`}>
              <Button variant="ghost" size="sm">Komponen Evaluasi (IKU 7)</Button>
            </Link>
            <Button variant="ghost" size="sm" leftIcon={<Upload size={14} />} disabled={!periodeAktif} onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              disabled={!periodeAktif || sinkronNilai.isPending}
              onClick={handleSinkronAll}
              title="Isi otomatis kolom Tugas/UTS/UAS/Praktikum dari rerata submission semua mahasiswa"
            >
              {sinkronNilai.isPending ? 'Sinkron…' : 'Sinkron Semua'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 size={14} />}
              disabled={!periodeAktif || finalizeAll.isPending}
              onClick={handleFinalizeAll}
            >
              {finalizeAll.isPending ? 'Memproses…' : 'Finalisasi Semua'}
            </Button>
          </div>
        }
      />

      {batchMsg && (
        <Alert variant={batchMsg.ok ? 'success' : 'warning'} title={batchMsg.ok ? 'Selesai' : 'Perhatian'}>
          {batchMsg.text}
        </Alert>
      )}

      {k.team && k.team.length > 1 && (
        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Team Teaching · Peran Anda: {capitalize(k.peran)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {k.team.map((t) => (
              <span key={t.dosenId} style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-sunken)', fontSize: 'var(--text-xs)' }}>
                <span className="mono muted" style={{ marginRight: 4 }}>{capitalize(t.peran)}:</span>
                {[t.gelarDepan, t.nama, t.gelarBelakang].filter(Boolean).join(' ')}
              </span>
            ))}
          </div>
        </Card>
      )}

      {!periodeAktif && (
        <Alert variant="warning" title="Periode penilaian telah ditutup">
          Batas: {formatTanggal(k.periodeNilai.selesai)} — perubahan tidak akan tersimpan.
        </Alert>
      )}

      <Card>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Bobot komponen {bobotConfigured ? '· dikonfigurasi' : '· default'}
            </div>
            <div className="row" style={{ gap: 'var(--space-3)', marginTop: 6, flexWrap: 'wrap' }}>
              <BobotPill label="Tugas" v={bobot.tugas} />
              <BobotPill label="UTS" v={bobot.uts} />
              <BobotPill label="UAS" v={bobot.uas} />
              <BobotPill label="Praktik" v={bobot.praktikum} />
              <BobotPill label="Hadir" v={bobot.kehadiran} />
            </div>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<SlidersHorizontal size={14} />} onClick={() => setBobotOpen(true)}>
            Atur Bobot
          </Button>
        </div>
      </Card>

      {data.peserta.length > 0 && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 340 }}>
            <Input
              icon={<Search size={16} />}
              placeholder="Cari NIM atau nama…"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      )}
      {data.peserta.length > 0 && peserta.length === 0 && (
        <p className="muted">Tidak ada mahasiswa yang cocok dengan &ldquo;{q.trim()}&rdquo;.</p>
      )}

      <div className="tz-table-wrap" style={{ overflow: 'auto' }}>
        <table className="tz-table" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>NIM</th><th>Nama</th>
              <th className="num">Tugas</th><th className="num">UTS</th><th className="num">UAS</th>
              <th className="num">Praktik</th><th className="num">Hadir%</th>
              <th className="num">Angka</th><th className="center">Huruf</th>
              <th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.peserta.length === 0 && (
              <tr><td colSpan={11} className="muted center">Belum ada peserta di kelas ini.</td></tr>
            )}
            {peserta.map((p) => {
              const r = rows[p.krsId];
              if (!r) return null;
              return (
                <tr key={p.krsId}>
                  <td className="mono">{p.mahasiswa.nim}</td>
                  <td>{p.mahasiswa.nama}</td>
                  {(['tugas', 'uts', 'uas', 'praktikum'] as const).map((k) => (
                    <KomponenSyncCell
                      key={k}
                      value={r[k]}
                      onChange={(v) => setRow(p.krsId, { [k]: v })}
                      disabled={!periodeAktif || r.status === 'finalized'}
                      sumber={nilaiSumber.data?.items[p.mahasiswa.id]?.[k] ?? null}
                      total={nilaiSumber.data?.total[k] ?? 0}
                    />
                  ))}
                  <NumCell value={r.kehadiran} onChange={(v) => setRow(p.krsId, { kehadiran: v })} disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.nilaiAngka} onChange={(v) => setRow(p.krsId, { nilaiAngka: v })} disabled={!periodeAktif || r.status === 'finalized'} strong />
                  <td className="center mono"><strong>{p.nilai?.nilaiHuruf ?? '—'}</strong></td>
                  <td><StatusPill status={r.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!periodeAktif || r.status === 'finalized'}
                        title="Hitung dari komponen × bobot"
                        onClick={() => {
                          const hasil = hitungNilaiDariBobot({
                            tugas: numOrNull(r.tugas), uts: numOrNull(r.uts), uas: numOrNull(r.uas),
                            praktikum: numOrNull(r.praktikum), kehadiran: numOrNull(r.kehadiran),
                          }, bobot);
                          if (hasil != null) setRow(p.krsId, { nilaiAngka: hasil.toString() });
                        }}
                        leftIcon={<Calculator size={12} />}
                      >
                        Hitung
                      </Button>
                      <Button size="sm" variant="secondary" disabled={!r.dirty || r.saving || !periodeAktif} onClick={() => save(p.krsId)} leftIcon={<Save size={12} />}>
                        Simpan
                      </Button>
                      <Button size="sm" variant="primary" disabled={r.saving || r.status === 'finalized' || !periodeAktif} onClick={() => save(p.krsId, true)} leftIcon={<CheckCircle2 size={12} />}>
                        Finalisasi
                      </Button>
                    </div>
                    {r.message && (
                      <div className="muted" style={{ fontSize: 'var(--text-2xs)', marginTop: 4, color: r.message.type === 'error' ? 'var(--danger-fg)' : 'var(--success-fg)' }}>
                        {r.message.text}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Card>
        <p className="muted" style={{ margin: 0, fontSize: 'var(--text-xs)' }}>
          Tip — klik angka biru di bawah sel <strong>Tugas/UTS/UAS/Praktik</strong> untuk mengisi otomatis dari rerata submission modul Pengumpulan; atau klik <strong>Sinkron Semua</strong> di atas untuk seluruh mahasiswa sekaligus.
          Setelah komponen terisi, klik <strong>Hitung</strong> untuk menjumlahkan dengan bobot, atau input <strong>Nilai Angka</strong> langsung.
          Saat disimpan, huruf (A ≥85, AB ≥75, B ≥70, BC ≥65, C ≥56, D ≥40, E &lt;40) dan bobot skala 4 dihitung otomatis. Finalisasi mensyaratkan nilai angka.
        </p>
      </Card>

      <BobotModal
        open={bobotOpen}
        onClose={() => setBobotOpen(false)}
        initial={bobot}
        onSave={async (b) => {
          await updateBobot.mutateAsync(b);
          setBobotOpen(false);
        }}
        saving={updateBobot.isPending}
      />

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={`Import Nilai · ${k.kodeMK} ${k.kodeKelas}`}
        expectedHeaders={['nim']}
        optionalHeaders={['nama', 'tugas', 'uts', 'uas', 'praktikum', 'kehadiran', 'nilaiAngka', 'status']}
        templateFilename={`template-nilai-${k.kodeMK}-${k.kodeKelas}.xlsx`}
        keyHeader="NIM"
        notes={<>Template sudah berisi <strong>{data.peserta.length} mahasiswa peserta kelas ini</strong> — Anda tinggal isi nilai per kolom. Skor komponen 0–100. Kolom <code>nama</code> hanya referensi (tidak diproses server). <code>nilaiAngka</code> opsional — kalau diisi, huruf & bobot dihitung otomatis. <code>status</code>: belum/draft/finalized (default <code>draft</code>; <code>finalized</code> wajib punya nilaiAngka).</>}
        sampleRows={data.peserta.map((p) => ({ nim: p.mahasiswa.nim, nama: p.mahasiswa.nama }))}
        importMutation={importNilai}
      />
    </div>
  );
}

function KomponenSyncCell({
  value, onChange, disabled, sumber, total,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  sumber: { rerata: number; dinilai: number } | null;
  total: number;
}) {
  const show = sumber != null && sumber.dinilai > 0;
  const hint = show ? `≈ ${sumber.rerata} (${sumber.dinilai}/${total})` : null;
  const apply = () => { if (sumber) onChange(sumber.rerata.toString()); };
  return (
    <td className="num">
      <input
        type="number" inputMode="decimal" min={0} max={100} step={0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="tz-input"
        style={{ width: 70, textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '4px 6px' }}
      />
      {hint && (
        <button
          type="button"
          onClick={apply}
          disabled={disabled}
          title={`Klik: isi otomatis dari rerata submission (${sumber!.dinilai} dari ${total} dinilai)`}
          style={{
            display: 'block', marginTop: 2, padding: 0, border: 'none', background: 'none',
            color: 'var(--text-link)', fontSize: 'var(--text-2xs)',
            cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'right', width: '100%',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {hint}
        </button>
      )}
    </td>
  );
}

function NumCell({ value, onChange, disabled, strong }: { value: string; onChange: (v: string) => void; disabled?: boolean; strong?: boolean }) {
  return (
    <td className="num">
      <input
        type="number" inputMode="decimal" min={0} max={100} step={0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="tz-input"
        style={{
          width: 70, textAlign: 'right', fontFamily: 'var(--font-mono)',
          fontWeight: strong ? 600 : 400,
          padding: '4px 6px',
        }}
      />
    </td>
  );
}

function BobotPill({ label, v }: { label: string; v: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{label}</span>
      <strong className="mono" style={{ color: 'var(--text-strong)' }}>{v}%</strong>
    </span>
  );
}

function BobotModal({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean; onClose: () => void;
  initial: BobotNilai;
  onSave: (b: BobotNilai) => Promise<void> | void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<BobotNilai>(initial);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setDraft(initial); setErr(null); }
  }, [open, initial]);

  const sum = draft.tugas + draft.uts + draft.uas + draft.praktikum + draft.kehadiran;
  const sumOk = Math.abs(sum - 100) < 0.01;

  const submit = async () => {
    setErr(null);
    if (!sumOk) { setErr(`Total bobot harus 100% (sekarang ${sum.toFixed(1)}%)`); return; }
    try {
      await onSave(draft);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan bobot');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Atur Bobot Komponen Nilai">
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
        Tentukan persentase tiap komponen. Total harus 100%. Komponen yang bobotnya 0%
        tidak akan diakumulasi saat tombol Hitung dipakai.
      </p>
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        {(['tugas', 'uts', 'uas', 'praktikum', 'kehadiran'] as const).map((k) => (
          <div key={k} className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
            <label style={{ width: 110, textTransform: 'capitalize' }}>{k === 'kehadiran' ? 'Kehadiran' : k === 'uts' || k === 'uas' ? k.toUpperCase() : k}</label>
            <input
              type="number" min={0} max={100} step={0.5}
              value={draft[k]}
              onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) || 0 })}
              className="tz-input mono"
              style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
            />
            <span className="muted">%</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--text-sm)' }}>
          Total: <strong className="mono" style={{ color: sumOk ? 'var(--success-fg)' : 'var(--danger-fg)' }}>{sum.toFixed(1)}%</strong>
        </div>
      </div>
      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-3)' }}>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Batal</Button>
        <Button variant="primary" size="sm" onClick={submit} disabled={saving || !sumOk}>
          {saving ? 'Menyimpan…' : 'Simpan Bobot'}
        </Button>
      </div>
    </Modal>
  );
}
