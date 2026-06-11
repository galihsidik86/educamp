import { LogOut, Menu } from 'lucide-react';
import { Avatar, Button } from '@/ds';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from './NotificationBell';

const titleByRole = {
  mahasiswa: 'Portal Mahasiswa',
  dosen: 'Portal Dosen',
  akademik: 'Portal Akademik',
} as const;

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { state, logout } = useAuth();
  if (state.status !== 'authenticated') return null;
  const u = state.user;
  const name =
    u.mahasiswa?.nama ??
    u.dosen?.nama ??
    u.akademik?.nama ??
    u.email;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu"
        aria-label="Buka menu"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>
      <div className="topbar__title">{titleByRole[u.role]}</div>
      <div className="topbar__spacer" />
      <div className="topbar__user">
        <NotificationBell />
        <Avatar name={name} size="sm" />
        <div className="topbar__user-info">
          <strong style={{ fontSize: 'var(--text-sm)' }}>{name}</strong>
          <span className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{u.email}</span>
        </div>
        <Button variant="ghost" size="sm" leftIcon={<LogOut size={16} />} onClick={() => logout()} className="topbar__logout">
          Keluar
        </Button>
      </div>
    </header>
  );
}
