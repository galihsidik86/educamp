# Audit UI/UX — Tazkia SIAKAD (`apps/web`)

**Cakupan:** token layer (`tokens/*.css`), DS component styles (`components/components.css` + `.jsx`), app shell (`apps/web/src/styles/app.css`, `AppShell/Sidebar/Topbar/Modal/Toast`), dan sampel halaman per role (mahasiswa, dosen, akademik, wali).
**Metode:** baca kode statis, tidak ada perubahan dilakukan. Semua temuan dirujuk ke `file:baris`.

---

## 1. Kondisi visual saat ini

### Token layer — fondasi kuat
`tokens/colors.css`, `spacing.css`, `typography.css`, `elevation.css` sudah didesain dengan disiplin:
- **Palet**: skala 10-step Tazkia Blue (`--blue-50`…`--blue-950`), Gold/Emas (`--gold-50`…`--gold-900`), Green "Tumbuh", plus status merah/amber — semuanya diberi alias semantik (`--brand`, `--accent`, `--action`, `--surface-*`, `--text-*`, `--success-fg` dst). Ini adalah pola token yang benar: komponen konsumsi alias, bukan skala mentah.
- **Tipografi**: 3 font sesuai brand guideline (Plus Jakarta Sans / Spectral / JetBrains Mono), type scale 11px–60px yang di-tuning untuk UI data-dense, `tabular-nums` sudah dipakai konsisten untuk angka.
- **Spacing**: grid 4px bersih, plus token ritme komponen (`--gap-card`, `--pad-card`, dst) — memudahkan konsistensi padding di seluruh app.
- **Elevation/motion**: shadow biru-tinted lembut, radius scale "institutional, never pill-everything" sesuai `CLAUDE.md`.

### DS component layer — flat & institusional (sesuai desain awal)
`components/components.css` mendefinisikan `.tz-btn`, `.tz-card`, `.tz-stat`, dll sebagai **flat, solid color, shadow tipis** — tidak ada gradient/glass di sini (`components/components.css:28-44`, `:145-165`). Ini match dengan prinsip "no glassmorphism, no rainbow gradients" di `CLAUDE.md`.

### App layer — sudah "dipoles" berat, menyimpang dari DS
`apps/web/src/styles/app.css` sekarang **2382 baris**, ditumpuk dalam beberapa "paket" (Paket A/B/C, "UUPM iterasi") yang menambahkan gradient, shimmer, glow, animasi entrance ke hampir semua komponen inti — menimpa gaya flat yang didefinisikan DS. Detail di §2.

### Halaman aplikasi — campuran class DS + class app.css + inline style
Contoh representatif: `WaliDashboard.tsx`, `mahasiswa/Dashboard.tsx`, `akademik/Mahasiswa.tsx` — semuanya memakai kombinasi `<Card>`/`<StatCard>` (DS), class utilitas app.css (`stack`, `row`, `muted`, `mono`), **dan** inline `style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}` berulang-ulang di tempat yang sama persis dengan yang sudah disediakan class `.muted`/`.tz-*`. Tidak ada satu pola dominan per jenis elemen.

### Shell (Sidebar/Topbar/Modal/Toast)
Struktur solid — drawer mobile, sticky topbar, animasi masuk/keluar modal yang disinkron dengan JS (`Modal.tsx:6` `EXIT_MS = 180` ↔ `app.css:1081` `180ms`), toast stack dengan `aria-live`. Sidebar akademik sangat dalam (7 grup, hingga 11 item per grup) — lihat §2.9.

---

## 2. 10 masalah visual terbesar (diurutkan dari dampak tertinggi)

### 1. Dua sumber kebenaran untuk styling komponen inti (DS vs app.css)
`components/components.css:28` mendefinisikan `.tz-btn--primary { background: var(--action); }` (flat, solid) — tapi `apps/web/src/styles/app.css:2094-2131` menimpanya dengan gradient dua-warna + shimmer sweep animasi diagonal + glow shadow saat hover. Pola sama terjadi di `.tz-card` (hover-lift ditambahkan via `app.css:1371-1391`), `.tz-stat` (accent strip + rotate icon di `app.css:2017-2077`). DS `.jsx`/`.d.ts` tidak pernah diupdate untuk merefleksikan varian baru ini — artinya siapa pun yang membaca DS source of truth (root `components/`) akan melihat komponen yang terlihat beda dari yang sebenarnya dirender di `apps/web`. Risiko: drift makin lebar tiap kali ada "paket polish" baru, dan tidak ada cara memverifikasi konsistensi lewat `_adherence.oxlintrc.json` karena aturan itu hanya menyasar DS `.jsx`, bukan `app.css`.

### 2. Warna aksen Gold gagal kontras WCAG AA di atas surface terang
- `--accent` (gold-500, `#C28D1E`) di atas putih ≈ **2.95:1**
- `--accent-strong` (gold-600, `#A2711A`) di atas putih ≈ **4.27:1**
- Ambang WCAG AA untuk teks normal (bukan large text) adalah **4.5:1** — keduanya gagal.

Ini bukan kasus tepi: `--accent` dipakai untuk **eyebrow di `PageHead`** (`apps/web/src/components/PageHead.tsx` → `.page-head__eyebrow { color: var(--accent) }`, `app.css:360`) yang muncul di hampir setiap halaman list/detail di seluruh role, juga untuk tanda wajib isi `.tz-req` (`app.css:546`) di setiap form. Untuk institusi pendidikan, aksesibilitas teks pada elemen yang berulang di semua halaman adalah isu compliance, bukan kosmetik kecil.

### 3. Selector CSS fragil yang menyasar inline style / posisi DOM, bukan class semantik
Banyak rule "polish" di `app.css` bergantung pada string inline `style` atau urutan anak DOM, bukan class:
- `app.css:376-377` — `.tz-card:has([style*="cursor: pointer"])`
- `app.css:689-691` — `.stack > a[href]:first-child:has(svg)`
- `app.css:393-394` — `.stack > .row:has(.tz-input):has(+ .tz-table-wrap)`
- `app.css:748` — `.tz-card div[style*="surface-sunken"]`

Pendekatan ini rapuh: kalau developer halaman mengubah urutan markup, memindahkan `style` inline ke class, atau menambah elemen di antara, styling hilang **tanpa error, tanpa lint warning** — silent breakage. Ini juga membuat kontrak visual komponen tidak bisa diverifikasi lewat review kode biasa (harus render browser untuk tahu apakah selector match).

### 4. Inline style bertebaran & tidak konsisten menggantikan class yang sudah ada
Pola berulang di banyak halaman (`WaliDashboard.tsx:61,64-75,106,110-114`; `akademik/Mahasiswa.tsx:107`) menulis ulang `style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}` padahal ini persis definisi `.muted` + `.ds-eyebrow`/`.section-eyebrow` yang sudah ada di token/app.css. Efeknya: (a) JSX gemuk & sulit dibaca, (b) kalau token spacing/typography berubah, halaman-halaman ini tidak ikut ter-update karena nilainya di-hardcode di banyak tempat berbeda, (c) drift visual antar halaman yang seharusnya identik (mis. label KPI di satu halaman pakai `.section-eyebrow`, di halaman lain di-reimplementasikan manual dengan sedikit beda spacing).

### 5. `app.css` sudah membengkak jadi 2382 baris tanpa modularisasi
File tunggal berisi shell layout, login, tabel, modal, toast, tooltip, breadcrumb, kartu mahasiswa, cetak KRS, DAN berlapis-lapis "paket" polish (baris ~1290 dst: "UUPM Tazkia SIAKAD refresh Option B", "Paket A/B/C", "iterasi") yang saling override satu sama lain (`.pill { transition: ... }` didefinisikan ulang di baris 1146, 1307, dan 2324-2329 — 3 kali di file yang sama). Tidak ada pemisahan per-fitur (mis. `shell.css`, `table.css`, `modal.css`, `polish.css`) sehingga sulit tahu efek kumulatif suatu class tanpa membaca seluruh file, dan mudah terjadi duplikasi/konflik override yang tidak disengaja.

### 6. Token drift — referensi token yang tidak ada, jatuh ke hex mentah
Komponen Kartu Mahasiswa (`app.css:1216-1273`) memakai `var(--brand-primary, #0c2340)` dan `var(--accent-fg, gold)` — **kedua nama token ini tidak pernah didefinisikan** di `tokens/colors.css` (yang ada adalah `--brand` dan `--accent`). Karena CSS custom property yang tidak terdefinisi otomatis fallback ke nilai kedua, kartu mahasiswa diam-diam selalu memakai hex mentah `#0c2340`/`gold` — melanggar aturan "No raw values in DS" di `CLAUDE.md`, dan warnanya **tidak ikut berubah** jika suatu saat token brand di-rebrand/disesuaikan.

### 7. Motion overload — terlalu banyak animasi ambient berjalan bersamaan
Dalam satu dashboard biasa bisa aktif serentak: `hero-glow` infinite 8s di `DashboardHero`, `bar-shimmer` infinite 2.5s di setiap `.tz-bar__fill`, `pill-dot-blink` infinite 1.6s di status pill "aktif/berjalan", plus stagger entrance di tiap KPI card. Untuk institusi pendidikan Islam yang ingin kesan "modern, clean, profesional, tenang", akumulasi animasi looping yang tidak merepresentasikan perubahan state nyata berisiko terasa ramai/gimmicky, bukan tenang-berwibawa. (Poin plus: `prefers-reduced-motion` sudah dihormati secara global di `app.css:1295-1304` — bagus, tapi tidak menyelesaikan kesan default untuk user tanpa preferensi tsb.)

### 8. Baris aksi tabel admin menumpuk terlalu banyak tombol
`akademik/Mahasiswa.tsx:110-121` merender 5 `Button` ghost berdampingan (Transkrip, Kehadiran, Edit, Reset PW, Hapus) per baris tabel. Pada layar sempit/data padat baris ini wrap tidak rapi dan sulit di-scan; pola ini kemungkinan berulang di halaman admin lain (Dosen, Kelas, dll — belum diverifikasi satu-satu tapi struktur `Button`-per-aksi tampak jadi konvensi tim).

### 9. Sidebar Akademik terlalu dalam tanpa alat bantu navigasi
Role `akademik` punya 7 grup collapsible dengan total ~50 item (`Sidebar.tsx:180-291`), grup "Layanan" saja berisi 11 item. Tidak ada search/filter/quick-jump di sidebar — user harus scan visual atau ingat grup yang benar. Untuk role dengan menu sebanyak ini, cognitive load navigasi cukup tinggi.

### 10. Momen "serif institusional" dipakai tidak konsisten
`CLAUDE.md` menetapkan Spectral (serif) untuk "display/institutional moments". `DashboardHero.tsx`/`app.css:2284-2293` memakai serif untuk judul hero — tapi `PageHead.tsx`/`app.css:375-381`, yang muncul jauh lebih sering (tiap halaman list/detail/form), tetap pakai sans default. Akibatnya sinyal visual "ini momen penting institusional" tidak konsisten — sebagian halaman terasa lebih "berat/formal" dari yang lain tanpa alasan hierarki yang jelas.

---

## 3. Rekomendasi arah desain

Tazkia SIAKAD sudah punya **fondasi token yang benar** dan **identitas brand yang jelas** (Navy + Gold, pattern geometris tipis, tanpa glass/rainbow). Arah yang direkomendasikan bukan mendesain ulang, melainkan **menegakkan kembali disiplin token→komponen** yang sudah tertulis di `CLAUDE.md` tapi mulai tererosi oleh lapisan `app.css`:

1. **Satu sumber kebenaran per komponen.** Efek visual apa pun (gradient tombol, hover lift kartu, accent strip stat) harus diputuskan: **jadi bagian resmi DS** (update `.jsx` + `.d.ts` + `_adherence.oxlintrc.json` di root `components/`) **atau dihapus** dari `app.css`. Tidak boleh ada override diam-diam yang membuat root DS dan aplikasi terlihat berbeda.
2. **Gold sebagai aksen langka dan bertenaga tinggi, bukan warna teks kecil di atas terang.** Pertahankan gold untuk garis aksen, dot indikator, ikon aktif, dan — terpenting — di atas navy (kontras tinggi, sudah benar di sidebar/hero). Untuk teks di atas surface terang (eyebrow, asterisk wajib), pakai warna yang lolos 4.5:1 (mis. turunkan lightness gold lebih jauh khusus untuk kebutuhan teks, atau alihkan ke `--text-strong`/`--brand` dengan aksen gold hanya sebagai bullet/garis, seperti pola `.section-eyebrow::before` yang sudah benar).
3. **Restrained motion.** Animasi sebaiknya merespons **state/aksi nyata** (submit, load selesai, klik) — bukan berjalan terus tanpa henti. Pertimbangkan menghapus/menjadikan opt-in animasi ambient (`bar-shimmer`, `hero-glow`, `pill-dot-blink`) kecuali untuk status yang benar-benar butuh perhatian mendesak (mis. tetap pakai `pill--pulse` untuk `jatuh_tempo`, tapi lepas shimmer dekoratif di progress bar biasa).
4. **Flat-first, shadow-soft** sebagai bahasa visual utama (sudah didefinisikan dengan baik di `components.css` + `tokens/elevation.css`) — ini yang memberi kesan modern-clean-profesional untuk institusi pendidikan Islam: tenang, tidak "startup gimmicky". Gradient+shimmer boleh dipertahankan **sangat selektif** (mis. hanya CTA utama satu per halaman), bukan default semua tombol/kartu.
5. **Class semantik di atas inline style.** Halaman aplikasi sebaiknya mengandalkan class yang sudah ada (`muted`, `mono`, `section-eyebrow`, `.tz-*`) atau utility baru yang eksplisit, bukan mengulang `style={{ fontSize: 'var(--text-xs)', ... }}` di puluhan tempat — ini juga yang akan membuat selector `:has([style*=...])` di masalah #3 menjadi tidak diperlukan lagi.

---

## 5. Changelog — eksekusi (setelah audit ini)

Bagian §1-4 di atas adalah laporan audit asli (baca-kode-saja, sebelum ada perubahan). Bagian ini mencatat apa yang benar-benar dikerjakan sesudahnya, fase demi fase, sebagai riwayat visual singkat.

### Fase 1 — Token
- `--accent-text: var(--gold-700)` ditambahkan sebagai warna teks Gold yang lolos WCAG AA di atas surface terang (dipakai `.ds-eyebrow`, `.page-head__eyebrow`, `.tz-req`) — menutup masalah #2.
- Fallback hex mentah `--brand-primary`/`--accent-fg` di Kartu Mahasiswa diganti ke token asli `--brand`/`--accent` — menutup masalah #6.

### Fase 2 — Shell
- `AppShell.tsx`/`Sidebar.tsx`/`Topbar.tsx`/`Breadcrumb.tsx` dirombak: sidebar dapat search filter menu (`.sidebar__search`) untuk mengurangi beban kognitif 7 grup/~50 item (masalah #9), collapse grup pakai teknik `grid-template-rows: 1fr↔0fr` (animasi tinggi CSS-murni, bukan `max-height`), topbar dapat dropdown user-menu (avatar+nama+"Profil"/"Keluar" alih-alih tombol Keluar selalu tampil).

### Fase 3 — Komponen inti (satu commit per komponen)
Card, Button (+ prop `loading`/`aria-busy`), Table+StatusPill, Form, Modal+ConfirmDialog, Toast, EmptyState+Skeleton, DashboardHero — didesain ulang konsisten dengan token baru. Beberapa bug nyata ditemukan & diperbaiki di jalan: `.tz-btn:active` terduplikasi (versi `app.css` diam-diam menang atas `components.css`), `.modal-tabs__btn` mereferensikan token yang tidak pernah ada (`--surface-muted`, `--surface-elev`, `--shadow-1`) sehingga hover/active state tab modal tidak pernah bekerja.

### Refresh token (typografi/warna/elevation/transisi)
Type scale dari `--text-base` naik ke rasio 1.25 ketat, kontras warna dihaluskan lewat `color-mix(in oklch, ...)` (bukan hex baru), radius scale dibuat lebih membulat (`--radius-xs:6px` … `--radius-2xl:32px`), shadow multi-layer lebih lembut, ditambah `--transition-fast`/`--transition-base`.

### Fase 4 & polish per-role (mahasiswa → dosen → akademik → wali)
Setiap halaman list/tabel diverifikasi: Dashboard pakai `DashboardHero`+`StatCard` grid, halaman tabel besar (roster mahasiswa bimbingan, kelas, nilai, dst.) dapat search/filter client-side (`useState`+`useMemo`, tidak menyentuh react-query), halaman cetak diverifikasi tanpa diubah. ~35 halaman lintas 4 role mendapat search bar baru; beberapa bug token-drift lain ditemukan sekalian (`--surface-default` yang tidak pernah ada di `NilaiCpmk.tsx`, dsb).

### Tahap akhir — aksesibilitas, responsive, loading state
- **Responsive**: breakpoint drawer sidebar (≤880px) dan `.tz-table-wrap { overflow-x: auto }` sudah benar sejak Fase 2; satu celah ditemukan & diperbaiki — `.grid-2col` stack di 760px, meleset dari 768px (breakpoint tablet standar), dinaikkan ke 800px.
- **Fokus & keyboard**: `.spmi-nav-card:focus-visible` memakai outline emas yang beda sendiri dari ring biru standar (`--shadow-focus`) di seluruh app — disamakan. Sidebar search input tidak punya indikator fokus nyata di elemen `<input>`-nya sendiri — ditambah ring. 8 titik kartu yang navigasinya lewat `onClick` pada `<div>` (bukan `<Link>`/`<button>`) tidak bisa dijangkau keyboard sama sekali — ditambah `role="button" tabIndex={0} onKeyDown` (Enter/Space).
- **Kontras WCAG AA**: `--text-muted` (dipakai `.muted`, label tabel, `.pill--neutral`, dan puluhan tempat lain) diaudit dan ternyata hanya 4.09–4.35:1 di atas surface terang — gagal AA (4.5:1). Dinaikkan dari `--neutral-500` ke `--neutral-600` (6.16:1), root-cause fix yang otomatis membenahi semua turunannya.
- **Loading state**: komponen `Skeleton` sudah ada sejak Fase 3 tapi tidak pernah benar-benar dipakai di halaman manapun — audit menemukan 130+ titik "Memuat…" berupa teks polos di ~74 halaman tabel/roster lintas role, plus satu halaman (`mahasiswa/Heregistrasi.tsx`) yang bahkan tidak punya indikator loading sama sekali (tbody kosong tak bisa dibedakan dari "belum ada data"). Ditambah dua helper baru — `TableSkeletonRows` (baris shimmer di dalam `<tbody>`) dan `PageLoadingSkeleton` (placeholder halaman penuh) — lalu semua titik itu dikonversi.

---

## 4. Rencana eksekusi bertahap (token → shell → komponen → halaman)

Setiap fase didesain agar **aman & reversibel** — tidak ada fase yang butuh redesain besar, dan tiap fase bisa diverifikasi/diverifikasi ulang secara independen sebelum lanjut.

### Fase 1 — Token (risiko paling rendah, dampak paling luas)
- Perbaiki kontras teks Gold: tambah token khusus teks (mis. `--accent-text` yang lolos 4.5:1 di atas `--surface-card`) atau turunkan `--accent-strong` sedikit, lalu pakai token itu di `.page-head__eyebrow`, `.ds-eyebrow`, `.tz-req`, dan tempat lain yang memakai gold sebagai warna teks di atas surface terang.
- Hapus fallback hex mentah di Kartu Mahasiswa (`--brand-primary`, `--accent-fg`) → ganti ke token nyata (`--brand`, `--accent`) yang sudah ada.
- Verifikasi: jalankan `oxlint -c _adherence.oxlintrc.json` (menyasar DS `.jsx`) + cek kontras manual/otomatis untuk semua pasangan token teks-di-atas-surface yang dipakai luas.

### Fase 2 — Shell (Sidebar/Topbar/Modal/Toast)
- Sidebar akademik: evaluasi penambahan search/filter cepat atau reorganisasi grup (mis. gabung grup kecil, pindahkan item jarang dipakai ke sub-halaman "Lainnya") — bukan redesain total, cukup pengurangan beban kognitif.
- Redam animasi ambient di shell (`hero-glow`, scrollbar hover glow) jadi lebih subtle atau non-looping, sambil mempertahankan brand chrome (navy + pattern geometris + gold glow) yang sudah sesuai `CLAUDE.md`.
- Verifikasi: uji manual navigasi tiap role di browser, pastikan drawer mobile & sticky topbar tidak regresi.

### Fase 3 — Komponen (keputusan arsitektur, dampak sedang-tinggi tapi terisolasi)
- Untuk tiap efek "polish" di `app.css` (gradient tombol, card hover-lift, stat accent strip, shimmer): putuskan **promote ke DS resmi** (pindahkan ke `components/components.css` + update `.jsx`/`.d.ts`/adherence config) atau **turunkan/hapus**.
- Ganti selector `:has([style*=...])`/`:first-child:has(svg)` dengan prop/className eksplisit di komponen React terkait (mis. `<Card hover>` sudah punya prop `hover` di `Card.jsx:3` — pastikan semua kartu yang butuh efek hover pakai prop ini alih-alih mengandalkan inline `style="cursor:pointer"` yang kebetulan match selector).
- Verifikasi: visual regression manual per komponen di Storybook/prototype DS (`ui_kits/siakad/index.html`) sebelum rollout ke `apps/web`.

### Fase 4 — Halaman (iteratif per modul, risiko terisolasi per PR)
- Sapu bersih inline `style={{...}}` yang menduplikasi class yang sudah ada, modul demi modul (mahasiswa → dosen → akademik → wali), diganti class semantik atau utility baru yang didokumentasikan.
- Untuk baris tabel dengan >3 aksi (mis. `akademik/Mahasiswa.tsx`), konsolidasikan ke menu overflow (`IconButton` + dropdown) agar tabel tetap ringkas di layar sempit.
- Selaraskan pemakaian serif "institutional moment" — putuskan satu aturan jelas (mis. hanya di `DashboardHero`, tidak di `PageHead`) dan dokumentasikan supaya tidak drift lagi.
- Verifikasi: jalankan tiap halaman yang diubah di browser (dev server), bandingkan sebelum/sesudah screenshot per role.
