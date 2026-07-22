import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, ClipboardList, CalendarDays, GraduationCap, Wallet,
  UserRound, BookOpen, Users, FileText, Briefcase, HeartHandshake, Building2, MapPin,
  ShieldCheck, Layers, Bell, History, CalendarCheck, Megaphone, ClipboardCheck, ScrollText, Award, Gift, Mail, MessageSquare, BrainCircuit, LifeBuoy, FileBadge, UserCog, BarChart3, KeyRound, Library, Cable, BookCheck, Target, TrendingUp, ChevronDown,
  Home, Settings, FlaskConical, Info, CheckCircle2, Banknote, AlertTriangle, Search, X,
} from 'lucide-react';
import type { Role, AkademikSubRole } from '@/lib/auth';
import { useAuth } from '@/lib/auth';
import { useInstitusiPublic } from '@/lib/queries-institusi';

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  /** Sub-peran akademik yang boleh lihat. Omit = semua, [] = super_admin only. */
  subRoles?: AkademikSubRole[];
};
type NavGroup = {
  id: string;
  group: string;
  groupIcon: ReactNode;
  items: NavItem[];
  /** Sub-peran akademik yang boleh lihat group ini. Default: visible kalau ada
   *  item yang visible. */
  subRoles?: AkademikSubRole[];
};

const itemsByRole: Record<Role, NavGroup[]> = {
  mahasiswa: [
    {
      id: 'beranda',
      group: 'Beranda',
      groupIcon: <Home size={14} />,
      items: [
        { to: '/mahasiswa',              label: 'Dashboard',         icon: <LayoutDashboard size={18} />, end: true },
      ],
    },
    {
      id: 'kuliah',
      group: 'Perkuliahan',
      groupIcon: <BookOpen size={14} />,
      items: [
        { to: '/mahasiswa/krs',          label: 'KRS',               icon: <ClipboardList size={18} />, end: true },
        { to: '/mahasiswa/krs/riwayat',  label: 'Riwayat KRS',       icon: <History size={18} /> },
        { to: '/mahasiswa/jadwal',       label: 'Jadwal Kuliah',     icon: <CalendarDays size={18} /> },
        { to: '/mahasiswa/absensi',      label: 'Presensi',          icon: <CalendarCheck size={18} /> },
        { to: '/mahasiswa/materi',       label: 'Materi Kuliah',     icon: <BookOpen size={18} /> },
        { to: '/mahasiswa/tugas',        label: 'Pengumpulan Tugas & Ujian', icon: <FileText size={18} /> },
        { to: '/mahasiswa/kuis',         label: 'Kuis',              icon: <BrainCircuit size={18} /> },
        { to: '/mahasiswa/forum',        label: 'Forum Diskusi',     icon: <MessageSquare size={18} /> },
        { to: '/mahasiswa/nilai',        label: 'Nilai & Transkrip', icon: <GraduationCap size={18} /> },
      ],
    },
    {
      id: 'layanan',
      group: 'Layanan',
      groupIcon: <HeartHandshake size={14} />,
      items: [
        { to: '/mahasiswa/keuangan',   label: 'Keuangan',          icon: <Wallet size={18} /> },
        { to: '/mahasiswa/beasiswa',   label: 'Beasiswa',          icon: <Gift size={18} /> },
        { to: '/mahasiswa/surat',      label: 'Surat Keterangan',  icon: <Mail size={18} /> },
        { to: '/mahasiswa/konsultasi', label: 'Konsultasi DPA',    icon: <MessageSquare size={18} /> },
        { to: '/mahasiswa/tiket',      label: 'Tiket Bantuan',     icon: <LifeBuoy size={18} /> },
        { to: '/mahasiswa/skpi',       label: 'SKPI Portfolio',    icon: <FileBadge size={18} /> },
        { to: '/mahasiswa/sertifikat', label: 'Sertifikat Digital', icon: <Award size={18} /> },
        { to: '/mahasiswa/mutasi',     label: 'Mutasi Mahasiswa',  icon: <UserCog size={18} /> },
        { to: '/mahasiswa/heregistrasi', label: 'Heregistrasi & Cuti', icon: <FileBadge size={18} /> },
      ],
    },
    {
      id: 'tridharma',
      group: 'Tri Dharma',
      groupIcon: <FlaskConical size={14} />,
      items: [
        { to: '/mahasiswa/penelitian', label: 'Penelitian',        icon: <FileText size={18} /> },
        { to: '/mahasiswa/pengabdian', label: 'Pengabdian',        icon: <HeartHandshake size={18} /> },
        { to: '/mahasiswa/kkn',        label: 'KKN',               icon: <MapPin size={18} /> },
        { to: '/mahasiswa/mbkm',       label: 'MBKM',              icon: <Briefcase size={18} /> },
      ],
    },
    {
      id: 'akhir',
      group: 'Tahap Akhir',
      groupIcon: <Award size={14} />,
      items: [
        { to: '/mahasiswa/edom',       label: 'EDOM',              icon: <ClipboardCheck size={18} /> },
        { to: '/mahasiswa/skripsi',    label: 'Skripsi',           icon: <ScrollText size={18} /> },
        { to: '/mahasiswa/yudisium',   label: 'Wisuda',            icon: <Award size={18} /> },
      ],
    },
    {
      id: 'info',
      group: 'Informasi',
      groupIcon: <Info size={14} />,
      items: [
        { to: '/mahasiswa/pengumuman', label: 'Pengumuman',        icon: <Megaphone size={18} /> },
        { to: '/mahasiswa/kalender',   label: 'Kalender Akademik', icon: <CalendarDays size={18} /> },
        { to: '/mahasiswa/dokumen',    label: 'Pusat Dokumen',     icon: <Library size={18} /> },
      ],
    },
    {
      id: 'akun',
      group: 'Akun',
      groupIcon: <Settings size={14} />,
      items: [
        { to: '/mahasiswa/notifikasi', label: 'Notifikasi',        icon: <Bell size={18} /> },
        { to: '/mahasiswa/profil',     label: 'Profil',            icon: <UserRound size={18} /> },
      ],
    },
  ],
  dosen: [
    {
      id: 'beranda',
      group: 'Beranda',
      groupIcon: <Home size={14} />,
      items: [
        { to: '/dosen',              label: 'Dashboard',          icon: <LayoutDashboard size={18} />, end: true },
      ],
    },
    {
      id: 'pengajaran',
      group: 'Pengajaran',
      groupIcon: <BookOpen size={14} />,
      items: [
        { to: '/dosen/jadwal',       label: 'Jadwal Mengajar',    icon: <CalendarDays size={18} /> },
        { to: '/dosen/absensi',      label: 'Presensi Kelas',     icon: <CalendarCheck size={18} /> },
        { to: '/dosen/materi',       label: 'Materi Ajar',        icon: <BookOpen size={18} /> },
        { to: '/dosen/tugas',        label: 'Pengumpulan Tugas & Ujian', icon: <FileText size={18} /> },
        { to: '/dosen/kuis',         label: 'Kuis',               icon: <BrainCircuit size={18} /> },
        { to: '/dosen/forum',        label: 'Forum Diskusi',      icon: <MessageSquare size={18} /> },
        { to: '/dosen/nilai',        label: 'Input Nilai',        icon: <GraduationCap size={18} /> },
      ],
    },
    {
      id: 'bimbingan',
      group: 'Bimbingan',
      groupIcon: <Users size={14} />,
      items: [
        { to: '/dosen/bimbingan',           label: 'Bimbingan Akademik', icon: <Users size={18} />, end: true },
        { to: '/dosen/bimbingan/dashboard', label: 'Dashboard DPA',      icon: <BarChart3 size={18} /> },
        { to: '/dosen/ews',                 label: 'Peringatan Dini (EWS)', icon: <AlertTriangle size={18} /> },
        { to: '/dosen/konsultasi',          label: 'Konsultasi DPA',     icon: <MessageSquare size={18} /> },
        { to: '/dosen/skripsi',             label: 'Skripsi Bimbingan',  icon: <ScrollText size={18} /> },
      ],
    },
    {
      id: 'riset',
      group: 'Riset & BKD',
      groupIcon: <FlaskConical size={14} />,
      items: [
        { to: '/dosen/penelitian',   label: 'Penelitian',  icon: <FileText size={18} /> },
        { to: '/dosen/pengabdian',   label: 'Pengabdian',  icon: <HeartHandshake size={18} /> },
        { to: '/dosen/bkd',          label: 'Laporan BKD', icon: <BookCheck size={18} /> },
      ],
    },
    {
      id: 'info',
      group: 'Informasi',
      groupIcon: <Info size={14} />,
      items: [
        { to: '/dosen/pengumuman',   label: 'Pengumuman',  icon: <Megaphone size={18} /> },
        { to: '/dosen/kalender',     label: 'Kalender Akademik', icon: <CalendarDays size={18} /> },
        { to: '/dosen/dokumen',      label: 'Pusat Dokumen',     icon: <Library size={18} /> },
      ],
    },
    {
      id: 'akun',
      group: 'Akun',
      groupIcon: <Settings size={14} />,
      items: [
        { to: '/dosen/notifikasi',   label: 'Notifikasi',  icon: <Bell size={18} /> },
        { to: '/dosen/profil',       label: 'Profil',      icon: <UserRound size={18} /> },
      ],
    },
  ],
  akademik: [
    {
      id: 'beranda',
      group: 'Beranda',
      groupIcon: <Home size={14} />,
      items: [
        { to: '/akademik',                label: 'Dashboard',     icon: <LayoutDashboard size={18} />, end: true },
      ],
    },
    {
      id: 'master',
      group: 'Master Data',
      groupIcon: <Layers size={14} />,
      items: [
        { to: '/akademik/mahasiswa',      label: 'Mahasiswa',     icon: <GraduationCap size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/dosen',          label: 'Dosen',         icon: <Users size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/fakultas',       label: 'Fakultas',      icon: <Building2 size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/prodi',          label: 'Program Studi', icon: <Building2 size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/mata-kuliah',    label: 'Mata Kuliah',   icon: <BookOpen size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/kelas',          label: 'Kelas',         icon: <Layers size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/ruangan',        label: 'Ruangan',       icon: <MapPin size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/periode',        label: 'Periode KRS',   icon: <CalendarDays size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/periode-wisuda', label: 'Periode Wisuda',icon: <CalendarDays size={18} />, subRoles: ['akademik'] },
      ],
    },
    {
      id: 'akademik',
      group: 'Akademik',
      groupIcon: <BookOpen size={14} />,
      items: [
        { to: '/akademik/krs',            label: 'Validasi KRS',  icon: <ClipboardList size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/kkn',            label: 'Kelola KKN',    icon: <MapPin size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/mbkm',           label: 'Kelola MBKM',   icon: <Briefcase size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/edom',           label: 'Kelola EDOM',   icon: <ClipboardCheck size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/skripsi',        label: 'Kelola Skripsi',icon: <ScrollText size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/yudisium',       label: 'Kelola Yudisium', icon: <Award size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/skpi',           label: 'Verifikasi SKPI', icon: <FileBadge size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/prestasi',       label: 'Verifikasi Prestasi', icon: <Award size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/sertifikasi',    label: 'Verifikasi Sertifikasi', icon: <FileBadge size={18} />, subRoles: ['akademik'] },
      ],
    },
    {
      id: 'mutu',
      group: 'Penjaminan Mutu',
      groupIcon: <ShieldCheck size={14} />,
      items: [
        { to: '/akademik/spmi',              label: 'SPMI (Mutu Internal)', icon: <ShieldCheck size={18} />, end: true, subRoles: ['spmi'] },
        { to: '/akademik/akreditasi',        label: 'Dashboard Akreditasi', icon: <BarChart3 size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/obe',               label: 'OBE (CPL/CPMK)',    icon: <Target size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/bkd',               label: 'Verifikasi BKD',    icon: <BookCheck size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/laporan/obe',       label: 'Laporan OBE',       icon: <TrendingUp size={18} />, subRoles: ['akademik', 'prodi'] },
      ],
    },
    {
      id: 'layanan',
      group: 'Layanan',
      groupIcon: <HeartHandshake size={14} />,
      items: [
        { to: '/akademik/beasiswa',       label: 'Kelola Beasiswa', icon: <Gift size={18} />, subRoles: ['keuangan'] },
        { to: '/akademik/surat',          label: 'Surat Keterangan',icon: <Mail size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/sertifikat',     label: 'Sertifikat Digital', icon: <Award size={18} /> },
        { to: '/akademik/tiket',          label: 'Helpdesk Tiket',    icon: <LifeBuoy size={18} /> },
        { to: '/akademik/mutasi',         label: 'Mutasi Mahasiswa',  icon: <UserCog size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/heregistrasi',   label: 'Heregistrasi & Cuti', icon: <FileBadge size={18} />, subRoles: ['keuangan'] },
        { to: '/akademik/ews',            label: 'Peringatan Dini (EWS)', icon: <AlertTriangle size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/wali',           label: 'Wali Mahasiswa',    icon: <Users size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/pengumuman',     label: 'Pengumuman',        icon: <Megaphone size={18} /> },
        { to: '/akademik/kalender',       label: 'Kalender Akademik', icon: <CalendarDays size={18} /> },
        { to: '/akademik/dokumen',        label: 'Pusat Dokumen',     icon: <Library size={18} /> },
      ],
    },
    {
      id: 'laporan',
      group: 'Keuangan & Laporan',
      groupIcon: <BarChart3 size={14} />,
      items: [
        { to: '/akademik/keuangan',             label: 'Keuangan',      icon: <Wallet size={18} />, end: true, subRoles: ['keuangan'] },
        { to: '/akademik/keuangan/verifikasi',  label: 'Verifikasi Pembayaran', icon: <CheckCircle2 size={18} />, subRoles: ['keuangan'] },
        { to: '/akademik/keuangan/rekonsiliasi', label: 'Rekonsiliasi Bank', icon: <Banknote size={18} />, subRoles: ['keuangan'] },
        { to: '/akademik/tarif-ukt',            label: 'Tarif UKT',     icon: <Wallet size={18} />, subRoles: ['keuangan'] },
        { to: '/akademik/laporan',           label: 'Laporan',           icon: <Briefcase size={18} />, end: true, subRoles: ['akademik'] },
        { to: '/akademik/laporan/kehadiran', label: 'Laporan Kehadiran', icon: <CalendarCheck size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/laporan/honor-dosen', label: 'Honor Mengajar Dosen', icon: <Wallet size={18} />, subRoles: ['akademik'] },
      ],
    },
    {
      id: 'pddikti',
      group: 'PDDikti',
      groupIcon: <Cable size={14} />,
      items: [
        { to: '/akademik/daya-tampung',      label: 'Daya Tampung',     icon: <Layers size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/akm',               label: 'Aktivitas Kuliah', icon: <ClipboardCheck size={18} />, subRoles: ['akademik', 'prodi'] },
        { to: '/akademik/aktivitas-mahasiswa', label: 'Aktivitas MBKM',   icon: <Briefcase size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/feeder',            label: 'Sinkron Feeder',   icon: <Cable size={18} />, subRoles: ['akademik'] },
      ],
    },
    {
      id: 'sistem',
      group: 'Sistem',
      groupIcon: <Settings size={14} />,
      items: [
        // Master config & administrasi sistem — super_admin only ([] = subRoles kosong)
        { to: '/akademik/institusi',      label: 'Identitas Kampus', icon: <Building2 size={18} />, subRoles: [] },
        { to: '/akademik/skala-nilai',    label: 'Skala Nilai',    icon: <GraduationCap size={18} />, subRoles: ['akademik'] },
        { to: '/akademik/users',          label: 'Kelola Akun',   icon: <KeyRound size={18} />, subRoles: [] },
        { to: '/akademik/audit',          label: 'Riwayat Audit', icon: <ShieldCheck size={18} />, subRoles: [] },
        { to: '/akademik/oversight',      label: 'Aktivitas Dosen', icon: <FlaskConical size={18} />, subRoles: [] },
        { to: '/akademik/notifikasi',     label: 'Notifikasi',    icon: <Bell size={18} /> },
        { to: '/akademik/profil',         label: 'Profil',        icon: <UserRound size={18} /> },
      ],
    },
  ],
  wali: [
    {
      id: 'portal',
      group: 'Portal Wali',
      groupIcon: <Home size={14} />,
      items: [
        { to: '/wali', label: 'Dashboard Anak', icon: <LayoutDashboard size={18} />, end: true },
      ],
    },
  ],
};

const STORAGE_KEY = 'siakad.sidebar-collapsed';

/** Filter item akademik berdasarkan sub-role user.
 *  - subRoles undefined → visible utk semua sub-role
 *  - subRoles = [] → super_admin only
 *  - subRoles = ['x', 'y'] → visible utk super_admin + x + y */
function filterBySubRole(rawGroups: NavGroup[], subRole: AkademikSubRole | undefined): NavGroup[] {
  if (!subRole || subRole === 'super_admin') return rawGroups;
  const out: NavGroup[] = [];
  for (const g of rawGroups) {
    const items = g.items.filter((it) => {
      if (it.subRoles === undefined) return true;
      return it.subRoles.includes(subRole);
    });
    if (items.length > 0) out.push({ ...g, items });
  }
  return out;
}

export function Sidebar({ role, mobileOpen = false, onNavigate }: { role: Role; mobileOpen?: boolean; onNavigate?: () => void }) {
  const auth = useAuth();
  const subRole = role === 'akademik' && auth.state.status === 'authenticated'
    ? auth.state.user.akademik?.subRole
    : undefined;
  const groups = useMemo(
    () => (role === 'akademik' ? filterBySubRole(itemsByRole[role], subRole) : itemsByRole[role]),
    [role, subRole],
  );
  const totalItemCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  // Filter cepat menu — hanya tampil kalau menu cukup banyak (mis. akademik
  // ~50 item) supaya tidak jadi clutter di sidebar yang pendek (wali: 1 item).
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;
  const visibleGroups = useMemo(() => {
    if (!isFiltering) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(normalizedQuery)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, isFiltering, normalizedQuery]);
  const location = useLocation();
  const inst = useInstitusiPublic();
  const brandPendek = inst.data?.namaPendek || inst.data?.nama || 'STMIK Tazkia';
  const brandTagline = inst.data?.tagline || 'SILINCAH';
  // Logo resmi berwarna (navy+oranye) di atas kotak putih — versi invers
  // tidak dipakai lagi karena alasnya sudah terang, bukan navy.
  const brandLogoUrl = inst.data?.logoUrl || '/brand/mark-stmik-tazkia.svg';

  // Cari grup mana yang aktif berdasarkan path saat ini → grup itu auto-expand
  const activeGroupId = useMemo(() => {
    for (const g of groups) {
      if (g.items.some((it) => location.pathname === it.to || location.pathname.startsWith(it.to + '/'))) {
        return g.id;
      }
    }
    return null;
  }, [groups, location.pathname]);

  // Reset filter pencarian tiap pindah halaman — supaya tidak "nyangkut"
  // menutupi sebagian besar menu di kunjungan berikutnya.
  useEffect(() => { setQuery(''); }, [location.pathname]);

  // Persisten collapsed state — default: semua expanded; user collapse manual
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}.${role}`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {/* ignore */}
    return new Set<string>();
  });

  // Pastikan grup yang berisi rute aktif tidak collapsed
  useEffect(() => {
    if (activeGroupId && collapsed.has(activeGroupId)) {
      const next = new Set(collapsed);
      next.delete(activeGroupId);
      setCollapsed(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  const toggleGroup = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsed(next);
    try { localStorage.setItem(`${STORAGE_KEY}.${role}`, JSON.stringify(Array.from(next))); } catch {/* ignore */}
  };

  // Reset filter saat item diklik — termasuk saat item yang diklik adalah
  // halaman yang sedang aktif (pathname tidak berubah, jadi efek di atas
  // tidak jalan) supaya sidebar tidak "nyangkut" dalam keadaan terfilter.
  const handleItemClick = () => {
    setQuery('');
    onNavigate?.();
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <img src={brandLogoUrl} alt="" />
        </div>
        <div className="sidebar__brand-text">
          <span>{brandTagline}</span>
          <small>{brandPendek}</small>
        </div>
      </div>

      {totalItemCount > 8 && (
        <div className="sidebar__search">
          <Search size={14} className="sidebar__search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu…"
            aria-label="Cari menu"
          />
          {query && (
            <button type="button" className="sidebar__search-clear" aria-label="Bersihkan pencarian" onClick={() => setQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {isFiltering && visibleGroups.length === 0 && (
        <p className="sidebar__search-empty">Tidak ada menu yang cocok dengan &ldquo;{query.trim()}&rdquo;.</p>
      )}

      {visibleGroups.map((g) => {
        const isCollapsed = isFiltering ? false : collapsed.has(g.id);
        // Grup tunggal (cuma 1 item, mis. Beranda) → tampilkan langsung tanpa header
        if (g.items.length === 1 && g.id === 'beranda') {
          const it = g.items[0]!;
          return (
            <div key={g.id} className="sidebar__group">
              <NavLink
                to={it.to}
                end={it.end ?? it.to === `/${role}`}
                onClick={handleItemClick}
                className={({ isActive }) =>
                  ['sidebar__item', isActive && 'sidebar__item--active'].filter(Boolean).join(' ')
                }
              >
                {it.icon}
                <span>{it.label}</span>
              </NavLink>
            </div>
          );
        }
        return (
          <div key={g.id} className={`sidebar__group ${isCollapsed ? 'sidebar__group--collapsed' : ''}`}>
            <button
              type="button"
              className="sidebar__group-header"
              onClick={() => toggleGroup(g.id)}
              aria-expanded={!isCollapsed}
            >
              <span className="sidebar__group-header-icon">{g.groupIcon}</span>
              <span className="sidebar__group-label-text">{g.group}</span>
              <ChevronDown size={14} className="sidebar__group-chevron" />
            </button>
            <div className="sidebar__group-content">
              <div className="sidebar__group-inner">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end ?? it.to === `/${role}`}
                    onClick={handleItemClick}
                    className={({ isActive }) =>
                      ['sidebar__item', isActive && 'sidebar__item--active'].filter(Boolean).join(' ')
                    }
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="sidebar__footer">
        <span className="sidebar__footer-logo">
          <img src="/brand/logo-silincah.jpg" alt="SILINCAH — Sistem Integrasi Layanan Campus Akademik Holistik" />
        </span>
        <span className="sidebar__footer-meta">© {new Date().getFullYear()} {brandPendek}</span>
      </div>
    </aside>
  );
}
