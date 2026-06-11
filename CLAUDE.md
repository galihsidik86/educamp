# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **Tazkia SIAKAD** repository contains **two coexisting layers**:

1. **The design system** at the repo root — buildless tokens + `.jsx` components + UI prototype, originally consumed via `@babel/standalone` (`ui_kits/siakad/index.html`). Still the source of truth for tokens & components.
2. **The full SIAKAD application** in `apps/` — Node + Express + Prisma + MySQL backend (`apps/api`) and Vite + React + TS frontend (`apps/web`) that imports the design system via Vite alias `@ds → repo root`.

The application implements the full academic information system (mahasiswa, dosen, akademik portals) over the DS — building a new module or screen usually means working in `apps/`, **not** duplicating DS files.

## Running

| Mode | How |
|---|---|
| **Design system prototype** | Open `ui_kits/siakad/index.html` directly (buildless, React via CDN) |
| **Application (dev)** | `cp .env.example .env` → `docker compose up -d mysql adminer` → `npm install` → `npm run prisma:migrate` → `npm run prisma:seed` → `npm run dev` |
| **Application (prod)** | See `DEPLOY.md` — `docker compose -f docker-compose.prod.yml up -d` |
| **Adherence lint** (DS only) | `oxlint -c _adherence.oxlintrc.json` |

Seed accounts (all `password123`): `akademik@tazkia.ac.id` · `dosen.budi@tazkia.ac.id` · NIM `2021110001` (Aisyah).

## Architecture — application

**Monorepo** (npm workspaces): `apps/api`, `apps/web`. Root scripts in `package.json` proxy to both (`npm run dev` runs API+Web in parallel).

**Backend (`apps/api`)** — Node 20 + Express + TypeScript ESM + Prisma + MySQL 8.
- Modules are organized **per role** under `src/modules/{mahasiswa,dosen,akademik}/`. Each role module mounts a single `Router` with `requireAuth + requireRole(role)` middleware at the top, then composes per-domain sub-routers (e.g. `mahasiswa/krs.ts`, `dosen/kelas.ts`, `akademik/keuangan.ts`).
- **Auth**: `src/modules/auth/` — JWT access + refresh, refresh-token rotation with revocation table (`RefreshToken` model). Login accepts email **or** NIM (mahasiswa) — see `auth.service.ts`. Token verification middleware at `src/middleware/auth.ts`.
- **Helpers**: `src/lib/context.ts` (`getMahasiswaForUser`, `getDosenForUser`, `getAkademikForUser`, `getActiveSemester` — call these from route handlers, don't query the user table directly), `src/lib/grade.ts` (skala 4 Kemendikbud: A≥85, AB≥75, B≥70, BC≥65, C≥56, D≥40, E<40; computes IP/IPK), `src/lib/jwt.ts`, `src/lib/password.ts` (bcrypt), `src/lib/errors.ts` (`HttpError` subclasses).
- **Error contract**: handlers throw `BadRequest/Unauthorized/Forbidden/NotFound/Conflict` from `lib/errors.ts`; `middleware/error.ts` formats them as `{ error: { code, message, details? } }`. Zod errors auto-convert to 400 with `VALIDATION_ERROR`.
- **Env**: `src/env.ts` validates with Zod at startup, exits if invalid. CORS allow-list comes from `CORS_ORIGINS` (comma-separated).

**Frontend (`apps/web`)** — Vite + React 18 + TS + React Router 6 + TanStack Query + react-hook-form + Zod.
- Routes are split per role under `src/routes/{mahasiswa,dosen,akademik}/`. The `<AppShell role>` component (sidebar + topbar) wraps each role tree; `<ProtectedRoute role>` guards by checking `useAuth().state.user.role`.
- **API client**: `src/lib/api.ts` — fetch wrapper with auto-attach access token + auto-refresh on 401 (single in-flight refresh promise). Throws `ApiError` mirroring backend error contract. `tokenStore` holds access in memory + refresh in `localStorage` (`siakad.refresh`).
- **Queries**: `src/lib/queries.ts` (mahasiswa), `queries-dosen.ts`, `queries-akademik.ts` — typed TanStack Query hooks. Mutations invalidate by key prefix (`['krs']`, `['admin-mhs']`, etc).
- **Auth context**: `src/lib/auth.tsx` provides `useAuth()` returning `{ state, login, logout, refreshProfile }`. On mount, if refresh token exists in localStorage, bootstraps by calling `/auth/me`.
- **Design system reuse**: `src/ds/index.tsx` re-exports DS components from `@ds/components/...` (the root `.jsx` files). Vite resolves to `.jsx` at runtime, TypeScript reads the co-located `.d.ts` for types. **Do not duplicate DS components into `apps/web/src/`** — always import from `@/ds`.
- **App layout CSS**: `src/styles/app.css` holds product chrome (shell grid, schedule grid, login split, table styles, pill, modal) — distinct from DS tokens/components. Uses DS tokens for all colors/spacing/radii.
- **Reusable layout helpers**: `<PageHead>`, `<StatusPill>`, `<Modal>`, `<KegiatanForm>` (penelitian/pengabdian list+CRUD), `<Sidebar role>`, `<Topbar>`.

**Database (`apps/api/prisma/schema.prisma`)** — MySQL via Prisma. 27 models covering: User+RefreshToken (auth), Mahasiswa/Dosen/Akademik (roles linked 1:1 to User), Fakultas/Prodi, TahunAjaran/Semester (with periode KRS/PRS/Nilai timestamps), Kurikulum/MataKuliah/Prasyarat, Ruangan/Kelas, Krs/Nilai, Tagihan/Pembayaran, Penelitian/Pengabdian+anggota, Kkn, Pengumuman. **Schema is PDDikti-friendly** (NIM 10 digit, NIDN, kode prodi, jenjang enum, jabatan fungsional enum, status mahasiswa enum). Seed at `prisma/seed.ts` is idempotent (uses `upsert` on unique keys) — safe to re-run.

**Docker** — `docker-compose.yml` (dev: mysql + adminer + optional api/web), `docker-compose.prod.yml` (prod: mysql + api + web/nginx). Production uses multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`). Web container serves SPA + proxies `/api/*` → `api:4000/*` via `apps/web/nginx.conf` (same-origin from browser, so CORS is moot in prod).

## Where to add things

- **New API endpoint for an existing role** → drop a route file in `apps/api/src/modules/<role>/` and mount it in that role's `index.ts`. Use `getXForUser(req.user!.sub)` to resolve the domain entity. Throw typed errors from `lib/errors.ts`.
- **New screen for an existing role** → add `apps/web/src/routes/<role>/MyScreen.tsx`, wire its route in `apps/web/src/App.tsx`, add nav entry in `apps/web/src/components/Sidebar.tsx`. If it needs new data, add a hook in the role's `queries-*.ts`.
- **New DS component** → still goes in the DS root (`components/<group>/<Name>.jsx` + `.d.ts` + `.prompt.md`), updates `_ds_manifest.json` + `_ds_bundle.js` + `_adherence.oxlintrc.json`, then re-export from `apps/web/src/ds/index.tsx`. **Don't write app-only "design components" inside `apps/web/src/components/` if they belong in the DS.**

## Conventions (the adherence config encodes these)

These apply to **DS components themselves** (the `.jsx` files at the root); the application code in `apps/web` uses inline styles freely against DS tokens via `var(--...)`.

- **No raw values in DS.** Use tokens via `var(--...)`. Raw hex (`#xxxxxx`) and literal `px` units are linted as warnings. Spacing comes from `--space-*` / `--pad-*` / `--gap-*`; radii from `--radius-*`; shadows from `--shadow-*`.
- **Only three font families:** `Plus Jakarta Sans` (UI/body), `Spectral` (display/serif), `JetBrains Mono` (data — NIM, NIDN, IPK, SKS, kode MK, jam). Use `tabular-nums` for any numeric data.
- **DS declared props are exhaustive.** Each component allows only the props listed in its `.d.ts` and enforced in `_adherence.oxlintrc.json`. Variants are enumerated — don't invent new ones; add a real variant to the component + CSS + lint rule if needed.
- **One primary action per view.** Use `Button variant="accent"` (gold) only for celebratory/positive emphasis, never as the default CTA.
- **Brand chrome.** Navy sidebar with ~5-7% opacity Islamic geometric pattern overlay (`assets/pattern-geometric.svg`) and a gold radial glow on hero/login surfaces. No glassmorphism, no rainbow gradients, no emoji in product chrome.
- **Copy is Bahasa Indonesia, formal-but-warm.** Standard academic terms (Mahasiswa, KRS, KHS, SKS, IPK, DPA, Semester Ganjil/Genap). Islamic greetings welcome in personal contexts. Sentence case for body/buttons/labels; ALL-CAPS letter-spaced for eyebrows/table heads only. Status is communicated by Badge/dot/`<StatusPill>`, never emoji.

## Skill packaging

`SKILL.md` (frontmatter `name: tazkia-design`, `user-invocable: true`) packages **the DS layer** as an Agent Skill — invocation should default to producing DS-styled artifacts (static HTML) or DS-conformant code, not arbitrary SIAKAD application work.

## Outstanding placeholders

Per `readme.md` "Caveats": the logo (`assets/logo-tazkia*.svg`) is a typographic placeholder, fonts load from Google Fonts CDN (not self-hosted), Lucide is a substitution for an unspecified icon set, and brand HEX values are derived from public identity. Flag these if a task depends on official assets.
