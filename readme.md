# Tazkia SIAKAD — Design System

Design system for the **STMIK Tazkia** academic information system (*Sistem Informasi Akademik*,
"SIAKAD") — a complete, user-friendly platform covering the **Tri Dharma Perguruan Tinggi**
(pendidikan, penelitian, pengabdian masyarakat) and aligned with current Indonesian higher-education
regulations (PDDikti, Kampus Merdeka, etc.).

STMIK Tazkia is the IT college (Sekolah Tinggi Manajemen Informatika dan Komputer) of the Tazkia
group in Sentul, Bogor — founded under Prof. Dr. M. Syafi'i Antonio. Tagline: **"Kampus Luar Biasa!"**
Programs include Sistem Informasi and Teknik Informatika.

## Brand foundation
The Tazkia identity is anchored in **deep blue** (kecerdasan, stabilitas, *ukhuwah*, keteguhan),
accented with **emas/gold** (prestasi, nilai keislaman) and supported by **green** (*Tazkia* = tumbuh
& berkembang dengan bersih). The institutional values are **T.A.Z.K.I.A**: Tauhid · Amanah ·
Zero-defect · Knowledge & competence · Istiqomah & innovation · Achievement through teamwork.

## Sources
> No codebase, Figma, or brand kit was attached. This system was authored from the company brief
> plus public information about STMIK / STEI Tazkia (institutional colors, values, tagline, programs).
> The logo and webfonts are **placeholders/substitutions** pending official assets — see Caveats.

---

## CONTENT FUNDAMENTALS

**Language.** Primary UI language is **Bahasa Indonesia** (formal-but-warm). Academic terms keep their
standard Indonesian forms: *Mahasiswa, Kartu Rencana Studi (KRS), Kartu Hasil Studi (KHS), Transkrip,
SKS, IPK/IP, Dosen Pembimbing Akademik (DPA), Semester Ganjil/Genap*. Foreign tech terms used as-is
where standard (dashboard, login).

**Voice & person.** Address the student warmly and directly — Islamic greetings are welcome in
personal contexts (e.g. *"Assalamu'alaikum, Aisyah"*). System/instructional copy is neutral and
clear ("Pengisian KRS ditutup 12 Agustus 2025"). Avoid slang; avoid stiff bureaucratic jargon.

**Casing.** Sentence case for body, buttons, and most labels (*"Isi KRS", "Simpan Draf"*).
ALL-CAPS reserved for short eyebrows/overlines and table column heads, always letter-spaced.
Title Case only for proper nouns and program names.

**Tone vibe.** Trustworthy, orderly, aspirational, faith-grounded. Confident not flashy. Copy is
concise — labels are nouns, actions are imperative verbs (*Ajukan, Simpan, Unduh, Cetak, Masuk*).

**Numbers & data.** Always tabular and monospaced: NIM (10 digit), NIDN, IPK (2 desimal, e.g. 3.78),
SKS (integer), kode MK (e.g. `IF-3101`), jam (`08:00–09:40 WIB`), tanggal (`12 Agu 2025`).
Currency: `Rp 0`, `Rp 4.500.000` (Indonesian grouping).

**Emoji.** Not used in product chrome. Keep the interface clean; warmth comes from copy + color,
not emoji. Status is communicated with badges + dots, never emoji.

**Examples.**
- Eyebrow: `SEMESTER GANJIL 2025/2026`
- Greeting: `Assalamu'alaikum, Aisyah`
- Empty/helper: `Nomor Induk Mahasiswa 10 digit`
- Deadline alert: `Batas Pengisian KRS — ditutup 12 Agustus 2025, 23:59 WIB.`
- Status: `Lulus` · `Mahasiswa Aktif` · `Menunggu Validasi` · `Mengulang` · `Cuti`

---

## VISUAL FOUNDATIONS

**Color.** Deep Tazkia navy is the institutional anchor (`--brand` #1D3180); a brighter blue
(`--action` #2A45C9) drives interactive elements. Gold (`--accent` #C28D1E) is used sparingly for
emphasis, achievement, and active accents — never as large fills. Green signals growth/success.
Neutrals are **cool, slightly blue-tinted** slates. Status palette: success-green, warning-amber,
danger-red, info-blue, each with fg/surface/border tokens.

**Type.** Three families:
- **Plus Jakarta Sans** (UI, body, most headings) — an Indonesian-designed typeface; weights 400–800.
- **Spectral** (serif) — institutional/marketing display moments and quotes only (e.g. "Kampus Luar Biasa").
- **JetBrains Mono** — all data, codes, IDs, times, with `tabular-nums`.
Scale runs 11→60px on a ~1.25 ratio; UI body is 15px; minimum data size 11px.

**Spacing & layout.** 4px base grid. Fixed app frame: 264px navy sidebar + 64px sticky topbar +
1280px max content. Generous card padding (24px), consistent 20–24px gaps. Prose width capped ~880px.

**Backgrounds.** Mostly flat: page = `--surface-page` (#F6F8FB), cards = white. The **only** decorative
treatments are (1) a subtle **Islamic geometric pattern** (overlapping squares → 8-point stars) at
~5–7% opacity over navy panels, and (2) navy→deep-navy linear gradients with a soft gold radial glow
on hero/login/sidebar surfaces. No photographic backgrounds in chrome; no rainbow gradients.

**Borders, radii, cards.** Corner radii: controls 10px, cards 14px, feature panels 20px; pills 999px
only for badges/avatars/toggles. Cards = white + 1px `--border-subtle` + soft `--shadow-sm`; never a
colored left-border-only accent. Inputs have a 1px strong border + subtle inset shadow.

**Elevation.** Soft, **cool blue-tinted** shadows, low spread (xs→xl). Modals/popovers use xl.
Inputs/wells use an inner shadow.

**Motion.** Quick and purposeful. Standard ease `cubic-bezier(0.2,0,0,1)`; durations 120ms (hover),
200ms (base), 320ms (progress/expand). Toggles use a slightly emphasized ease. No bouncing,
no infinite decorative loops.

**States.** Hover = darker action color (buttons) or tinted surface (ghost/rows/secondary).
Press = 0.5px nudge down. Focus = 3px soft-blue focus ring (`--shadow-focus`). Disabled = 50% opacity.
Active nav = translucent white fill + inset gold edge.

**Transparency/blur.** Used lightly — translucent white fills inside the navy sidebar; pattern
overlays. No heavy glassmorphism.

**Imagery vibe.** When real imagery is added, prefer warm, hopeful campus photography; keep it inside
14px-radius cards. (No stock imagery is shipped here.)

---

## ICONOGRAPHY

- **System: [Lucide](https://lucide.dev)** — loaded via CDN (`<i data-lucide="name">` +
  `lucide.createIcons()`). Chosen for its clean, consistent **1.75 stroke, rounded** geometry, which
  matches the friendly-but-institutional tone. This is a **substitution** (no official Tazkia icon set
  was provided) — flagged for confirmation.
- **Usage.** 24px default in nav/buttons, 18–20px inline, 11–14px micro (badges/table). Color follows
  context — navy `--blue-800` in nav, `--text-muted` for meta, status colors in alerts.
- **No emoji** as icons. **No hand-drawn one-off SVGs** beyond the geometric brand motif. Unicode
  characters are not used as icons.
- Common glyphs: `layout-dashboard, clipboard-list, calendar-days, graduation-cap, wallet, bell,
  user-round, award, layers, map-pin, send, download, printer`.
- **Brand assets** (in `assets/`): `logo-tazkia.svg` (primary), `logo-tazkia-inverse.svg` (on navy),
  `pattern-geometric.svg` (tileable motif). The logo is a **typographic placeholder** — replace with
  the official STMIK Tazkia logo.

---

## INDEX / MANIFEST

**Global entry**
- `styles.css` — links everything below (consumers link this one file).

**Tokens** (`tokens/`)
- `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `elevation.css` · `base.css`

**Components** (`components/`) — React primitives, namespace `window.TazkiaSIAKADDesignSystem_e8738f`
- `core/` — Button, IconButton, Badge, Avatar, Card
- `forms/` — Input, Select, Checkbox, Switch
- `data/` — StatCard, Tabs, ProgressBar
- `feedback/` — Alert
- `components.css` — class-based styling powering all of the above

**UI kits** (`ui_kits/`)
- `siakad/` — Portal Mahasiswa: Login, Dashboard, KRS, Jadwal, Nilai, Profil (see its README)

**Guidelines** (`guidelines/`) — foundation specimen cards rendered in the Design System tab
(Colors, Type, Spacing, Brand).

**Other**
- `SKILL.md` — packaging for use as an Agent Skill.
- `assets/` — logos + geometric motif.

---

## CAVEATS / TO CONFIRM
1. **Logo** is a typographic placeholder (navy tile + 8-point geometric star). Please provide the
   official STMIK Tazkia logo (SVG/PNG) to replace `assets/logo-tazkia*.svg`.
2. **Fonts** load from Google Fonts CDN. For offline/self-hosted production, provide/confirm and we'll
   embed `.woff2` files with local `@font-face` rules.
3. **Icons** use Lucide (substitution). Confirm or supply the preferred icon set.
4. **Brand colors** are derived from public Tazkia identity (deep blue + gold). Confirm exact HEX from
   the official brand guideline if one exists.
