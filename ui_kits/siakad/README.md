# SIAKAD — Portal Mahasiswa (UI Kit)

High-fidelity recreation of the **Tazkia SIAKAD** student portal. Built on the design-system
tokens (`/styles.css`) and component classes (`tz-*`). Fictional sample data only.

## Run
Open `index.html`. It boots to the **login** screen → press *Masuk* to enter the app.
Sidebar navigation switches between screens. State (auth + active screen) persists in `localStorage`
(`tz_authed`, `tz_screen`) for refresh-friendly iteration.

## Screens
| Screen | File | Notes |
|---|---|---|
| Login | `shell.jsx` → `Login` | Split brand panel (geometric motif + gold glow) + credential form |
| Dashboard | `screens.jsx` → `Dashboard` | KPI StatCards, jadwal hari ini, progres studi, pengumuman |
| Kartu Rencana Studi | `screens.jsx` → `Krs` | Course-offer table with checkbox select + sticky SKS summary |
| Jadwal Kuliah | `screens.jsx` → `Jadwal` | Weekly time × day grid with colored class blocks |
| Nilai & Transkrip | `screens.jsx` → `Nilai` | IP/IPK stats, KHS/Transkrip tabs, grade table |
| Profil Mahasiswa | `screens.jsx` → `Profil` | Identity card + academic data fields |

## Structure
- `index.html` — orchestrator: auth gate + screen router, loads React/Babel/Lucide + the kit files.
- `shell.jsx` — `Sidebar`, `Topbar`, `Login`, nav config; exports `window.SIAKAD`.
- `screens.jsx` — content screens; exports `window.SIAKAD_SCREENS`.
- `data.js` — fictional academic data (`window.DATA`).
- `app.css` — product-surface layout (shell, topbar, tables, schedule grid, login).

## Conventions used
- Icons: **Lucide** via CDN (`<i data-lucide="…">`, `lucide.createIcons()` after render).
- Brand chrome: navy sidebar gradient + 5% geometric pattern overlay; gold active accent.
- Data typography: `--font-mono` + `tabular-nums` for NIM, SKS, IPK, kode MK, jam.
- All colors/spacing/radii reference DS tokens — no hard-coded brand values.

> This kit mirrors the existing intended product. Modules not yet specified (Keuangan detail,
> Penelitian/Pengabdian, KKN) are intentionally omitted rather than invented.
