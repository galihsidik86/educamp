import { useEffect, useState } from 'react';
import { Alert, Button, Card } from '@/ds';
import { Save, RotateCcw, GraduationCap } from 'lucide-react';
import { useAdminSkalaNilai, useAdminSkalaNilaiActions, type SkalaNilaiBody } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { ApiError } from '@/lib/api';

const DEFAULTS: SkalaNilaiBody = {
  minA: 85, minAB: 75, minB: 70, minBC: 65, minC: 56, minD: 40,
  bobotA: 4.0, bobotAB: 3.5, bobotB: 3.0, bobotBC: 2.5, bobotC: 2.0, bobotD: 1.0, bobotE: 0.0,
};

const HURUF = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'] as const;

export function AdminSkalaNilai() {
  const { data, isLoading, error } = useAdminSkalaNilai();
  const { save, reset } = useAdminSkalaNilaiActions();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<SkalaNilaiBody>(DEFAULTS);
  const [err, setErr] = useState<string | null>(null);

  // Initialize form dari data DB saat load
  useEffect(() => {
    if (!data) return;
    const map = Object.fromEntries(data.skala.map((s) => [s.huruf, s])) as Record<string, { minNilai: number; bobot: number }>;
    setForm({
      minA: map.A?.minNilai ?? 85,
      minAB: map.AB?.minNilai ?? 75,
      minB: map.B?.minNilai ?? 70,
      minBC: map.BC?.minNilai ?? 65,
      minC: map.C?.minNilai ?? 56,
      minD: map.D?.minNilai ?? 40,
      bobotA: map.A?.bobot ?? 4.0,
      bobotAB: map.AB?.bobot ?? 3.5,
      bobotB: map.B?.bobot ?? 3.0,
      bobotBC: map.BC?.bobot ?? 2.5,
      bobotC: map.C?.bobot ?? 2.0,
      bobotD: map.D?.bobot ?? 1.0,
      bobotE: map.E?.bobot ?? 0.0,
    });
  }, [data]);

  const setMin = (key: keyof SkalaNilaiBody, v: string) =>
    setForm({ ...form, [key]: Number(v) || 0 });

  const doSave = async () => {
    setErr(null);
    try {
      await save.mutateAsync(form);
      toast.success('Skala nilai tersimpan. Perhitungan IPK/IP berikutnya pakai konfigurasi baru.');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal menyimpan';
      setErr(msg);
      toast.danger(msg);
    }
  };

  const doReset = async () => {
    const ok = await confirm({
      title: 'Kembalikan ke standar Kemendikbud?',
      message: 'Threshold dan bobot akan reset ke nilai default (A ≥ 85, AB ≥ 75, dst.). Konfigurasi custom akan hilang.',
      variant: 'warning',
      confirmLabel: 'Reset',
    });
    if (!ok) return;
    setErr(null);
    try {
      await reset.mutateAsync();
      toast.success('Skala nilai direset ke standar Kemendikbud.');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal reset';
      setErr(msg);
      toast.danger(msg);
    }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Skala Nilai"
        subtitle="Atur batas (threshold) konversi nilai angka ke huruf dan bobot skala 4 untuk perhitungan IP/IPK."
        right={
          <div className="row" style={{ gap: 6 }}>
            <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={doReset} disabled={reset.isPending}>
              {reset.isPending ? 'Reset…' : 'Reset Default'}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Save size={14} />} onClick={doSave} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        }
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {err && <Alert variant="danger" title="Gagal simpan">{err}</Alert>}
      {isLoading && <p className="muted">Memuat…</p>}

      <Alert variant="info" title="Catatan">
        Threshold harus turun secara monoton (mis. A &gt; AB &gt; B &gt; BC &gt; C &gt; D). Bobot juga harus monoton tidak naik dari A ke E. Perubahan berlaku untuk seluruh kalkulasi IPK/IP segera setelah disimpan.
      </Alert>

      <Card>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <GraduationCap size={18} className="muted" />
          <strong style={{ color: 'var(--text-strong)' }}>Tabel konversi</strong>
        </div>
        <div className="tz-table-wrap">
          <table className="tz-table" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="center">Huruf</th>
                <th className="num">Nilai Minimum (≥)</th>
                <th className="num">Bobot (skala 4)</th>
                <th>Contoh kelulusan</th>
              </tr>
            </thead>
            <tbody>
              {HURUF.map((h) => {
                const isLast = h === 'E';
                const minKey = `min${h}` as keyof SkalaNilaiBody;
                const bobotKey = `bobot${h}` as keyof SkalaNilaiBody;
                return (
                  <tr key={h}>
                    <td className="center mono"><strong style={{ fontSize: 'var(--text-lg)' }}>{h}</strong></td>
                    <td className="num">
                      {isLast ? (
                        <span className="muted mono">0 (otomatis)</span>
                      ) : (
                        <input
                          type="number" min={0} max={100} step={0.5}
                          value={form[minKey]}
                          onChange={(e) => setMin(minKey, e.target.value)}
                          className="tz-input mono"
                          style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                        />
                      )}
                    </td>
                    <td className="num">
                      <input
                        type="number" min={0} max={4} step={0.1}
                        value={form[bobotKey]}
                        onChange={(e) => setMin(bobotKey, e.target.value)}
                        className="tz-input mono"
                        style={{ width: 80, textAlign: 'right', padding: '4px 8px' }}
                      />
                    </td>
                    <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {isLast
                        ? 'Tidak lulus (bobot 0)'
                        : <>nilai ≥ {form[minKey]} dapat huruf <strong className="mono">{h}</strong></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <strong style={{ color: 'var(--text-strong)' }}>Cara kerja</strong>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
          Saat dosen submit nilai akhir mahasiswa (nilaiAngka 0-100), sistem otomatis konversi ke huruf berdasarkan tabel di atas. Bobot dipakai untuk hitung IP semester dan IPK kumulatif. Perubahan threshold tidak otomatis recompute nilai lama yang sudah final — hanya berlaku untuk submit baru / re-save. Untuk re-evaluate angkatan lama, hubungi developer.
        </p>
      </Card>
    </div>
  );
}
