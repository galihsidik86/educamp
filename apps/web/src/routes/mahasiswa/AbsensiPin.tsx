import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card } from '@/ds';
import { ChevronLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useMahasiswaSubmitPin, type SubmitPinResult } from '@/lib/queries';
import { PageHead } from '@/components/PageHead';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

export function MahasiswaAbsensiPin() {
  const submit = useMahasiswaSubmitPin();
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmitPinResult | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[i] = digit;
    setPin(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
    setErr(null);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'Enter') {
      submitPin();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 0) return;
    const next = [...pin];
    for (let i = 0; i < text.length; i++) next[i] = text[i]!;
    setPin(next);
    const focusIdx = Math.min(text.length, 5);
    refs.current[focusIdx]?.focus();
  };

  const submitPin = async () => {
    const value = pin.join('');
    if (value.length !== 6) { setErr('PIN harus 6 digit'); return; }
    setErr(null);
    try {
      const r = await submit.mutateAsync(value);
      setSuccess(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal');
    }
  };

  const reset = () => {
    setSuccess(null);
    setPin(['', '', '', '', '', '']);
    refs.current[0]?.focus();
  };

  return (
    <div className="stack" style={{ maxWidth: 560, margin: '0 auto' }}>
      <Link to="/mahasiswa/absensi" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
        <ChevronLeft size={14} /> Kembali ke presensi
      </Link>

      <PageHead
        eyebrow="PRESENSI"
        title="Self Check-In via PIN"
        subtitle="Masukkan PIN 6 digit yang ditampilkan dosen di kelas untuk mencatat kehadiran Anda."
      />

      {success ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success-fg)' }} />
            <h3 style={{ margin: 'var(--space-3) 0 var(--space-2)', color: 'var(--text-strong)' }}>Hadir tercatat</h3>
            <p className="muted">
              <strong>{success.kelas.kodeMK} {success.kelas.namaMK}</strong> · Kelas {success.kelas.kodeKelas}
            </p>
            <p className="mono muted" style={{ fontSize: 'var(--text-sm)' }}>
              Pertemuan ke-{success.pertemuan.pertemuanKe}
              {success.pertemuan.topik && ` · ${success.pertemuan.topik}`}
            </p>
            <p className="mono muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              Tercatat pada {formatTanggalWaktu(success.inputPada)}
            </p>
            <Button variant="primary" size="sm" onClick={reset} style={{ marginTop: 'var(--space-3)' }}>Check-in lain</Button>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

            <div className="muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
              Masukkan PIN
            </div>
            <div className="row" style={{ gap: 'var(--space-2)', justifyContent: 'center' }}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  autoFocus={i === 0}
                  className="mono"
                  style={{
                    width: 48, height: 64,
                    fontSize: '2rem', textAlign: 'center', fontWeight: 700,
                    border: '2px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-default)',
                    outline: 'none',
                  }}
                />
              ))}
            </div>

            <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
              <Button
                variant="primary"
                size="lg"
                leftIcon={<KeyRound size={16} />}
                onClick={submitPin}
                disabled={submit.isPending || pin.join('').length !== 6}
              >
                {submit.isPending ? 'Mengirim…' : 'Kirim PIN'}
              </Button>
            </div>

            <div className="muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
              PIN didapatkan dari dosen di kelas. Berlaku selama waktu yang ditentukan dosen (biasanya 15 menit).
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
