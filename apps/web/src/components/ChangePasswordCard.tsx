import { useState } from 'react';
import { Alert, Button, Card, Input } from '@/ds';
import { KeyRound } from 'lucide-react';
import { apiPost, ApiError, tokenStore } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function ChangePasswordCard() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setOk(null);

    if (form.newPassword !== form.confirm) {
      setErr('Konfirmasi password tidak cocok');
      return;
    }
    if (form.newPassword.length < 8) {
      setErr('Password baru minimal 8 karakter');
      return;
    }

    setBusy(true);
    try {
      await apiPost('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setOk('Password berhasil diubah. Sesi di perangkat lain telah dihentikan.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      // Backend revoke semua refresh token — beri waktu user baca pesan lalu logout
      setTimeout(() => {
        tokenStore.clear();
        logout().catch(() => { /* ignore */ });
      }, 3000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal mengubah password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--text-strong)' }}>
        <KeyRound size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Ubah Password
      </h3>
      <p className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
        Setelah berhasil, Anda akan otomatis logout dan harus login ulang dengan password baru.
      </p>

      <form onSubmit={submit} className="stack" style={{ marginTop: 'var(--space-3)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        {ok && <Alert variant="success" title="Berhasil">{ok}</Alert>}

        <Input
          label="Password lama"
          type="password"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: (e.target as HTMLInputElement).value })}
        />
        <Input
          label="Password baru"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: (e.target as HTMLInputElement).value })}
          hint="Minimal 8 karakter"
        />
        <Input
          label="Konfirmasi password baru"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: (e.target as HTMLInputElement).value })}
        />

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Memproses…' : 'Ubah Password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
