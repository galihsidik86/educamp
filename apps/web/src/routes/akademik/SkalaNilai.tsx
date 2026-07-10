import { useEffect, useState } from 'react';
import { Alert, Button, Card } from '@/ds';
import { Save, RotateCcw, GraduationCap, RefreshCw } from 'lucide-react';
import { useAdminSkalaNilai, useAdminSkalaNilaiActions, type SkalaNilaiBody, type SlotKey } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';

const DEFAULTS: SkalaNilaiBody = {
  minA: 85, minAB: 75, minB: 70, minBC: 65, minC: 56, minD: 40,
  bobotA: 4.0, bobotAB: 3.5, bobotB: 3.0, bobotBC: 2.5, bobotC: 2.0, bobotD: 1.0, bobotE: 0.0,
  hurufA: 'A', hurufAB: 'AB', hurufB: 'B', hurufBC: 'BC', hurufC: 'C', hurufD: 'D', hurufE: 'E',
};

const SLOTS: SlotKey[] = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'];

export function AdminSkalaNilai() {
  const { data, isLoading, error } = useAdminSkalaNilai();
  const { save, reset, recompute } = useAdminSkalaNilaiActions();
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<SkalaNilaiBody>(DEFAULTS);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const map = Object.fromEntries(data.skala.map((s) => [s.slot, s])) as Partial<Record<SlotKey, { huruf: string; minNilai: number; bobot: number }>>;
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
      hurufA: map.A?.huruf ?? 'A',
      hurufAB: map.AB?.huruf ?? 'AB',
      hurufB: map.B?.huruf ?? 'B',
      hurufBC: map.BC?.huruf ?? 'BC',
      hurufC: map.C?.huruf ?? 'C',
      hurufD: map.D?.huruf ?? 'D',
      hurufE: map.E?.huruf ?? 'E',
    });
  }, [data]);

  const setNum = (key: keyof SkalaNilaiBody, v: string) =>
    setForm({ ...form, [key]: Number(v) || 0 });
  const setStr = (key: keyof SkalaNilaiBody, v: string) =>
    setForm({ ...form, [key]: v });

  const doSave = async () => {
    setErr(null);
    try {
      await save.mutateAsync(form);
      toast.success('Skala nilai tersimpan. Submit nilai berikutnya pakai konfigurasi baru.');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal menyimpan';
      setErr(msg);
      toast.danger(msg);
    }
  };

  const doReset = async () => {
    const ok = await confirm({
      title: 'Kembalikan ke standar Kemendikbud?',
      message: 'Threshold, bobot, dan label huruf akan reset ke default (A ≥ 85, AB ≥ 75, dst.). Konfigurasi custom akan hilang.',
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

  const doRecompute = async () => {
    const ok = await confirm({
      title: 'Recompute nilai lama?',
      message: (
        <>
          Hitung ulang <strong>huruf & bobot</strong> seluruh Nilai yang punya nilaiAngka, pakai skala saat ini.
          nilaiAngka & status (draft/finalized) <strong>tidak disentuh</strong>. Operasi ini aman tapi bisa lama untuk DB besar.
        </>
      ),
      variant: 'primary',
      confirmLabel: 'Jalankan',
    });
    if (!ok) return;
    setErr(null);
    try {
      const r = await recompute.mutateAsync('all');
      toast.success(r.message);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal recompute';
      setErr(msg);
      toast.danger(msg);
    }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Skala Nilai"
        subtitle="Atur threshold konversi angka → huruf, bobot skala 4, dan label huruf yang ditampilkan."
        right={
          <div className="row" style={{ gap: 6 }}>
            <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={doRecompute} disabled={recompute.isPending}>
              {recompute.isPending ? 'Recompute…' : 'Recompute Nilai Lama'}
            </Button>
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
      {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
      {isLoading && <Skeleton variant="card" height={140} count={2} />}

      <Alert variant="info" title="Catatan">
        <ul style={{ margin: 0, paddingLeft: 'var(--space-4)' }}>
          <li>Threshold harus turun monoton: A &gt; AB &gt; B &gt; BC &gt; C &gt; D (E otomatis 0).</li>
          <li>Bobot tidak boleh naik dari A ke E.</li>
          <li>Label huruf bisa di-customize (mis. "B+" alih "AB"). Wajib unik.</li>
          <li>Simpan hanya berlaku untuk submit nilai baru. Untuk update nilai lama, klik <strong>Recompute Nilai Lama</strong>.</li>
        </ul>
      </Alert>

      <Card>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <GraduationCap size={18} className="muted" />
          <strong style={{ color: 'var(--text-strong)' }}>Tabel konversi</strong>
        </div>
        <div className="tz-table-wrap">
          <table className="tz-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th className="center">Slot</th>
                <th>Label Huruf</th>
                <th className="num">Nilai Minimum (≥)</th>
                <th className="num">Bobot (skala 4)</th>
                <th>Contoh</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((s) => {
                const isLast = s === 'E';
                const minKey = `min${s}` as keyof SkalaNilaiBody;
                const bobotKey = `bobot${s}` as keyof SkalaNilaiBody;
                const hurufKey = `huruf${s}` as keyof SkalaNilaiBody;
                return (
                  <tr key={s}>
                    <td className="center mono"><strong>{s}</strong></td>
                    <td>
                      <input
                        type="text" maxLength={6}
                        value={form[hurufKey] as string}
                        onChange={(e) => setStr(hurufKey, e.target.value)}
                        className="tz-input mono"
                        style={{ width: 80, padding: '4px 8px' }}
                        placeholder={s}
                      />
                    </td>
                    <td className="num">
                      {isLast ? (
                        <span className="muted mono">0 (otomatis)</span>
                      ) : (
                        <input
                          type="number" min={0} max={100} step={0.5}
                          value={form[minKey] as number}
                          onChange={(e) => setNum(minKey, e.target.value)}
                          className="tz-input mono"
                          style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                        />
                      )}
                    </td>
                    <td className="num">
                      <input
                        type="number" min={0} max={4} step={0.1}
                        value={form[bobotKey] as number}
                        onChange={(e) => setNum(bobotKey, e.target.value)}
                        className="tz-input mono"
                        style={{ width: 80, textAlign: 'right', padding: '4px 8px' }}
                      />
                    </td>
                    <td className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {isLast
                        ? <>nilai &lt; {form.minD} dapat <strong className="mono">{form.hurufE}</strong> (bobot 0)</>
                        : <>nilai ≥ {form[minKey]} dapat <strong className="mono">{form[hurufKey]}</strong></>}
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
          Sistem menyimpan 7 slot internal (A, AB, B, BC, C, D, E) yang dipakai untuk logika. Label huruf yang ditampilkan
          ke dosen/mahasiswa diambil dari kolom Label Huruf di tabel atas — bisa diganti (mis. dari "AB" jadi "B+").
          Slot internal tidak berubah, jadi data lama tetap kompatibel.
        </p>
        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>
          <strong>Recompute Nilai Lama</strong> akan scan semua Nilai dengan nilaiAngka, hitung ulang huruf+bobot pakai skala
          saat ini, dan update yang berbeda. nilaiAngka, status (draft/finalized), dan komponen (tugas/UTS/UAS) tidak disentuh.
        </p>
      </Card>
    </div>
  );
}
