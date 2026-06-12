import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { ChevronLeft, Send, ExternalLink } from 'lucide-react';
import { useTugasDetail, useTugasSubmit } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { StatusPill } from '@/components/StatusPill';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function MahasiswaTugasDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTugasDetail(id);
  const submit = useTugasSubmit(id);

  const [link, setLink] = useState('');
  const [isi, setIsi] = useState('');
  const [actErr, setActErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.submission) return;
    setLink(data.submission.linkJawaban ?? '');
    setIsi(data.submission.isiJawaban ?? '');
  }, [data]);

  if (isLoading) return <p className="muted">Memuat…</p>;
  if (error || !data) return <Alert variant="danger" title="Gagal memuat">Tugas tidak ditemukan.</Alert>;

  const overdue = new Date(data.deadline).getTime() < Date.now();
  const sudahDinilai = data.submission?.status === 'dinilai';

  const handleSubmit = async () => {
    setActErr(null); setSavedMsg(null);
    if (!link.trim() && !isi.trim()) {
      setActErr('Isi salah satu antara link jawaban atau teks jawaban');
      return;
    }
    try {
      await submit.mutateAsync({
        linkJawaban: link.trim() || undefined,
        isiJawaban: isi.trim() || undefined,
      });
      setSavedMsg('Jawaban tersimpan.');
    } catch (e) {
      setActErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  return (
    <div className="stack">
      <Link
        to="/mahasiswa/tugas"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
      >
        <ChevronLeft size={14} /> Kembali ke daftar tugas
      </Link>

      <PageHead
        eyebrow={`${data.kelas.kodeMK} · KELAS ${data.kelas.kodeKelas}${data.pertemuanKe ? ` · PERTEMUAN ${data.pertemuanKe}` : ''}`}
        title={data.judul}
        subtitle={`Deadline: ${formatTanggalWaktu(data.deadline)} · Maksimal nilai: ${data.maxNilai}`}
      />

      {overdue && !data.submission && (
        <Alert variant="warning" title="Sudah lewat deadline">Anda masih dapat mengumpulkan, namun akan ditandai terlambat.</Alert>
      )}

      {data.deskripsi && (
        <Card>
          <strong style={{ color: 'var(--text-strong)' }}>Deskripsi</strong>
          <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{data.deskripsi}</p>
          {data.linkLampiran && (
            <a href={data.linkLampiran} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, color: 'var(--text-link)', fontSize: 'var(--text-sm)' }}>
              Lampiran <ExternalLink size={12} />
            </a>
          )}
        </Card>
      )}

      {data.submission && (
        <Card>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: 'var(--text-strong)' }}>Status submission</strong>
            <StatusPill status={data.submission.status} />
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Disubmit {formatTanggalWaktu(data.submission.waktuSubmit)}
            {data.submission.terlambat && ' · Terlambat'}
          </div>
          {data.submission.nilai != null && (
            <div style={{ marginTop: 8, fontSize: 'var(--text-base)' }}>
              Nilai: <strong style={{ fontFamily: 'var(--font-mono)' }}>{data.submission.nilai}</strong> / {data.maxNilai}
            </div>
          )}
          {data.submission.catatan && (
            <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
              <strong>Catatan dosen:</strong> {data.submission.catatan}
            </div>
          )}
        </Card>
      )}

      {!sudahDinilai && (
        <Card>
          <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>{data.submission ? 'Perbarui jawaban' : 'Kumpulkan jawaban'}</h3>
          {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}
          {savedMsg && <Alert variant="success" title="Tersimpan">{savedMsg}</Alert>}
          <Input label="Link jawaban (Drive/GitHub/dll)" value={link} onChange={(e) => setLink((e.target as HTMLInputElement).value)} placeholder="https://drive.google.com/..." />
          <div style={{ marginTop: 'var(--space-3)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Atau jawaban langsung (teks)</label>
            <textarea
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              rows={10}
              className="tz-input"
              style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)' }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
            <Button variant="primary" leftIcon={<Send size={14} />} disabled={submit.isPending} onClick={handleSubmit}>
              {submit.isPending ? 'Mengirim…' : data.submission ? 'Perbarui' : 'Kumpulkan'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
