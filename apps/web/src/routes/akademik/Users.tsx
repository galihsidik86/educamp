import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { ShieldOff, ShieldCheck, KeyRound, MonitorSmartphone, Search, Copy, AlertTriangle } from 'lucide-react';
import {
  useAdminUsers, useAdminUserActions, useAdminUserSessions,
  type AdminUser, type Role,
} from '@/lib/queries-users';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const ROLE_LABEL: Record<Role, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  akademik: 'Akademik',
};

export function AkademikUsers() {
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif' | ''>('');
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const { data, isLoading, error } = useAdminUsers({
    role: role || undefined,
    status: status || undefined,
    q: activeQ || undefined,
  });
  const actions = useAdminUserActions();

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ user: AdminUser; password: string } | null>(null);

  const onResetPassword = async (u: AdminUser) => {
    if (!confirm(`Reset password untuk ${u.email}? Sistem akan generate password sementara dan paksa user ganti password saat login berikutnya.`)) return;
    setActErr(null);
    try {
      const r = await actions.resetPassword.mutateAsync({ id: u.id });
      setResetResult({ user: u, password: r.password });
    } catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onDeactivate = async (u: AdminUser) => {
    if (!confirm(`Nonaktifkan akun ${u.email}? Semua sesi aktif akan diputus dan user tidak bisa login.`)) return;
    setActErr(null);
    try { await actions.deactivate.mutateAsync(u.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const onActivate = async (u: AdminUser) => {
    setActErr(null);
    try { await actions.activate.mutateAsync(u.id); }
    catch (e) { setActErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <div className="stack">
      <PageHead
        eyebrow="ADMIN"
        title="Kelola Akun Pengguna"
        subtitle="Reset password, nonaktifkan akun, paksa ganti password, dan kelola sesi aktif."
      />

      {error && <Alert variant="danger" title="Gagal memuat">Coba muat ulang.</Alert>}
      {actErr && <Alert variant="danger" title="Gagal">{actErr}</Alert>}

      <Card>
        <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <Select label="Peran" value={role} onChange={(e) => setRole((e.target as HTMLSelectElement).value as Role | '')}>
              <option value="">Semua peran</option>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value as 'aktif' | 'nonaktif' | '')}>
              <option value="">Semua</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Cari" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="email / NIM / NIDN / nama" />
          </div>
          <Button variant="primary" size="sm" leftIcon={<Search size={14} />} onClick={() => setActiveQ(q)}>Cari</Button>
        </div>
      </Card>

      {isLoading && <p className="muted">Memuat…</p>}

      <Card>
        <div className="tz-table-wrap">
          <table className="tz-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Sesi aktif</th>
                <th>Login terakhir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.length === 0 && <tr><td colSpan={6} className="muted center">Tidak ada user.</td></tr>}
              {data?.items.map((u) => {
                const idn = u.mahasiswa?.nim ?? u.dosen?.nidn ?? null;
                const nama = u.mahasiswa?.nama ?? u.dosen?.nama ?? u.akademik?.nama ?? u.email;
                return (
                  <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.6 }}>
                    <td>
                      <strong>{nama}</strong>
                      <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
                        {u.email}
                        {idn && ` · ${idn}`}
                      </div>
                    </td>
                    <td><span className="pill pill--neutral">{ROLE_LABEL[u.role]}</span></td>
                    <td>
                      {u.isActive ? <span className="pill pill--success">Aktif</span> : <span className="pill pill--danger">Nonaktif</span>}
                      {u.passwordMustChange && <span className="pill pill--warning" style={{ marginLeft: 4 }}>Wajib ganti pw</span>}
                    </td>
                    <td className="num mono">{u._count?.refreshTokens ?? 0}</td>
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{u.lastLoginAt ? formatTanggalWaktu(u.lastLoginAt) : '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" leftIcon={<MonitorSmartphone size={12} />} onClick={() => setSelected(u)}>Sesi</Button>
                        <Button size="sm" variant="ghost" leftIcon={<KeyRound size={12} />} onClick={() => onResetPassword(u)}>Reset pw</Button>
                        {u.isActive ? (
                          <Button size="sm" variant="ghost" leftIcon={<ShieldOff size={12} />} onClick={() => onDeactivate(u)}>Nonaktifkan</Button>
                        ) : (
                          <Button size="sm" variant="primary" leftIcon={<ShieldCheck size={12} />} onClick={() => onActivate(u)}>Aktifkan</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <SessionsModal user={selected} onClose={() => setSelected(null)} />
      )}

      {resetResult && (
        <Modal open onClose={() => setResetResult(null)} title="Password baru" width={520}>
          <div className="stack" style={{ padding: 'var(--space-4)' }}>
            <Alert variant="warning" title="Catat password ini sekarang">
              Password berikut tidak akan ditampilkan lagi. Berikan kepada {resetResult.user.email} via kanal terpercaya.
            </Alert>
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--surface-sunken)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-base)',
              wordBreak: 'break-all',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <strong>{resetResult.password}</strong>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Copy size={12} />}
                onClick={() => navigator.clipboard?.writeText(resetResult.password)}
              >
                Salin
              </Button>
            </div>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              User wajib mengganti password ini saat login berikutnya.
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="primary" size="sm" onClick={() => setResetResult(null)}>Selesai</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SessionsModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data, isLoading } = useAdminUserSessions(user.id);
  const actions = useAdminUserActions(user.id);
  const [err, setErr] = useState<string | null>(null);

  const revokeOne = async (tokenId: string) => {
    if (!confirm('Revoke sesi ini? Device tersebut akan logout otomatis.')) return;
    setErr(null);
    try { await actions.revokeSession.mutateAsync({ id: user.id, tokenId }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  const revokeAll = async () => {
    if (!confirm('Revoke SEMUA sesi user ini?')) return;
    setErr(null);
    try { await actions.revokeAllSessions.mutateAsync(user.id); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Gagal'); }
  };

  return (
    <Modal open onClose={onClose} title={`Sesi aktif — ${user.email}`} width={700}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}
        {isLoading && <p className="muted">Memuat…</p>}
        {data && data.items.length === 0 && (
          <Alert variant="info" title="Tidak ada sesi aktif">User belum login atau semua sesi sudah revoked.</Alert>
        )}
        <div className="stack">
          {data?.items.map((s) => (
            <Card key={s.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="mono" style={{ fontSize: 'var(--text-sm)' }}>{s.userAgent ?? 'Unknown device'}</div>
                  <div className="muted mono" style={{ fontSize: 'var(--text-xs)' }}>
                    IP {s.ip ?? '—'} · Login {formatTanggalWaktu(s.createdAt)} · Berakhir {formatTanggalWaktu(s.expiresAt)}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revokeOne(s.id)}>Revoke</Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {data && data.items.length > 0 && (
            <Button size="sm" variant="ghost" onClick={revokeAll}>Revoke semua sesi</Button>
          )}
          <Button variant="primary" size="sm" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}
