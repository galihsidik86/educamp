import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { Role } from '@/lib/auth';

export function AppShell({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // tutup drawer otomatis setiap navigasi
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // kunci scroll body saat drawer terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div className={`app ${open ? 'app--drawer-open' : ''}`}>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden />}
      <Sidebar role={role} mobileOpen={open} onNavigate={() => setOpen(false)} />
      <div className="app__main">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="app__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
