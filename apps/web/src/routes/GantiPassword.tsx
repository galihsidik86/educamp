import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@/ds';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiPost, ApiError } from '@/lib/api';

/**
 * Halaman wajib ganti password — dipakai saat passwordMustChange=true.
 * User tidak bisa akses fitur lain sebelum mengganti password.
 */
export function GantiPassword() {
  const { state, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (state.status !== 'authenticated') return null;
  const isForced = !!state.user.passwordMustChange;

  const submit = async () => {
    setErr(null);
    if (next.length < 8) { setErr('Password baru minimal 8 karakter'); return; }
    if (next !== confirmPw) { setErr('Konfirmasi password tidak cocok'); return; }
    if (current === next) { setErr('Password baru harus berbeda dengan password lama'); return; }
    setBusy(true);
    try {
      await apiPost('/auth/change-password', { currentPassword: current, newPassword: next });
      await refreshProfile();
      navigate('/');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: 'var(--space-6)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            <KeyRound size={32} style={{ color: 'var(--accent-fg)' }} />
            <h1 style={{ margin: '8px 0 4px', fontSize: 'var(--text-xl)' }}>Ganti Password</h1>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {isForced
                ? 'Akademik mereset password Anda. Wajib ganti password sebelum melanjutkan.'
                : 'Ganti password akun Anda.'}
            </div>
          </div>

          {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            <Input label="Password saat ini" type="password" value={current} onChange={(e) => setCurrent((e.target as HTMLInputElement).value)} />
            <Input label="Password baru (min 8 karakter)" type="password" value={next} onChange={(e) => setNext((e.target as HTMLInputElement).value)} />
            <Input label="Konfirmasi password baru" type="password" value={confirmPw} onChange={(e) => setConfirmPw((e.target as HTMLInputElement).value)} />

            <Button variant="primary" leftIcon={<ShieldCheck size={16} />} disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Ganti Password'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
