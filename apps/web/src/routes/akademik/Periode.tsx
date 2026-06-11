import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { CheckCircle2, Save } from 'lucide-react';
import { usePeriode, usePeriodeActions } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu, formatStatus } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function AdminPeriode() {
  const { data, isLoading, error } = usePeriode();
  const { aktifkan } = usePeriodeActions();
  const [actErr, setActErr] = useState<string | null>(null);

  const handleAktifkan = async (id: string) => {
    if (!confirm('Aktifkan semester ini? Semester lain akan dinonaktifkan.')) return;
    setActErr(null);
    try { await aktifkan.mutateAsync(id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="OPERASIONAL"
        title="Periode KRS & Nilai"
        subtitle="Atur tahun ajaran, semester aktif, dan tanggal periode KRS/penilaian."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal mengaktifkan">{actErr}</Alert>}

      {isLoading && <p className="muted">Memuat…</p>}

      <div className="stack">
        {data?.items.map((ta) => (
          <Card key={ta.id}>
            <h3 style={{ margin: 0, color: 'var(--text-strong)' }}>
              Tahun Ajaran {ta.kode}
              {ta.isAktif && <span style={{ marginLeft: 8 }}><StatusPill status="aktif" /></span>}
            </h3>
            <div className="stack" style={{ marginTop: 12 }}>
              {ta.semester.length === 0 && <p className="muted" style={{ margin: 0 }}>Belum ada semester pada TA ini.</p>}
              {ta.semester.map((s) => (
                <SemesterRow key={s.id} semester={s} onAktifkan={() => handleAktifkan(s.id)} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SemesterRow({ semester, onAktifkan }: { semester: { id: string; kode: string; jenis: string; isAktif: boolean; krsMulai: string | null; krsSelesai: string | null; nilaiMulai: string | null; nilaiSelesai: string | null }; onAktifkan: () => void }) {
  const { updateSemester } = usePeriodeActions();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    krsMulai: semester.krsMulai?.slice(0, 16) ?? '',
    krsSelesai: semester.krsSelesai?.slice(0, 16) ?? '',
    nilaiMulai: semester.nilaiMulai?.slice(0, 16) ?? '',
    nilaiSelesai: semester.nilaiSelesai?.slice(0, 16) ?? '',
  });
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    try {
      await updateSemester.mutateAsync({
        id: semester.id,
        patch: {
          krsMulai: form.krsMulai || undefined,
          krsSelesai: form.krsSelesai || undefined,
          nilaiMulai: form.nilaiMulai || undefined,
          nilaiSelesai: form.nilaiSelesai || undefined,
        },
      });
      setEditing(false);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div style={{ padding: 'var(--space-3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ color: 'var(--text-strong)' }}>{formatStatus(semester.jenis)} <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>({semester.kode})</span></strong>
          {semester.isAktif && <span style={{ marginLeft: 8 }}><StatusPill status="aktif" /></span>}
          <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
            KRS: {formatTanggalWaktu(semester.krsMulai)} – {formatTanggalWaktu(semester.krsSelesai)}<br />
            Penilaian: {formatTanggalWaktu(semester.nilaiMulai)} – {formatTanggalWaktu(semester.nilaiSelesai)}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {!semester.isAktif && (
            <Button size="sm" variant="primary" leftIcon={<CheckCircle2 size={14} />} onClick={onAktifkan}>
              Aktifkan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Tutup' : 'Edit Tanggal'}
          </Button>
        </div>
      </div>

      {editing && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-default)' }}>
          {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
          <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="KRS Mulai" type="datetime-local" value={form.krsMulai} onChange={(e) => setForm({ ...form, krsMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="KRS Selesai" type="datetime-local" value={form.krsSelesai} onChange={(e) => setForm({ ...form, krsSelesai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="Nilai Mulai" type="datetime-local" value={form.nilaiMulai} onChange={(e) => setForm({ ...form, nilaiMulai: (e.target as HTMLInputElement).value })} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input label="Nilai Selesai" type="datetime-local" value={form.nilaiSelesai} onChange={(e) => setForm({ ...form, nilaiSelesai: (e.target as HTMLInputElement).value })} />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" leftIcon={<Save size={14} />} onClick={save} disabled={updateSemester.isPending}>
              {updateSemester.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
