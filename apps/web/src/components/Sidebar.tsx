import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, ClipboardList, CalendarDays, GraduationCap, Wallet,
  UserRound, BookOpen, Users, FileText, Briefcase, HeartHandshake, Building2, MapPin,
  ShieldCheck, Layers, Bell, History, CalendarCheck, Megaphone, ClipboardCheck, ScrollText, Award, Gift, Mail, MessageSquare,
} from 'lucide-react';
import type { Role } from '@/lib/auth';

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

const itemsByRole: Record<Role, { group: string; items: NavItem[] }[]> = {
  mahasiswa: [
    {
      group: 'Akademik',
      items: [
        { to: '/mahasiswa',              label: 'Dashboard',         icon: <LayoutDashboard size={18} /> },
        { to: '/mahasiswa/krs',          label: 'KRS',               icon: <ClipboardList size={18} />, end: true },
        { to: '/mahasiswa/krs/riwayat',  label: 'Riwayat KRS',       icon: <History size={18} /> },
        { to: '/mahasiswa/jadwal',       label: 'Jadwal Kuliah',     icon: <CalendarDays size={18} /> },
        { to: '/mahasiswa/absensi',      label: 'Absensi',           icon: <CalendarCheck size={18} /> },
        { to: '/mahasiswa/materi',       label: 'Materi Kuliah',     icon: <BookOpen size={18} /> },
        { to: '/mahasiswa/tugas',        label: 'Tugas',             icon: <FileText size={18} /> },
        { to: '/mahasiswa/forum',        label: 'Forum Diskusi',     icon: <MessageSquare size={18} /> },
        { to: '/mahasiswa/nilai',        label: 'Nilai & Transkrip', icon: <GraduationCap size={18} /> },
      ],
    },
    {
      group: 'Layanan',
      items: [
        { to: '/mahasiswa/keuangan',   label: 'Keuangan',          icon: <Wallet size={18} /> },
        { to: '/mahasiswa/beasiswa',   label: 'Beasiswa',          icon: <Gift size={18} /> },
        { to: '/mahasiswa/surat',      label: 'Surat Keterangan',  icon: <Mail size={18} /> },
        { to: '/mahasiswa/penelitian', label: 'Penelitian',        icon: <FileText size={18} /> },
        { to: '/mahasiswa/pengabdian', label: 'Pengabdian',        icon: <HeartHandshake size={18} /> },
        { to: '/mahasiswa/kkn',        label: 'KKN',               icon: <MapPin size={18} /> },
        { to: '/mahasiswa/mbkm',       label: 'MBKM',              icon: <Briefcase size={18} /> },
        { to: '/mahasiswa/edom',       label: 'EDOM',              icon: <ClipboardCheck size={18} /> },
        { to: '/mahasiswa/skripsi',    label: 'Skripsi',           icon: <ScrollText size={18} /> },
        { to: '/mahasiswa/yudisium',   label: 'Wisuda',            icon: <Award size={18} /> },
        { to: '/mahasiswa/pengumuman', label: 'Pengumuman',        icon: <Megaphone size={18} /> },
        { to: '/mahasiswa/notifikasi', label: 'Notifikasi',        icon: <Bell size={18} /> },
        { to: '/mahasiswa/profil',     label: 'Profil',            icon: <UserRound size={18} /> },
      ],
    },
  ],
  dosen: [
    {
      group: 'Pengajaran',
      items: [
        { to: '/dosen',              label: 'Dashboard',          icon: <LayoutDashboard size={18} /> },
        { to: '/dosen/jadwal',       label: 'Jadwal Mengajar',    icon: <CalendarDays size={18} /> },
        { to: '/dosen/absensi',      label: 'Absensi Kelas',      icon: <CalendarCheck size={18} /> },
        { to: '/dosen/materi',       label: 'Materi Ajar',        icon: <BookOpen size={18} /> },
        { to: '/dosen/tugas',        label: 'Tugas',              icon: <FileText size={18} /> },
        { to: '/dosen/forum',        label: 'Forum Diskusi',      icon: <MessageSquare size={18} /> },
        { to: '/dosen/nilai',        label: 'Input Nilai',        icon: <GraduationCap size={18} /> },
        { to: '/dosen/bimbingan',    label: 'Bimbingan Akademik', icon: <Users size={18} /> },
        { to: '/dosen/skripsi',      label: 'Skripsi Bimbingan',  icon: <ScrollText size={18} /> },
      ],
    },
    {
      group: 'Riset',
      items: [
        { to: '/dosen/penelitian',   label: 'Penelitian',  icon: <FileText size={18} /> },
        { to: '/dosen/pengabdian',   label: 'Pengabdian',  icon: <HeartHandshake size={18} /> },
        { to: '/dosen/pengumuman',   label: 'Pengumuman',  icon: <Megaphone size={18} /> },
        { to: '/dosen/notifikasi',   label: 'Notifikasi',  icon: <Bell size={18} /> },
        { to: '/dosen/profil',       label: 'Profil',      icon: <UserRound size={18} /> },
      ],
    },
  ],
  akademik: [
    {
      group: 'Master Data',
      items: [
        { to: '/akademik',                label: 'Dashboard',     icon: <LayoutDashboard size={18} /> },
        { to: '/akademik/mahasiswa',      label: 'Mahasiswa',     icon: <GraduationCap size={18} /> },
        { to: '/akademik/dosen',          label: 'Dosen',         icon: <Users size={18} /> },
        { to: '/akademik/prodi',          label: 'Program Studi', icon: <Building2 size={18} /> },
        { to: '/akademik/mata-kuliah',    label: 'Mata Kuliah',   icon: <BookOpen size={18} /> },
        { to: '/akademik/kelas',          label: 'Kelas',         icon: <Layers size={18} /> },
      ],
    },
    {
      group: 'Operasional',
      items: [
        { to: '/akademik/periode',        label: 'Periode KRS',   icon: <CalendarDays size={18} /> },
        { to: '/akademik/krs',            label: 'Validasi KRS',  icon: <ClipboardList size={18} /> },
        { to: '/akademik/kkn',            label: 'Kelola KKN',    icon: <MapPin size={18} /> },
        { to: '/akademik/mbkm',           label: 'Kelola MBKM',   icon: <Briefcase size={18} /> },
        { to: '/akademik/edom',           label: 'Kelola EDOM',   icon: <ClipboardCheck size={18} /> },
        { to: '/akademik/skripsi',        label: 'Kelola Skripsi',icon: <ScrollText size={18} /> },
        { to: '/akademik/periode-wisuda', label: 'Periode Wisuda',icon: <CalendarDays size={18} /> },
        { to: '/akademik/yudisium',       label: 'Kelola Yudisium', icon: <Award size={18} /> },
        { to: '/akademik/beasiswa',       label: 'Kelola Beasiswa', icon: <Gift size={18} /> },
        { to: '/akademik/surat',          label: 'Surat Keterangan',icon: <Mail size={18} /> },
        { to: '/akademik/keuangan',       label: 'Keuangan',      icon: <Wallet size={18} /> },
        { to: '/akademik/laporan',           label: 'Laporan',           icon: <Briefcase size={18} />, end: true },
        { to: '/akademik/laporan/kehadiran', label: 'Laporan Kehadiran', icon: <CalendarCheck size={18} /> },
        { to: '/akademik/pengumuman',        label: 'Pengumuman',        icon: <Megaphone size={18} /> },
        { to: '/akademik/audit',          label: 'Riwayat Audit', icon: <ShieldCheck size={18} /> },
        { to: '/akademik/notifikasi',     label: 'Notifikasi',    icon: <Bell size={18} /> },
        { to: '/akademik/profil',         label: 'Profil',        icon: <UserRound size={18} /> },
      ],
    },
  ],
};

export function Sidebar({ role, mobileOpen = false, onNavigate }: { role: Role; mobileOpen?: boolean; onNavigate?: () => void }) {
  const groups = itemsByRole[role];

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <img src="/@ds/assets/logo-tazkia-inverse.svg" alt="" width={20} height={20} />
        </div>
        <div className="sidebar__brand-text">
          <span>SIAKAD</span>
          <small>STMIK Tazkia</small>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.group}>
          <div className="sidebar__group-label">{g.group}</div>
          {g.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end ?? it.to === `/${role}`}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                ['sidebar__item', isActive && 'sidebar__item--active'].filter(Boolean).join(' ')
              }
            >
              {it.icon}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar__footer">© {new Date().getFullYear()} STMIK Tazkia</div>
    </aside>
  );
}
