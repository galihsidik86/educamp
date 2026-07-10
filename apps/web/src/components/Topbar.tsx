import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { Avatar } from '@/ds';
import { useAuth } from '@/lib/auth';
import { roleHomePath } from '@/lib/routing';
import { NotificationBell } from './NotificationBell';
import { Tooltip } from './Tooltip';

const titleByRole = {
  mahasiswa: 'Portal Mahasiswa',
  dosen: 'Portal Dosen',
  akademik: 'Portal Akademik',
  wali: 'Portal Wali',
} as const;

// wali tidak punya halaman /profil sendiri (lihat App.tsx routes) — menu
// "Profil" hanya ditampilkan utk role yang benar-benar punya rute tsb.
const rolesWithProfil = new Set(['mahasiswa', 'dosen', 'akademik']);

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { state, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (state.status !== 'authenticated') return null;
  const u = state.user;
  const name =
    u.mahasiswa?.nama ??
    u.dosen?.nama ??
    u.akademik?.nama ??
    u.email;

  return (
    <header className="topbar">
      <Tooltip label="Buka menu" placement="bottom">
        <button
          type="button"
          className="topbar__menu"
          aria-label="Buka menu"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
      </Tooltip>
      <div className="topbar__title">{titleByRole[u.role]}</div>
      <div className="topbar__spacer" />
      <div className="topbar__actions">
        <NotificationBell />
        <div className="topbar__user" ref={menuRef}>
          <button
            type="button"
            className="topbar__user-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Menu pengguna"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar name={name} size="sm" />
            <div className="topbar__user-info">
              <strong style={{ fontSize: 'var(--text-sm)' }}>{name}</strong>
              <span className="muted" style={{ fontSize: 'var(--text-2xs)' }}>{u.email}</span>
            </div>
            <ChevronDown size={14} className="topbar__user-chevron" />
          </button>

          {menuOpen && (
            <div className="topbar__user-menu" role="menu">
              {rolesWithProfil.has(u.role) && (
                <Link
                  to={`${roleHomePath(u.role)}/profil`}
                  role="menuitem"
                  className="topbar__user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound size={15} /> Profil
                </Link>
              )}
              <div className="topbar__user-menu-divider" />
              <button
                type="button"
                role="menuitem"
                className="topbar__user-menu-item topbar__user-menu-item--danger"
                onClick={() => { setMenuOpen(false); logout(); }}
              >
                <LogOut size={15} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
