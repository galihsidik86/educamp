/* ============================================================
   TAZKIA SIAKAD — CONTENT SCREENS
   ============================================================ */
const { Ic: SIc, D: SD } = window.SIAKAD;
const { useState: uS } = React;

function Stat({ label, value, icon, delta, dir = "up" }) {
  return (
    <div className="tz-stat">
      <div className="tz-stat__top"><span className="tz-stat__label">{label}</span><span className="tz-stat__icon"><SIc n={icon} /></span></div>
      <div className="tz-stat__value">{value}</div>
      {delta && <span className={"tz-stat__delta tz-stat__delta--" + dir}><SIc n={dir === "up" ? "trending-up" : "trending-down"} style={{ width: 14, height: 14 }} /> {delta}</span>}
    </div>
  );
}
function Badge({ v, children }) { return <span className={"tz-badge tz-badge--" + v}>{children}</span>; }

/* ---------- Dashboard ---------- */
function Dashboard({ onNav }) {
  const s = SD.student;
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <div className="ds-eyebrow">Semester Ganjil 2025/2026</div>
          <h1>Assalamu'alaikum, {s.nama.split(" ")[0]}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{s.prodi} · Angkatan {s.angkatan} · Semester {s.semester}</p>
        </div>
        <button className="tz-btn tz-btn--primary" onClick={() => onNav("krs")}><SIc n="clipboard-list" style={{ width: 18, height: 18 }} /> Isi KRS</button>
      </div>

      <div className="grid grid-4">
        <Stat label="IPK Kumulatif" value={s.ipk} icon="award" delta="+0.06 semester ini" />
        <Stat label="SKS Tempuh" value={s.sksTotal} icon="layers" delta={"dari " + s.sksTarget + " SKS"} />
        <Stat label="Semester" value={s.semester} icon="calendar-range" delta="Aktif" />
        <Stat label="Status Keuangan" value={s.tagihan} icon="wallet" delta="UKT Ganjil" />
      </div>

      <div className="grid grid-3">
        <div className="tz-card col-span-2">
          <div className="tz-card__header"><div className="tz-card__title">Jadwal Hari Ini</div><span className="tz-badge tz-badge--brand">Senin</span></div>
          <div className="tz-card__body" style={{ paddingTop: 6, paddingBottom: 6 }}>
            {SD.jadwalHariIni.map((j, i) => (
              <div className="list-row" key={i}>
                <span className="dot-time">{j.jam}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{j.mk}</div><div className="muted" style={{ fontSize: 13 }}>{j.dosen}</div></div>
                <span className="tz-badge tz-badge--neutral"><SIc n="map-pin" style={{ width: 12, height: 12 }} /> {j.ruang}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tz-card">
          <div className="tz-card__header"><div className="tz-card__title">Progres Studi</div></div>
          <div className="tz-card__body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="tz-progress"><div className="tz-progress__meta"><span>SKS Tempuh</span><span>{Math.round(s.sksTotal / s.sksTarget * 100)}%</span></div><div className="tz-progress__track"><div className="tz-progress__bar tz-progress__bar--success" style={{ width: (s.sksTotal / s.sksTarget * 100) + "%" }}></div></div></div>
            <div style={{ fontSize: 13 }} className="muted">Dosen Pembimbing Akademik</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: -8 }}><span className="tz-avatar tz-avatar--sm">HF</span><span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 14 }}>{s.dpa}</span></div>
          </div>
        </div>
      </div>

      <div className="tz-card">
        <div className="tz-card__header"><div className="tz-card__title">Pengumuman</div><a href="#" style={{ fontSize: 13, fontWeight: 600 }}>Lihat semua</a></div>
        <div className="tz-card__body" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {SD.pengumuman.map((p, i) => (
            <div className="list-row" key={i}>
              <Badge v={p.warna}>{p.tag}</Badge>
              <div style={{ flex: 1, fontWeight: 600, color: "var(--text-strong)" }}>{p.judul}</div>
              <span className="muted" style={{ fontSize: 13 }}>{p.tgl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- KRS ---------- */
function Krs() {
  const [sel, setSel] = uS({ "IF-3101": true, "IF-3102": true, "SI-3201": true, "UN-3001": true });
  const toggle = (k) => setSel((p) => ({ ...p, [k]: !p[k] }));
  const total = SD.tawaran.filter((t) => sel[t.kode]).reduce((a, t) => a + t.sks, 0);
  const maxSks = 24;
  return (
    <div className="content">
      <div className="page-head">
        <div><div className="ds-eyebrow">Ganjil 2025/2026</div><h1>Kartu Rencana Studi</h1></div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="tz-select" style={{ width: 220 }} defaultValue="ganjil"><option value="ganjil">Ganjil 2025/2026</option><option value="genap">Genap 2024/2025</option></select>
        </div>
      </div>

      <div className="tz-alert tz-alert--warning"><span className="tz-alert__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" /><path d="M12 9v4M12 17h.01" /></svg></span><div><div className="tz-alert__title">Batas Pengisian KRS</div><div className="tz-alert__body">Pengisian KRS ditutup 12 Agustus 2025, 23:59 WIB. Wajib divalidasi Dosen Pembimbing Akademik.</div></div></div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 300px", alignItems: "start" }}>
        <div className="tz-card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th style={{ width: 40 }}></th><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Kelas</th><th>Jadwal</th><th>Kuota</th></tr></thead>
            <tbody>
              {SD.tawaran.map((t) => (
                <tr key={t.kode}>
                  <td><label className="tz-check"><input type="checkbox" checked={!!sel[t.kode]} onChange={() => toggle(t.kode)} /><span className="tz-check__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span></label></td>
                  <td className="kode">{t.kode}</td>
                  <td><span className="mk-name">{t.mk}</span> {t.wajib ? <span className="tz-badge tz-badge--brand" style={{ marginLeft: 6 }}>Wajib</span> : <span className="tz-badge tz-badge--neutral" style={{ marginLeft: 6 }}>Pilihan</span>}</td>
                  <td className="num">{t.sks}</td>
                  <td>{t.kelas}</td>
                  <td className="muted">{t.jadwal}</td>
                  <td className="num">{t.kuota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="tz-card tz-card--pad" style={{ position: "sticky", top: 88, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontWeight: 700, color: "var(--text-strong)", fontSize: 16 }}>Ringkasan KRS</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="muted">Total SKS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 28, color: total > maxSks ? "var(--danger-solid)" : "var(--blue-800)" }}>{total}<span style={{ fontSize: 15, color: "var(--text-muted)" }}>/{maxSks}</span></span>
          </div>
          <div className="tz-progress"><div className="tz-progress__track"><div className="tz-progress__bar" style={{ width: Math.min(100, total / maxSks * 100) + "%" }}></div></div></div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{SD.tawaran.filter((t) => sel[t.kode]).length} mata kuliah dipilih · maksimal {maxSks} SKS.</div>
          <button className="tz-btn tz-btn--primary tz-btn--block"><SIc n="send" style={{ width: 18, height: 18 }} /> Ajukan KRS</button>
          <button className="tz-btn tz-btn--secondary tz-btn--block">Simpan Draf</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Jadwal ---------- */
const SCHED_COLORS = {
  blue: { bg: "var(--blue-50)", bd: "var(--blue-600)" },
  green: { bg: "var(--green-50)", bd: "var(--green-500)" },
  gold: { bg: "var(--gold-50)", bd: "var(--gold-500)" },
  red: { bg: "var(--red-50)", bd: "var(--red-500)" },
};
function Jadwal() {
  const sc = SD.sched;
  return (
    <div className="content">
      <div className="page-head"><div><div className="ds-eyebrow">Ganjil 2025/2026</div><h1>Jadwal Kuliah</h1></div>
        <button className="tz-btn tz-btn--secondary"><SIc n="printer" style={{ width: 18, height: 18 }} /> Cetak Jadwal</button>
      </div>
      <div className="tz-card tz-card--pad">
        <div className="sched">
          <div></div>
          {sc.days.map((d) => <div key={d} className="sched__head">{d}</div>)}
          {sc.times.map((tm) => (
            <React.Fragment key={tm}>
              <div className="sched__time">{tm}</div>
              {sc.days.map((d) => {
                const cell = sc.cells[d + "-" + tm];
                if (!cell) return <div key={d} className="sched__col"></div>;
                const c = SCHED_COLORS[cell.c];
                return (
                  <div key={d} className="sched__col">
                    <div className="sched__cell" style={{ background: c.bg, borderLeftColor: c.bd }}>
                      <div className="mk">{cell.mk}</div>
                      <div className="meta"><SIc n="map-pin" style={{ width: 11, height: 11 }} /> {cell.ruang}</div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Nilai ---------- */
function Nilai() {
  const [tab, setTab] = uS("khs");
  const tabs = [{ value: "khs", label: "KHS Semester" }, { value: "transkrip", label: "Transkrip" }];
  return (
    <div className="content">
      <div className="page-head"><div><div className="ds-eyebrow">Kartu Hasil Studi</div><h1>Nilai & Transkrip</h1></div>
        <button className="tz-btn tz-btn--secondary"><SIc n="download" style={{ width: 18, height: 18 }} /> Unduh PDF</button>
      </div>
      <div className="grid grid-4">
        <Stat label="IP Semester" value="3.62" icon="bar-chart-3" delta="Semester 4" />
        <Stat label="IPK Kumulatif" value={SD.student.ipk} icon="award" delta="+0.06" />
        <Stat label="SKS Lulus" value="108" icon="check-check" delta="Tanpa mengulang" />
        <Stat label="Predikat" value="Cum Laude" icon="medal" delta="Sementara" />
      </div>
      <div className="tz-card" style={{ overflow: "hidden" }}>
        <div className="tz-card__header" style={{ paddingBottom: 0, borderBottom: "none" }}>
          <div className="tz-tabs" style={{ border: "none" }}>
            {tabs.map((t) => <button key={t.value} className={"tz-tab" + (tab === t.value ? " tz-tab--active" : "")} onClick={() => setTab(t.value)}>{t.label}</button>)}
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Nilai</th><th>Bobot</th></tr></thead>
          <tbody>
            {SD.nilai.map((n) => (
              <tr key={n.kode}>
                <td className="kode">{n.kode}</td>
                <td className="mk-name">{n.mk}</td>
                <td className="num">{n.sks}</td>
                <td><span className={"tz-badge tz-badge--" + n.w}>{n.n}</span></td>
                <td className="num">{n.bobot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Profil ---------- */
function Profil() {
  const s = SD.student;
  return (
    <div className="content">
      <div className="page-head"><div><div className="ds-eyebrow">Data Diri</div><h1>Profil Mahasiswa</h1></div></div>
      <div className="grid" style={{ gridTemplateColumns: "280px 1fr", alignItems: "start" }}>
        <div className="tz-card tz-card--pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <span className="tz-avatar tz-avatar--lg" style={{ width: 88, height: 88, fontSize: 30 }}>AR</span>
          <div><div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-strong)" }}>{s.nama}</div><div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{s.nim}</div></div>
          <span className="tz-badge tz-badge--success tz-badge--">Mahasiswa Aktif</span>
          <button className="tz-btn tz-btn--secondary tz-btn--sm tz-btn--block"><SIc n="camera" style={{ width: 16, height: 16 }} /> Ubah Foto</button>
        </div>
        <div className="tz-card">
          <div className="tz-card__header"><div className="tz-card__title">Data Akademik</div><button className="tz-btn tz-btn--ghost tz-btn--sm"><SIc n="pencil" style={{ width: 16, height: 16 }} /> Edit</button></div>
          <div className="tz-card__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Field label="Program Studi" value={s.prodi} />
            <Field label="Angkatan" value={s.angkatan} />
            <Field label="Semester" value={"Semester " + s.semester} />
            <Field label="Dosen Pembimbing" value={s.dpa} />
            <Field label="Status" value="Aktif" />
            <Field label="Email Kampus" value="aisyah.r@student.tazkia.ac.id" />
          </div>
        </div>
      </div>
    </div>
  );
}
function Field({ label, value }) {
  return <div><div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div><div style={{ fontWeight: 600, color: "var(--text-strong)" }}>{value}</div></div>;
}

window.SIAKAD_SCREENS = { Dashboard, Krs, Jadwal, Nilai, Profil };
