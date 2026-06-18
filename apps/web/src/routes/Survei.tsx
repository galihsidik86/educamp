import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import type { TextareaHTMLAttributes } from 'react';

function Textarea({ label, ...rest }: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</label>}
      <textarea
        {...rest}
        className="tz-input"
        style={{ width: '100%', padding: 'var(--space-3)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', ...(rest.style ?? {}) }}
      />
    </div>
  );
}
import { MessageSquare, CheckCircle2 } from 'lucide-react';
import { usePublicSurvei, submitPublicSurvei, type SubmitSurveiBody } from '@/lib/queries-spmi';
import { ApiError } from '@/lib/api';
import { useInstitusiPublic } from '@/lib/queries-institusi';

const KATEGORI_LABEL: Record<string, string> = {
  layanan_akademik: 'Layanan Akademik',
  layanan_keuangan: 'Layanan Keuangan',
  layanan_sarpras: 'Sarana Prasarana',
  layanan_perpustakaan: 'Perpustakaan',
  layanan_kemahasiswaan: 'Kemahasiswaan',
  dosen_pembimbing: 'Dosen Pembimbing',
  lulusan: 'Lulusan/Alumni',
  pengguna_lulusan: 'Pengguna Lulusan',
  lain: 'Lain',
};

export function PublicSurvei() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicSurvei(token);
  const inst = useInstitusiPublic();
  const namaInstitusi = (inst.data?.nama || 'Institut Agama Islam Tazkia').toUpperCase();
  const [jawaban, setJawaban] = useState<Record<string, { nilai?: number; pilihan?: string; teks?: string }>>({});
  const [identitas, setIdentitas] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-sunken)', padding: 'var(--space-6) var(--space-4)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }} className="stack">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontFamily: 'Spectral, serif', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            {namaInstitusi}
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>Survei Kepuasan Stakeholder</div>
        </div>

        {isLoading && (
          <Card><p className="muted center">Memuat survei…</p></Card>
        )}

        {error && (
          <Card>
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <h2 style={{ margin: 'var(--space-3) 0', color: 'var(--danger-fg)' }}>Survei tidak tersedia</h2>
              <p className="muted">{error instanceof ApiError ? error.message : 'Tautan survei tidak valid atau sudah ditutup.'}</p>
            </div>
          </Card>
        )}

        {submitted && (
          <Card style={{ borderTop: '4px solid var(--success-fg)' }}>
            <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success-fg)' }} />
              <div>
                <strong style={{ color: 'var(--success-fg)', fontSize: 'var(--text-lg)' }}>Terima kasih</strong>
                <div className="muted">Tanggapan Anda telah kami terima. Masukan Anda sangat berharga untuk peningkatan layanan.</div>
              </div>
            </div>
          </Card>
        )}

        {!submitted && data && (
          <>
            <Card>
              <div className="row" style={{ alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <MessageSquare size={20} className="muted" />
                <strong style={{ color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>{data.judul}</strong>
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{KATEGORI_LABEL[data.kategori] ?? data.kategori}</div>
              {data.deskripsi && <p style={{ marginTop: 'var(--space-3)' }}>{data.deskripsi}</p>}
              <Alert variant="info">
                Jawaban Anda <strong>anonim</strong>. Kami tidak menyimpan identitas pribadi.
              </Alert>
            </Card>

            <Input
              label="Identitas opsional (mis. nama PT atau perusahaan, untuk konteks)"
              value={identitas}
              onChange={(e) => setIdentitas((e.target as HTMLInputElement).value)}
              placeholder="Boleh dikosongkan"
            />

            {data.pertanyaan.map((p, i) => (
              <Card key={p.id}>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <strong>{i + 1}. {p.pertanyaan}</strong>
                  {p.wajib && <span style={{ color: 'var(--danger-fg)' }}> *</span>}
                </div>
                {p.jenis === 'likert' && (
                  <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setJawaban({ ...jawaban, [p.id]: { nilai: n } })}
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: jawaban[p.id]?.nilai === n ? 'var(--accent)' : 'var(--surface)',
                          color: jawaban[p.id]?.nilai === n ? '#fff' : 'var(--text-fg)',
                          cursor: 'pointer',
                          minWidth: 60,
                        }}
                      >
                        <div className="mono" style={{ fontWeight: 700 }}>{n}</div>
                        <div style={{ fontSize: 'var(--text-xs)' }}>
                          {n === 1 ? 'Sangat kurang' : n === 2 ? 'Kurang' : n === 3 ? 'Cukup' : n === 4 ? 'Baik' : 'Sangat baik'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {p.jenis === 'pilihan' && p.opsi && (
                  <div className="stack" style={{ gap: 'var(--space-1)' }}>
                    {p.opsi.map((opt) => (
                      <label key={opt} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                        <input
                          type="radio"
                          name={p.id}
                          value={opt}
                          checked={jawaban[p.id]?.pilihan === opt}
                          onChange={() => setJawaban({ ...jawaban, [p.id]: { pilihan: opt } })}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {p.jenis === 'open' && (
                  <Textarea
                    rows={3}
                    value={jawaban[p.id]?.teks ?? ''}
                    onChange={(e) => setJawaban({ ...jawaban, [p.id]: { teks: (e.target as HTMLTextAreaElement).value } })}
                    placeholder="Ketik tanggapan Anda…"
                  />
                )}
              </Card>
            ))}

            {err && <Alert variant="danger" title="Gagal mengirim">{err}</Alert>}

            <Button
              variant="primary"
              size="lg"
              disabled={submitting}
              onClick={async () => {
                if (!token) return;
                setSubmitting(true);
                setErr(null);
                const body: SubmitSurveiBody = {
                  identitasOpsional: identitas || undefined,
                  jawaban: data.pertanyaan.map((p) => ({
                    pertanyaanId: p.id,
                    nilai: jawaban[p.id]?.nilai ?? null,
                    pilihan: jawaban[p.id]?.pilihan ?? null,
                    teks: jawaban[p.id]?.teks ?? null,
                  })),
                };
                try {
                  await submitPublicSurvei(token, body);
                  setSubmitted(true);
                } catch (e) {
                  setErr(e instanceof ApiError ? e.message : 'Gagal mengirim survei');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Mengirim…' : 'Kirim Tanggapan'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
