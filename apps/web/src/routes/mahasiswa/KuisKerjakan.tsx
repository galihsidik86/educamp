import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { Clock, Save, Send } from 'lucide-react';
import { useMahasiswaKuisActions, type KuisAttempt } from '@/lib/queries-kuis';
import { PageHead } from '@/components/PageHead';
import { ApiError } from '@/lib/api';
import { PageLoadingSkeleton } from '@/components/Skeleton';

export function MahasiswaKuisKerjakan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const actions = useMahasiswaKuisActions(id);

  const [session, setSession] = useState<KuisAttempt | null>(null);
  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const dirtyRef = useRef(false);

  // Start saat mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await actions.start.mutateAsync();
        if (cancelled) return;
        setSession(r);
        setJawaban(r.attempt.jawaban ?? {});
      } catch (e) { if (!cancelled) setErr(e instanceof ApiError ? e.message : 'Gagal memulai kuis'); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Countdown
  useEffect(() => {
    if (!session) return;
    const deadline = new Date(session.attempt.deadline).getTime();
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session]);

  // Auto-save tiap 15 detik bila dirty
  useEffect(() => {
    if (!session) return;
    const t = setInterval(async () => {
      if (!dirtyRef.current) return;
      try {
        await actions.save.mutateAsync(jawaban);
        dirtyRef.current = false;
      } catch { /* abaikan, akan dicoba lagi */ }
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, jawaban]);

  // Auto-submit saat waktu habis
  useEffect(() => {
    if (!session) return;
    if (remaining === 0 && session) {
      void doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const pilih = (soalId: string, idx: number) => {
    setJawaban((j) => ({ ...j, [soalId]: idx }));
    dirtyRef.current = true;
  };

  const doSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      await actions.submit.mutateAsync(jawaban);
      navigate(`/mahasiswa/kuis/${id}/hasil`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal submit'); setSubmitting(false); }
  };

  if (err) return <Alert variant="danger" title="Gagal">{err}</Alert>;
  if (!session) return <PageLoadingSkeleton />;

  const totalJawab = Object.keys(jawaban).length;
  const total = session.soal.length;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="stack">
      <PageHead
        eyebrow="KUIS BERJALAN"
        title={session.kuis.judul}
        subtitle={`${totalJawab} / ${total} terjawab`}
        right={
          <div className="row" style={{ alignItems: 'center', gap: 'var(--space-3)' }}>
            <div className="row" style={{ alignItems: 'center', gap: 4, color: remaining < 60_000 ? 'var(--danger-fg)' : 'var(--text-strong)' }}>
              <Clock size={16} />
              <strong className="mono">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</strong>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Send size={14} />} onClick={doSubmit} disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Submit'}
            </Button>
          </div>
        }
      />

      <div className="stack">
        {session.soal.map((s, i) => (
          <Card key={s.id}>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>Soal #{i + 1} · {s.bobot} poin</div>
            <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap', fontWeight: 600 }}>{s.pertanyaan}</p>
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              {s.opsi.map((opt, idx) => {
                const selected = jawaban[s.id] === idx;
                return (
                  <label
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                      background: selected ? 'var(--surface-emphasized)' : 'var(--surface-sunken)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={s.id}
                      checked={selected}
                      onChange={() => pilih(s.id, idx)}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="muted">
            <Save size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Jawaban tersimpan otomatis setiap 15 detik.
          </div>
          <Button variant="primary" leftIcon={<Send size={14} />} onClick={doSubmit} disabled={submitting}>
            {submitting ? 'Mengirim…' : `Submit (${totalJawab}/${total})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
