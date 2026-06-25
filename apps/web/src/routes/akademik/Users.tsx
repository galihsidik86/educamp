import { useState } from 'react';
import { Alert, Button, Card, Input, Select } from '@/ds';
import { ShieldOff, ShieldCheck, KeyRound, MonitorSmartphone, Search, Copy, AlertTriangle, UserCog } from 'lucide-react';
import {
  useAdminUsers, useAdminUserActions, useAdminUserSessions,
  type AdminUser, type Role, type AkademikSubRole,
} from '@/lib/queries-users';
import { useProdi } from '@/lib/queries-akademik';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { formatTanggalWaktu } from '@/lib/format';
import { ApiError } from '@/lib/api';

const ROLE_LABEL: Record<Role, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  akademik: 'Akademik',
};

const SUB_ROLE_LABEL: Record<AkademikSubRole, string> = {
  super_admin: 'Super Admin',
  akademik: 'Admin Akademik',
  keuangan: 'Admin Keuangan',
  prodi: 'Admin Prodi',
  spmi: 'Admin SPMI',
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
  const [subRoleTarget, setSubRoleTarget] = useState<AdminUser | null>(null);
  const toast = useToast();
  const confirmDialog = useConfirm();

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
                    <td>
                      <span className="pill pill--neutral">{ROLE_LABEL[u.role]}</span>
                      {u.role === 'akademik' && u.akademik?.subRole && (
                        <>
                          <span className={`pill ${u.akademik.subRole === 'super_admin' ? 'pill--info' : 'pill--success'}`} style={{ marginLeft: 4 }}>
                            {SUB_ROLE_LABEL[u.akademik.subRole]}
                          </span>
                          {u.akademik.prodi && (
                            <span className="pill pill--warning" style={{ marginLeft: 4 }} title={u.akademik.prodi.nama}>
                              {u.akademik.prodi.kode}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {u.isActive ? <span className="pill pill--success">Aktif</span> : <span className="pill pill--danger">Nonaktif</span>}
                      {u.passwordMustChange && <span className="pill pill--warning" style={{ marginLeft: 4 }}>Wajib ganti pw</span>}
                    </td>
                    <td className="num mono">{u._count?.refreshTokens ?? 0}</td>
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{u.lastLoginAt ? formatTanggalWaktu(u.lastLoginAt) : '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        {u.role === 'akademik' && (
                          <Button size="sm" variant="ghost" leftIcon={<UserCog size={12} />} onClick={() => setSubRoleTarget(u)}>Sub-peran</Button>
                        )}
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

      {subRoleTarget && (
        <SubRoleModal
          user={subRoleTarget}
          onClose={() => setSubRoleTarget(null)}
          onSave={async (subRole, prodiId) => {
            try {
              await actions.updateSubRole.mutateAsync({ id: subRoleTarget.id, subRole, prodiId });
              toast.success('Sub-peran tersimpan. User akan diminta login ulang.');
              setSubRoleTarget(null);
            } catch (e) {
              toast.danger(e instanceof ApiError ? e.message : 'Gagal');
            }
          }}
          confirm={confirmDialog}
        />
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


function SubRoleModal({ user, onClose, onSave, confirm }: {
  user: AdminUser;
  onClose: () => void;
  onSave: (subRole: AkademikSubRole, prodiId: string | null) => Promise<void> | void;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const prodi = useProdi();
  const [subRole, setSubRole] = useState<AkademikSubRole>(user.akademik?.subRole ?? 'super_admin');
  const [prodiId, setProdiId] = useState<string>(user.akademik?.prodi?.id ?? '');
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (subRole === 'prodi' && !prodiId) {
      setErr('Pilih prodi terlebih dahulu untuk admin prodi');
      return;
    }
    // Konfirmasi kalau demote super_admin
    if (user.akademik?.subRole === 'super_admin' && subRole !== 'super_admin') {
      const ok = await confirm({
        title: 'Demote Super Admin?',
        message: 'User ini akan kehilangan akses super admin. Pastikan masih ada super admin lain. Semua sesi user akan diputus.',
        variant: 'warning',
        confirmLabel: 'Demote',
      });
      if (!ok) return;
    }
    try {
      await onSave(subRole, subRole === 'prodi' ? prodiId : null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal menyimpan');
    }
  };

  return (
    <Modal open onClose={onClose} title={`Sub-peran — ${user.akademik?.nama ?? user.email}`} width={520}>
      <div className="stack" style={{ padding: 'var(--space-4)' }}>
        {err && <Alert variant="danger" title="Gagal">{err}</Alert>}

        <Alert variant="info" title="Catatan">
          Mengubah sub-peran akan memutus semua sesi aktif user supaya login berikutnya pakai peran baru.
        </Alert>

        <Select
          label="Sub-peran"
          value={subRole}
          onChange={(e) => setSubRole((e.target as HTMLSelectElement).value as AkademikSubRole)}
        >
          {(Object.keys(SUB_ROLE_LABEL) as AkademikSubRole[]).map((k) => (
            <option key={k} value={k}>{SUB_ROLE_LABEL[k]}</option>
          ))}
        </Select>

        {subRole === 'prodi' && (
          <Select
            label="Prodi scope (wajib)"
            value={prodiId}
            onChange={(e) => setProdiId((e.target as HTMLSelectElement).value)}
          >
            <option value="">— Pilih prodi —</option>
            {prodi.data?.items.map((p) => (
              <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
            ))}
          </Select>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button variant="primary" size="sm" onClick={submit}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
