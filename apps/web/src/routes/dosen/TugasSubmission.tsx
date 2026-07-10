import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Save, ExternalLink } from 'lucide-react';
import { useDosenTugasSubmission, useDosenTugasActions, type DosenSubmissionItem } from '@/lib/queries-dosen';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function DosenTugasSubmission() {
  const { kelasId, tugasId } = useParams<{ kelasId: string; tugasId: string }>();
  const { data, isLoading } = useDosenTugasSubmission(tugasId);
  const [grading, setGrading] = useState<DosenSubmissionItem | null>(null);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (!data) return <Alert variant="danger" title="Gagal memuat">Tugas tidak ditemukan.</Alert>;

  return (
    <div className="stack">
      <Link to={`/dosen/tugas/${kelasId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke daftar tugas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}`}
        title={data.tugas.judul}
        subtitle={`Deadline ${formatTanggalWaktu(data.tugas.deadline)} · Max nilai ${data.tugas.maxNilai}`}
      />

      <div className="tz-table-wrap">
        <table className="tz-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>NIM</th>
              <th>Nama</th>
              <th>Submit</th>
              <th>Status</th>
              <th className="num">Nilai</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.peserta.length === 0 && <tr><td colSpan={7} className="muted center">Belum ada peserta KRS disetujui.</td></tr>}
            {data.peserta.map((p, i) => (
              <tr key={p.mahasiswaId}>
                <td className="num mono">{i + 1}</td>
                <td className="mono">{p.nim}</td>
                <td>{p.nama}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {p.submission
                    ? <>
                        {formatTanggalWaktu(p.submission.waktuSubmit)}
                        {p.submission.terlambat && <div className="muted">Terlambat</div>}
                      </>
                    : <span className="muted">Belum submit</span>}
                </td>
                <td>{p.submission ? <StatusPill status={p.submission.status} /> : <span className="muted">—</span>}</td>
                <td className="num mono"><strong>{p.submission?.nilai ?? '—'}</strong></td>
                <td>
                  {p.submission && (
                    <Button size="sm" variant="ghost" onClick={() => setGrading(p)}>Beri Nilai</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grading && grading.submission && (
        <GradingModal
          peserta={grading}
          maxNilai={data.tugas.maxNilai}
          onClose={() => setGrading(null)}
        />
      )}
    </div>
  );
}

function GradingModal({ peserta, maxNilai, onClose }: { peserta: DosenSubmissionItem; maxNilai: number; onClose: () => void }) {
  const { tugasId } = useParams<{ kelasId: string; tugasId: string }>();
  const { grade } = useDosenTugasActions(undefined, tugasId);
  const [nilai, setNilai] = useState(peserta.submission?.nilai?.toString() ?? '');
  const [catatan, setCatatan] = useState(peserta.submission?.catatan ?? '');
  const [actErr, setActErr] = useState<string | null>(null);

  const save = async () => {
    setActErr(null);
    const n = Number(nilai);
    if (isNaN(n) || n < 0 || n > maxNilai) { setActErr(`Nilai harus 0–${maxNilai}`); return; }
    try {
      await grade.mutateAsync({ submissionId: peserta.submission!.id, nilai: n, catatan: catatan || null });
      onClose();
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const sub = peserta.submission!;

  return (
    <Modal open onClose={onClose} title={`Nilai — ${peserta.nama}`} width={620}>
      <div className="stack" style={{ padding: 'var(--space-4)', gap: 'var(--space-3)' }}>
        {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

        <Card>
          <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{peserta.nim} · Submit {formatTanggalWaktu(sub.waktuSubmit)}{sub.terlambat && ' · Terlambat'}</div>
          {sub.linkJawaban && (
            <a href={sub.linkJawaban} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--text-link)' }}>
              Buka link jawaban <ExternalLink size={12} />
            </a>
          )}
          {sub.isiJawaban && (
            <div style={{ marginTop: 8 }}>
              <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Isi jawaban:</div>
              <pre style={{ margin: '4px 0 0', padding: 'var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{sub.isiJawaban}</pre>
            </div>
          )}
        </Card>

        <Input label={`Nilai (0–${maxNilai})`} type="number" min="0" max={String(maxNilai)} value={nilai} onChange={(e) => setNilai((e.target as HTMLInputElement).value)} />

        <div>
          <label className="muted" style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 4 }}>Catatan untuk mahasiswa (opsional)</label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            className="tz-input"
            style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" leftIcon={<Save size={14} />} disabled={grade.isPending} onClick={save}>{grade.isPending ? 'Menyimpan…' : 'Simpan nilai'}</Button>
        </div>
      </div>
    </Modal>
  );
}
