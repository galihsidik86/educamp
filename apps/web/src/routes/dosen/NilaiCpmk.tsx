import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, Save, Sparkles } from 'lucide-react';
import { useDosenCpmk, useDosenCpmkActions } from '@/lib/queries-obe';
import { PageHead } from '@/components/PageHead';
import { ApiError } from '@/lib/api';

export function DosenNilaiCpmk() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const { data, isLoading, error } = useDosenCpmk(kelasId);
  const { upsert } = useDosenCpmkActions(kelasId);

  // Local edit state: { [krsId]: { [cpmkId]: number | '' } }
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({});
  const [actErr, setActErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, Record<string, string>> = {};
    for (const p of data.peserta) {
      init[p.krsId] = {};
      for (const n of p.nilai) {
        init[p.krsId]![n.cpmkId] = String(n.nilai);
      }
    }
    setGrid(init);
  }, [data]);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>;

  const setCell = (krsId: string, cpmkId: string, value: string) => {
    setGrid((g) => ({
      ...g,
      [krsId]: { ...(g[krsId] ?? {}), [cpmkId]: value.replace(/[^\d.]/g, '') },
    }));
  };

  const save = async () => {
    setActErr(null); setSavedMsg(null);
    const items: Array<{ krsId: string; cpmkId: string; nilai: number }> = [];
    for (const [krsId, row] of Object.entries(grid)) {
      for (const [cpmkId, valStr] of Object.entries(row)) {
        if (valStr === '' || valStr === '.') continue;
        const v = Number(valStr);
        if (!Number.isFinite(v)) continue;
        if (v < 0 || v > 100) { setActErr(`Nilai harus 0-100 (krs ${krsId})`); return; }
        items.push({ krsId, cpmkId, nilai: v });
      }
    }
    if (items.length === 0) { setActErr('Tidak ada nilai untuk disimpan'); return; }
    try {
      const r = await upsert.mutateAsync(items);
      setSavedMsg(`${(r as any).updated ?? items.length} nilai tersimpan.`);
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <Link to={`/dosen/nilai/${kelasId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke input nilai
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={`Nilai CPMK — ${data.kelas.namaMK}`}
        subtitle="Input nilai per Capaian Pembelajaran Mata Kuliah untuk laporan OBE."
        right={
          <Button variant="primary" leftIcon={<Save size={14} />} onClick={save} disabled={upsert.isPending || data.cpmk.length === 0 || data.peserta.length === 0}>
            {upsert.isPending ? 'Menyimpan…' : 'Simpan Nilai CPMK'}
          </Button>
        }
      />

      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
      {savedMsg && <Alert variant="success" title="Tersimpan">{savedMsg}</Alert>}

      {data.cpmk.length === 0 && (
        <Alert variant="info" title="Belum ada CPMK untuk MK ini">
          Akademik perlu menambah CPMK terlebih dahulu di menu OBE. Hubungi BAAK untuk pendefinisian CPMK.
        </Alert>
      )}

      {data.cpmk.length > 0 && (
        <>
          <Card>
            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
              <Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Daftar CPMK
            </div>
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {data.cpmk.map((c) => (
                <div key={c.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong className="mono">{c.kode}</strong>
                    <span className="pill pill--neutral">Bobot {c.bobotPenilaian.toFixed(2)}</span>
                    <span className="pill pill--neutral">Ambang ≥ {c.ambangTercapai}</span>
                    {c.cpl.length > 0 && c.cpl.map((m) => (
                      <span key={m.kode} className="pill pill--neutral">{m.kode}: {m.bobot.toFixed(2)}</span>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{c.deskripsi}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="tz-table-wrap">
            <table className="tz-table">
              <thead>
                <tr>
                  <th>NIM</th>
                  <th>Nama</th>
                  {data.cpmk.map((c) => <th key={c.id} className="num">{c.kode}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.peserta.length === 0 && (
                  <tr><td colSpan={2 + data.cpmk.length} className="muted center">Belum ada peserta KRS disetujui.</td></tr>
                )}
                {data.peserta.map((p) => (
                  <tr key={p.krsId}>
                    <td className="mono">{p.nim}</td>
                    <td>{p.nama}</td>
                    {data.cpmk.map((c) => {
                      const val = grid[p.krsId]?.[c.id] ?? '';
                      const ambangNum = c.ambangTercapai;
                      const num = Number(val);
                      const isOk = val !== '' && Number.isFinite(num) && num >= ambangNum;
                      const isBad = val !== '' && Number.isFinite(num) && num < ambangNum;
                      return (
                        <td key={c.id} className="num">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={val}
                            onChange={(e) => setCell(p.krsId, c.id, e.target.value)}
                            className="mono"
                            style={{
                              width: 56,
                              padding: 'var(--space-2)',
                              textAlign: 'center',
                              border: `1px solid ${isBad ? 'var(--danger-fg)' : isOk ? 'var(--success-fg)' : 'var(--border-default)'}`,
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--surface-default)',
                              fontWeight: 600,
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
