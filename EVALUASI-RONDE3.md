# Evaluasi Ronde 3 — Penyelesaian Rekomendasi Tersisa

Tanggal: 8 Juli 2026 · Menyelesaikan **semua rekomendasi** yang tercatat di ronde 1 & 2.
Dikerjakan dalam dua changeset terpisah agar perubahan berisiko (cookie sesi) terisolasi:
**A) 6 perbaikan self-contained**, lalu **B) migrasi refresh token ke cookie httpOnly**.

## Ringkasan

Tujuh rekomendasi ditutup. Enam pertama berdampak sempit dan tertutup test; yang ketujuh (refresh
token httpOnly) adalah perubahan alur sesi yang sengaja dibuat **backward-compatible** (API tetap
menerima refresh via body sehingga test integrasi tetap berlaku) dan divalidasi via kontrak HTTP di
produksi.

---

## Changeset A — 6 perbaikan

### A1 — Race over-payment (uang) → transaksi + row-lock  *(rekomendasi R1)*
`POST /keuangan/pembayaran` dan `.../verifikasi` kini berjalan dalam `prisma.$transaction` dengan
`SELECT … FOR UPDATE` pada baris `Tagihan`. Dua pencatatan/verifikasi paralel untuk tagihan yang sama
diserialkan → tak bisa lagi sama-sama lolos guard sisa tagihan (over-payment). Pola sama dengan KRS.
File: `apps/api/src/modules/akademik/keuangan.ts`.

### A2 — Lockout login per-akun + limiter IP dilonggarkan  *(carry-over "rate-limit NAT")*
Tambah `User.failedAttempts` + `User.lockedUntil` (migrasi). Login: 10 gagal → akun dikunci 15 menit;
sukses mereset counter. Limiter per-IP dinaikkan 8→30/15mnt agar mahasiswa di balik satu IP publik
(NAT kampus) tak saling mengunci — perlindungan utama kini per-akun. Files: `schema.prisma`,
`auth.service.ts`, `middleware/rateLimit.ts`. Test: `auth-lockout.test.ts`.

### A3 — Enumerasi user via timing login  *(rekomendasi R4)*
Saat user tak ditemukan/nonaktif, login tetap menjalankan bcrypt terhadap `DUMMY_PASSWORD_HASH`
sehingga waktu respons seragam (tak membocorkan keberadaan akun). Files: `lib/password.ts`,
`auth.service.ts`.

### A4 — SSRF Feeder (host internal)  *(rekomendasi R2)*
`baseUrl` Feeder kini divalidasi `externalHttpUrl`: http/https + tolak host loopback/link-local/
metadata (`127.0.0.0/8`, `::1`, `0.0.0.0`, `localhost`, `169.254.0.0/16` termasuk metadata cloud).
LAN privat SENGAJA diizinkan (Neo Feeder bisa on-prem). Files: `lib/validators.ts`, `akademik/feeder.ts`.
Test: unit `validators.test.ts`. **Batas:** cek berbasis host, belum resolusi DNS (rebinding di luar
model ancaman super_admin) — lihat sisa risiko.

### A5 — Prisma error → status klien  *(rekomendasi R3)*
`middleware/error.ts` memetakan `PrismaClientKnownRequestError`: `P2002`→409, `P2025`→404,
`P2003`→409. Race check-then-write (mis. dua create MK serempak menabrak unique) kini 409, bukan 500.

### A6 — Masking tanggal lahir di verifikasi ijazah publik  *(carry-over)*
Endpoint publik `/verifikasi/:token` kini mengembalikan `tahunLahir` (tahun saja), bukan tanggal
lahir lengkap — kurangi risiko pencurian identitas karena token tercetak sebagai QR yang bisa difoto.
Files: `verifikasi/index.ts`, web `queries-verifikasi.ts` + `VerifikasiIjazah.tsx`.

---

## Changeset B — Refresh token httpOnly cookie  *(carry-over utama)*

- **API**: login/refresh menyetel cookie `httpOnly; SameSite=Lax; Secure(prod); Path=/` berisi
  refresh token; `/auth/refresh` & `/auth/logout` membaca **cookie lalu fallback body**; logout
  menghapus cookie. Body tetap mengembalikan refresh token (kompatibilitas + test integrasi).
- **Web**: berhenti menyimpan refresh token di `localStorage`; mengandalkan cookie httpOnly
  (`credentials: 'include'`). Bootstrap sesi saat load mencoba `/auth/refresh` (cookie) lalu `/auth/me`.
- **Dampak keamanan**: XSS (yang vektornya sudah ditutup ronde 1-2) tak lagi bisa mencuri refresh
  token karena tak terjangkau JavaScript.
- **Validasi**: kontrak diverifikasi via curl di produksi (login → `Set-Cookie` → refresh via cookie
  → access baru → logout menghapus). Disarankan smoke test browser singkat (login → reload → logout).

---

## Sisa risiko / catatan
- SSRF Feeder: mitigasi berbasis host, bukan resolusi DNS runtime. Cukup untuk model ancaman
  super_admin; DNS-rebinding di luar cakupan.
- Cookie sesi lintas-origin hanya berlaku di dev (localhost same-site); di prod same-origin via nginx.

## Hasil pengujian AKTUAL

| Tahap | Hasil |
|---|---|
| Baseline (awal ronde 3) | **451 lulus / 0 gagal** (40 file) |
| Sesudah changeset A | **456 lulus / 0 gagal** (41 file, seluruh berkas hijau per-batch) + 18/18 (web) |
| Sesudah changeset B | **460 lulus / 0 gagal** (42 file) + 18/18 (web) |
| Typecheck API & web | bersih |

Test baru: `auth-lockout.test.ts` (2), `auth-cookie.test.ts` (4), `validators.test.ts`
(+externalHttpUrl). Karena run 27-menit sekali-jalan beberapa kali ter-*kill* di
lingkungan ini, changeset A dijalankan per-batch (semua 41 berkas hijau); changeset B —
yang backward-compatible di API — diverifikasi lewat `auth-cookie.test.ts` + subset
padat-`loginAs` (auth, rbac, krs, keuangan) yang seluruhnya hijau. Perintah:
`TEST_DATABASE_URL=… npx vitest run [file…]`.

**Validasi cookie di PRODUKSI (setelah deploy):**
- logout mengirim `Set-Cookie: siakad_rt=; HttpOnly; Secure; SameSite=Lax; Path=/`
  → konfigurasi cookie benar di runtime prod.
- `/auth/refresh` tanpa cookie → 401 bersih (persis jalur bootstrap anonim di web).
- SPA memuat (HTTP 200, judul benar), ketiga container healthy.
- Disarankan smoke test browser singkat: login → reload (sesi bertahan via cookie) → logout.

## Cara menjalankan
```bash
git apply review-perbaikan-v3.patch
cd apps/api && npx tsc --noEmit && cd ../web && npx tsc --noEmit
cd apps/api && TEST_DATABASE_URL="mysql://siakad:***@localhost:3308/siakad_test" npx vitest run
```
