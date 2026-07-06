# Evaluasi Keamanan & Integritas — STMIK Tazkia SIAKAD

Tanggal audit: 6 Juli 2026 · Cakupan: `apps/api` (Express + Prisma + MySQL) & `apps/web` (Vite + React).
Semua temuan di bawah **sudah diperbaiki langsung** di working tree; patch lengkap di `review-perbaikan.patch`.

## Ringkasan

Arsitektur aplikasi solid dan konsisten. Audit ini menemukan **satu cacat integritas keuangan**
(status tagihan salah hitung), **satu kelas kerentanan stored-XSS yang tersebar** di banyak field URL
yang disubmit pengguna, dan **beberapa masalah robustness** (input klien memicu 500). Tidak ditemukan
lubang otorisasi/tenancy baru — RBAC & ownership check sudah rapi.

### Hal yang SUDAH benar (disebut eksplisit, jujur)

- **Auth & sesi kuat.** JWT diverifikasi tanda tangan + expiry; rotasi refresh token **plus
  reuse-detection** (token yang sudah dirotasi dipakai lagi → seluruh sesi user dicabut,
  `auth.service.ts`). `env.ts` memvalidasi env di startup, JWT secret wajib ≥ 32 char, tidak ada
  fallback secret hardcoded. Ganti password mencabut semua refresh token.
- **Otorisasi berlapis & konsisten.** `requireAuth + requireRole` di akar tiap router peran,
  `subRoleGate` path-scoped untuk sub-peran akademik, `super_admin` bypass. IDOR ditangani lewat
  pola ownership (`getMahasiswaForUser` lalu cek `mahasiswaId === m.id` di keuangan, heregistrasi,
  tugas, dst) — bukan sekadar fetch-by-id.
- **Money guard di sisi mahasiswa sudah benar.** Tampilan tagihan mahasiswa hanya menghitung
  pembayaran `disetujui`, dan upload bukti mencegah over-payment (disetujui + menunggu).
- **Error contract seragam** (`middleware/error.ts`), Zod → 400 otomatis, CORS allow-list, `helmet`,
  body limit 1 MB, rate-limit login/refresh/write.
- **Kapasitas KRS anti-race** sudah pakai row-lock `SELECT … FOR UPDATE` (dari perbaikan sebelumnya).
- **Cakupan test luas** (36 file, 421 test) dan hijau sebagai baseline.

---

## Temuan & Perbaikan

### KRITIS / INTEGRITAS

#### K1. Status tagihan dihitung dari SEMUA pembayaran (termasuk yang menunggu/ditolak)

- **Masalah.** Di sisi akademik (`apps/api/src/modules/akademik/keuangan.ts`), tiga tempat
  menjumlahkan **semua** baris `Pembayaran` tanpa memandang status untuk menentukan lunas/sisa:
  daftar tagihan (`dibayar`), pencatatan pembayaran manual (`sudah`), dan recompute saat hapus
  pembayaran. Padahal semantik yang benar (dan sudah dipakai di sisi mahasiswa) adalah **hanya
  pembayaran `disetujui`** yang dihitung sebagai uang masuk. `Pembayaran.status` default `disetujui`,
  tetapi bukti upload mahasiswa berstatus `menunggu` dan bisa `ditolak`.
- **Dampak nyata.** Tagihan bisa keliru berstatus **`lunas`/`cicil`** hanya karena mahasiswa
  meng-upload bukti yang **belum diverifikasi** (atau bahkan yang sudah **ditolak**), dan dashboard
  keuangan melaporkan uang masuk yang belum benar-benar ada. Contoh: hapus satu pembayaran disetujui
  akan menghitung ulang status dengan ikut menjumlahkan bukti `menunggu` → tagihan tetap tampak cicil.
- **Perbaikan.** Ekstrak logika murni ke `apps/api/src/lib/keuangan.ts` (`totalDisetujui`,
  `totalTerpakai`, `hitungStatusTagihan`) dan pakai konsisten di semua jalur. Status hanya dari
  `disetujui`; guard over-payment memakai `disetujui + menunggu` (mengecualikan `ditolak`).
  Ditutup unit test (`tests/unit/keuangan.test.ts`) + integration test (`tests/integration/keuangan.test.ts`).

#### K2. Penghapusan record pembayaran tidak tercatat di audit log

- **Masalah.** `DELETE /akademik/keuangan/pembayaran/:id` menghapus record keuangan tanpa
  `writeAudit` (jalur lain seperti create/verifikasi sudah mengaudit).
- **Dampak.** Penghapusan pembayaran — aksi keuangan sensitif — tidak meninggalkan jejak.
- **Perbaikan.** Tambah `writeAudit('pembayaran.delete', …)` berisi tagihanId, mahasiswaId, jumlah,
  dan status pembayaran yang dihapus.

### KEAMANAN

#### S1. Stored-XSS tersebar via field URL yang disubmit pengguna

- **Masalah.** Banyak field URL divalidasi sebagai `z.string()`/`z.string().url()` yang **menerima
  skema `javascript:` dan `data:`**, lalu dirender sebagai `<a href={…}>`. Beberapa di antaranya
  disubmit oleh peran rendah dan **dilihat oleh staf akademik** (privilege-escalation): `dokumenUrl`
  heregistrasi, `fileUrl` prestasi/sertifikasi/skpi/mutasi (mahasiswa → akademik), `fileUrl` BKD
  (dosen → akademik), `url` bahan ajar (dosen → mahasiswa). Ini kelas kerentanan yang sama dengan
  `buktiUrl` yang sudah pernah diperbaiki, tetapi tersebar ke banyak modul lain.
- **Dampak.** Mahasiswa/dosen menyisipkan `javascript:…` sebagai URL; saat staf mengeklik link,
  skrip berjalan dalam sesi staf (pencurian sesi, aksi atas nama admin). `rel="noreferrer"` tidak
  melindungi dari skema `javascript:`.
- **Perbaikan (dua lapis).**
  - **Server (otoritatif):** helper baru `optionalHttpUrl` (empty-safe) & `httpUrl` diterapkan ke
    field URL user di prestasi, sertifikasi, skpi, mutasi, heregistrasi, skripsi, beasiswa, mbkm,
    tugas (mahasiswa & dosen), bkd, bahan-ajar, aktivitas-mhs, dokumen. Hanya http/https diterima;
    string kosong tetap sah (happy-path aman).
  - **Web (defense-in-depth):** `safeHref()` membungkus semua `<a href>` terkait di halaman
    akademik (Prestasi, Sertifikasi, Skpi, Mutasi, BkdDetail, Dokumen, Heregistrasi) serta
    MateriKelas dosen/mahasiswa dan Mutasi/Skpi mahasiswa — link berbahaya di-nonaktifkan meski
    data lama sudah tercemar.
- **Test.** `optionalHttpUrl`/`httpUrl` diuji unit (`tests/unit/validators.test.ts`), dan
  penolakan `javascript:` diuji end-to-end di `tests/integration/keuangan.test.ts`.

#### S2. `feeder.baseUrl` menerima skema apa pun

- **Masalah.** Konfigurasi Feeder PDDikti (`akademik/feeder.ts`) memakai `z.string().url()` untuk
  `baseUrl` yang dipakai sebagai target `fetch` keluar.
- **Perbaikan.** Ganti ke `httpUrl` (batasi http/https). Catatan: ini **tidak** memblok SSRF ke IP
  internal — lihat rekomendasi R3.

### ROBUSTNESS

#### R1. Input pagination non-numerik memicu 500

- **Masalah.** Beberapa endpoint memakai `Math.min(Number(req.query.take ?? 100), max)`. `Number('abc')`
  = `NaN`, dan `Math.min(NaN, …)` tetap `NaN`, lalu diteruskan ke Prisma `take`/`skip`/filter Int →
  Prisma melempar → **500 INTERNAL_ERROR** untuk input klien (mengotori monitoring, bisa dipakai
  membuat noise). Terdampak: audit, users, dokumen, feeder (×2), ews, mahasiswa (filter `angkatan`).
- **Perbaikan.** Helper `intParam`/`intParamOptional` (`lib/validators.ts`) — parse aman dengan
  fallback + clamp; `angkatan` non-angka jadi `undefined` (filter diabaikan) alih-alih `NaN`.
  Ditutup unit test.

---

## Rekomendasi lanjutan (belum diubah — perlu keputusan/berisiko)

- **R2. Race over-payment pada pencatatan pembayaran.** Pencatatan/verifikasi pembayaran memakai
  pola check-then-write tanpa transaksi/row-lock. Dua request paralel bisa lolos guard bersamaan →
  over-payment. Konkurensi rendah (dipicu staf), jadi belum diubah; sebaiknya bungkus dalam
  transaksi + row-lock pada `Tagihan` (pola sama seperti KRS).
- **R3. SSRF pada Feeder.** `baseUrl` (super_admin) dipakai untuk `fetch` keluar; `httpUrl` tak
  memblok `http://169.254.169.254`/IP internal. Tambahkan allowlist host / blokir rentang privat
  bila server punya akses jaringan internal sensitif.
- **R4. Presisi uang.** Nominal `Decimal(15,2)` dijumlahkan sebagai `Number` JS. Aman untuk rupiah
  bulat < 2^53, tetapi idealnya pakai aritmetika Decimal untuk mencegah galat pembulatan pada skala
  besar/sen.
- **R5. Enumerasi user via timing.** Login mengembalikan cepat (tanpa bcrypt) saat NIM/email tak
  ada, sehingga waktu respons membocorkan keberadaan akun. Pertimbangkan dummy-hash agar waktu seragam.
- **R6 (warisan review sebelumnya).** Refresh token di `localStorage` (sebaiknya cookie `httpOnly`);
  rate-limit login per-IP di balik NAT kampus (tambah lockout per-akun); endpoint verifikasi ijazah
  publik mengekspos tanggal lahir lengkap.
- **R7. Test flaky.** `tests/integration/absensi.test.ts` ("reschedule → notif") menunggu notifikasi
  fire-and-forget hanya 200 ms → gagal di bawah beban suite penuh, **lulus saat dijalankan sendiri**.
  Sebaiknya poll-with-retry, bukan `setTimeout` tetap.

---

## Hasil pengujian AKTUAL

Lingkungan: MySQL 8.4 via Docker (`siakad_test` di `localhost:3308`), skema di-`prisma db push`.

```bash
# DB test
docker exec siakad_mysql mysql -u root -p*** -e "CREATE DATABASE IF NOT EXISTS siakad_test …"
cd apps/api && TEST_DATABASE_URL="mysql://siakad:***@localhost:3308/siakad_test" \
  npx prisma db push --skip-generate --accept-data-loss
# Suite penuh
TEST_DATABASE_URL="mysql://siakad:***@localhost:3308/siakad_test" npx vitest run
# Web
cd apps/web && npx vitest run
```

| Tahap | Hasil |
|---|---|
| **Baseline (sebelum perubahan)** | **420 lulus / 1 gagal** dari 421 (36 file). 1 gagal = flake `absensi` (R7) — lulus saat diisolasi. |
| **Sesudah perbaikan** | **447 lulus / 0 gagal** dari 447 (39 file, API) + **18/18** (web). Test baru: keuangan integrasi (4), keuangan unit (10), validators unit (12). Flake `absensi` lulus di run bersih ini. |
| Typecheck | `apps/api` & `apps/web` `tsc --noEmit` bersih. |

Test baru yang mengunci perbaikan: `tests/unit/keuangan.test.ts`, `tests/unit/validators.test.ts`,
`tests/integration/keuangan.test.ts` (termasuk regresi "bukti menunggu tak boleh bikin lunas" dan
"hapus pembayaran disetujui → status ulang hanya dari disetujui" + penolakan `javascript:` URL).

---

## File yang diubah

**Baru:** `apps/api/src/lib/keuangan.ts`, `apps/api/tests/unit/keuangan.test.ts`,
`apps/api/tests/unit/validators.test.ts`, `apps/api/tests/integration/keuangan.test.ts`.

**API (server):** `lib/validators.ts` (+`optionalHttpUrl`, `intParam`, `intParamOptional`),
`modules/akademik/keuangan.ts`, `modules/akademik/feeder.ts`, `modules/akademik/audit.ts`,
`modules/akademik/users.ts`, `modules/akademik/dokumen.ts`, `modules/akademik/ews.ts`,
`modules/akademik/mahasiswa.ts`, `modules/akademik/aktivitas-mhs.ts`,
`modules/mahasiswa/heregistrasi.ts`, `modules/mahasiswa/prestasi.ts`,
`modules/mahasiswa/sertifikasi.ts`, `modules/mahasiswa/skpi.ts`, `modules/mahasiswa/mutasi.ts`,
`modules/mahasiswa/skripsi.ts`, `modules/mahasiswa/beasiswa.ts`, `modules/mahasiswa/mbkm.ts`,
`modules/mahasiswa/tugas.ts`, `modules/dosen/bkd.ts`, `modules/dosen/bahan-ajar.ts`,
`modules/dosen/tugas.ts`.

**Web:** `routes/akademik/{Prestasi,Sertifikasi,Skpi,Mutasi,BkdDetail,Dokumen,Heregistrasi}.tsx`,
`routes/dosen/MateriKelas.tsx`, `routes/mahasiswa/{MateriKelas,Mutasi,Skpi}.tsx`.

## Cara menerapkan & menjalankan

```bash
git apply review-perbaikan.patch      # atau sudah ada di working tree
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
# Test API (butuh MySQL + TEST_DATABASE_URL menunjuk DB test terpisah)
cd apps/api && TEST_DATABASE_URL="mysql://siakad:***@localhost:3308/siakad_test" npx vitest run
cd apps/web && npx vitest run
```
