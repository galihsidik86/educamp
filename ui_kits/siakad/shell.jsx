/* ============================================================
   TAZKIA SIAKAD — UI KIT SCREENS
   Self-contained recreations using DS tokens + component classes.
   Exports screens to window for the index orchestrator.
   ============================================================ */
const { useState } = React;
const D = window.DATA;
const Ic = ({ n, ...p }) => <i data-lucide={n} {...p}></i>;

/* ---------- Shared chrome ---------- */
const NAV = [
  { group: "Akademik", items: [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "krs", label: "Kartu Rencana Studi", icon: "clipboard-list", badge: "1" },
    { key: "jadwal", label: "Jadwal Kuliah", icon: "calendar-days" },
    { key: "nilai", label: "Nilai & Transkrip", icon: "graduation-cap" },
  ]},
  { group: "Layanan", items: [
    { key: "profil", label: "Profil Mahasiswa", icon: "user-round" },
  ]},
];

function Sidebar({ active, onNav }) {
  return (
    <aside className="sb">
      <div className="sb__logo"><img src="../../assets/logo-tazkia-inverse.svg" alt="Tazkia SIAKAD" /></div>
      {NAV.map((sec) => (
        <div key={sec.group}>
          <div className="sb__section">{sec.group}</div>
          {sec.items.map((it) => (
            <button key={it.key} className={"sb__item" + (active === it.key ? " sb__item--active" : "")} onClick={() => onNav(it.key)}>
              <Ic n={it.icon} /> <span>{it.label}</span>
              {it.badge && <span className="sb__badge">{it.badge}</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="sb__user">
        <span className="tz-avatar tz-avatar--md" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>AR</span>
        <div>
          <div className="nm">{D.student.nama}</div>
          <div className="rl">{D.student.nim}</div>
        </div>
      </div>
    </aside>
  );
}

const TITLES = {
  dashboard: ["Dashboard", "Beranda"],
  krs: ["Kartu Rencana Studi", "Akademik / KRS"],
  jadwal: ["Jadwal Kuliah", "Akademik / Jadwal"],
  nilai: ["Nilai & Transkrip", "Akademik / Nilai"],
  profil: ["Profil Mahasiswa", "Layanan / Profil"],
};

function Topbar({ screen, onLogout }) {
  const [t, c] = TITLES[screen] || ["", ""];
  return (
    <header className="topbar">
      <div>
        <div className="topbar__crumb">{c}</div>
        <div className="topbar__title">{t}</div>
      </div>
      <div className="topbar__search"><Ic n="search" /><input placeholder="Cari mata kuliah, dosen, layanan…" /></div>
      <button className="tz-iconbtn" title="Notifikasi"><Ic n="bell" /></button>
      <button className="tz-iconbtn" title="Keluar" onClick={onLogout}><Ic n="log-out" /></button>
      <span className="tz-avatar tz-avatar--md">AR</span>
    </header>
  );
}

/* ---------- Login ---------- */
function Login({ onLogin }) {
  return (
    <div className="login">
      <div className="login__brand">
        <img src="../../assets/logo-tazkia-inverse.svg" alt="Tazkia" style={{ height: 48 }} />
        <div style={{ marginTop: "auto", maxWidth: 420 }}>
          <div className="ds-eyebrow" style={{ color: "var(--gold-300)" }}>STMIK Tazkia · SIAKAD</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 42, color: "#fff", lineHeight: 1.1, marginTop: 12, letterSpacing: "-0.02em" }}>Kampus Luar Biasa</h1>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 16, marginTop: 14, lineHeight: 1.6 }}>
            Sistem Informasi Akademik terpadu — KRS, jadwal, nilai, dan layanan Tri Dharma dalam satu portal.
          </p>
        </div>
        <div style={{ marginTop: 28, display: "flex", gap: 22, color: "rgba(187,206,254,0.85)", fontSize: 13 }}>
          <span style={{ display: "flex", gap: 7, alignItems: "center" }}><Ic n="shield-check" /> Aman & Tervalidasi</span>
          <span style={{ display: "flex", gap: 7, alignItems: "center" }}><Ic n="git-merge" /> Terintegrasi PDDikti</span>
        </div>
      </div>
      <div className="login__form">
        <form className="login__form-inner" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div>
            <h2 style={{ fontSize: 26, color: "var(--text-strong)" }}>Masuk Portal</h2>
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>Gunakan NIM dan kata sandi SIAKAD Anda.</p>
          </div>
          <div className="tz-field">
            <label className="tz-field__label">NIM / NIDN</label>
            <div className="tz-inputwrap tz-inputwrap--icon"><span className="tz-inputwrap__icon"><Ic n="user-round" /></span><input className="tz-input" defaultValue="2023010142" /></div>
          </div>
          <div className="tz-field">
            <label className="tz-field__label">Kata Sandi</label>
            <div className="tz-inputwrap tz-inputwrap--icon"><span className="tz-inputwrap__icon"><Ic n="lock" /></span><input className="tz-input" type="password" defaultValue="********" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="tz-check"><input type="checkbox" defaultChecked /><span className="tz-check__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span><span style={{ fontSize: 13 }}>Ingat saya</span></label>
            <a href="#" style={{ fontSize: 13, fontWeight: 600 }}>Lupa sandi?</a>
          </div>
          <button type="submit" className="tz-btn tz-btn--primary tz-btn--lg tz-btn--block">Masuk <Ic n="arrow-right" /></button>
          <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>Butuh bantuan? Hubungi BAAK STMIK Tazkia.</p>
        </form>
      </div>
    </div>
  );
}

window.SIAKAD = { Sidebar, Topbar, Login, Ic, D };
