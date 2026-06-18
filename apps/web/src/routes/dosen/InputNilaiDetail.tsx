import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Save, CheckCircle2, Upload } from 'lucide-react';
import { useDosenKelasDetail, useUpdateNilai, useFinalizeAllNilai, useImportNilai, type NilaiPatch } from '@/lib/queries-dosen';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { capitalize, formatTanggal } from '@/lib/format';
import { ApiError } from '@/lib/api';

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
  const [batchMsg, setBatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleFinalizeAll = async () => {
    if (!confirm('Finalisasi semua nilai yang sudah lengkap di kelas ini? Mahasiswa akan menerima notifikasi.')) return;
    setBatchMsg(null);
    try {
      const r = await finalizeAll.mutateAsync();
      setBatchMsg({ ok: r.ok, text: r.message });
    } catch (e) {
      setBatchMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Gagal finalisasi batch' });
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
            <Button variant="ghost" size="sm" leftIcon={<Upload size={14} />} disabled={!periodeAktif} onClick={() => setImportOpen(true)}>
              Import Excel
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
            {data.peserta.map((p) => {
              const r = rows[p.krsId];
              if (!r) return null;
              return (
                <tr key={p.krsId}>
                  <td className="mono">{p.mahasiswa.nim}</td>
                  <td>{p.mahasiswa.nama}</td>
                  <NumCell value={r.tugas}     onChange={(v) => setRow(p.krsId, { tugas: v })}     disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.uts}       onChange={(v) => setRow(p.krsId, { uts: v })}       disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.uas}       onChange={(v) => setRow(p.krsId, { uas: v })}       disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.praktikum} onChange={(v) => setRow(p.krsId, { praktikum: v })} disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.kehadiran} onChange={(v) => setRow(p.krsId, { kehadiran: v })} disabled={!periodeAktif || r.status === 'finalized'} />
                  <NumCell value={r.nilaiAngka} onChange={(v) => setRow(p.krsId, { nilaiAngka: v })} disabled={!periodeAktif || r.status === 'finalized'} strong />
                  <td className="center mono"><strong>{p.nilai?.nilaiHuruf ?? '—'}</strong></td>
                  <td><StatusPill status={r.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
          Tip — input <strong>Nilai Angka</strong> akan otomatis menghitung huruf (A ≥85, AB ≥75, B ≥70, BC ≥65, C ≥56, D ≥40, E &lt;40) dan bobot saat disimpan.
          Untuk menfinalisasi, nilai angka harus terisi.
        </p>
      </Card>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={`Import Nilai · ${k.kodeMK} ${k.kodeKelas}`}
        expectedHeaders={['nim']}
        optionalHeaders={['tugas', 'uts', 'uas', 'praktikum', 'kehadiran', 'nilaiAngka', 'status']}
        templateFilename={`template-nilai-${k.kodeMK}-${k.kodeKelas}.xlsx`}
        keyHeader="NIM"
        notes={<>Nilai komponen 0–100. <code>nilaiAngka</code> opsional — kalau diisi, huruf & bobot dihitung otomatis. <code>status</code>: belum/draft/finalized (default <code>draft</code>; <code>finalized</code> wajib punya nilaiAngka).</>}
        sampleRows={data.peserta.slice(0, 3).map((p) => ({ nim: p.mahasiswa.nim, tugas: 80, uts: 75, uas: 78, kehadiran: 95 }))}
        importMutation={importNilai}
      />
    </div>
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
