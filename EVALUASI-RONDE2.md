# Evaluasi Ronde 2 — STMIK Tazkia SIAKAD

Tanggal: 8 Juli 2026 · Fokus: kode yang **berubah** di ronde 1 (audit keamanan/integritas,
commit `dc696b2`) dan fitur **kode MK unik per-prodi** (`2a4dbb2`). Prioritas telaah: auth,
uang/pembayaran, tenancy & IDOR, validasi input (NaN/URL/SSRF/traversal), race condition.

Semua temuan **terbukti bug** sudah diperbaiki (diff minimal). Patch: `review-perbaikan-v2.patch`.

## Ringkasan

Perubahan ronde 1 secara umum benar dan tidak menimbulkan regresi otorisasi/tenancy — cek
kepemilikan (IDOR) di semua modul yang disentuh sudah lengkap. Ronde 2 menemukan **2 bug
terbukti** (satu regresi yang saya perkenalkan sendiri di ronde 1, satu sibling validasi yang
terlewat) dan **1 test flaky** buatan sendiri. Sisanya rekomendasi desain.

### Yang sudah benar (diverifikasi, jujur)

- **IDOR/ownership rapat.** Semua endpoint yang di-hardening ronde 1 (prestasi, sertifikasi, skpi,
  mutasi, skripsi, beasiswa, mbkm, tugas) mengecek `mahasiswaId !== m.id` sebelum update/hapus —
  bukan sekadar fetch-by-id.
- **Logika status keuangan konsisten.** `lib/keuangan.ts` (disetujui-only) dipakai seragam di semua
  jalur akademik; guard over-payment memakai disetujui+menunggu. Sisi mahasiswa juga konsisten.
- **Validator tahan input jahat.** `intParam`/`intParamOptional` menetralkan `NaN`/`Infinity`/tipe
  non-string; `httpUrl` menolak `javascript:`/`data:` via cek `protocol`. Diuji unit.
- **MK unik per-prodi** benar: dup-check prodi-scoped di create/import/patch, disambiguasi import
  kelas via `prodiKode`, dan constraint DB `@@unique([prodiId, kode])` menjaga integritas.
- **Tidak ada path-traversal/file-serving berbahaya** di kode yang berubah (tak ada handler yang
  membaca path dari input pengguna).

---

## Temuan terbukti (sudah diperbaiki)

### B1 — [Integritas/UX, regresi] `optionalHttpUrl` mengubah `''` jadi `undefined` → field URL tak bisa dikosongkan saat edit

- **Masalah.** Helper `optionalHttpUrl` (ronde 1) memetakan string kosong ke `undefined`. Pada
  handler update yang menyebar body (`prisma.x.update({ data: { ...body } })` — dipakai di
  prestasi, sertifikasi, skpi, dosen/tugas), Prisma memperlakukan `undefined` sebagai **"tidak
  berubah"**. Akibatnya, mahasiswa yang menghapus URL bukti (mengirim `''`) tidak berhasil
  mengosongkannya — **link lama tetap tersimpan & tetap tampil**. Sebelum ronde 1, field
  `z.string()...` menyimpan `''` sehingga link efektif hilang; jadi ini **regresi** yang saya
  perkenalkan.
- **Dampak.** Bukti/dokumen lama tak bisa dicabut lewat UI edit (data lengket). Bukan lubang
  keamanan, tetapi perilaku salah yang menyesatkan.
- **Perbaikan** (`apps/api/src/lib/validators.ts`). `''`/`null` dipetakan ke **`null`** (bukan
  `undefined`) dengan `httpUrl.nullish()`. Semantik akhir: key **tidak dikirim** (lewat `.partial()`)
  = tak berubah; `''` = dikosongkan (null); URL valid = di-set. Satu perubahan helper menutup semua
  modul sekaligus. Dikunci unit test (`validators.test.ts`, kasus `.partial()`).

### B2 — [Robustness] `jatuhTempo` tak divalidasi → Invalid Date → 500

- **Masalah.** `tagihanSchema` dan `bulkSchema` (`apps/api/src/modules/akademik/keuangan.ts`)
  memakai `jatuhTempo: z.string()` yang diteruskan ke `new Date(body.jatuhTempo)`. String rusak
  menjadi Invalid Date yang ditolak Prisma sebagai **500 INTERNAL_ERROR** (bukan 400). Ini sibling
  dari `tanggalBayar` yang sudah diperbaiki ronde 1 tetapi terlewat.
- **Dampak.** Akademik mengirim tanggal jatuh tempo malformed → 500 (mengotori monitoring; harusnya
  400 validasi).
- **Perbaikan.** `jatuhTempo: dateString` di kedua skema. Dikunci integration test (bad date → 400
  `VALIDATION_ERROR`).

### B3 — [Kualitas test] Assertion audit flaky pada test keuangan (buatan ronde 1)

- **Masalah.** Test "hapus pembayaran → audit tercatat" mengecek `auditLog` **langsung** setelah
  respons 204, padahal `writeAudit` fire-and-forget (`void`) → race commit → sesekali gagal.
- **Perbaikan.** Assertion di-poll (retry ≤ 1 detik) sebelum menyatakan gagal.

---

## Rekomendasi (belum diubah — perlu keputusan / risiko lebih besar)

- **R1 — Race over-payment (uang).** `POST /keuangan/pembayaran` & verifikasi memakai
  check-then-write tanpa transaksi/row-lock; dua request paralel bisa lolos guard bersamaan →
  over-payment. Konkurensi rendah (dipicu staf), jadi belum diubah. Perbaikan tepat: bungkus
  hitung-sisa + create dalam transaksi + `SELECT … FOR UPDATE` pada `Tagihan` (pola sama seperti
  KRS). Tidak diimplementasikan agar tak mengubah jalur uang secara spekulatif.
- **R2 — SSRF internal via Feeder.** `baseUrl` (super_admin) dipakai untuk `fetch` keluar; `httpUrl`
  membatasi skema tetapi **tidak** memblok `http://169.254.169.254`/IP privat. Tambahkan
  allowlist host / blokir rentang privat bila server punya jaringan internal sensitif.
- **R3 — Dup MK saat race → 500, bukan 409.** Create/import MK memakai `findFirst` lalu `create`;
  dua create serempak dengan `(prodiId, kode)` sama → yang kedua kena `@@unique` → `P2002` yang
  saat ini jatuh ke 500. Integritas aman (DB menolak duplikat), hanya kode errornya kurang tepat.
  Perbaikan opsional: map `P2002` → 409 di error middleware.
- **R4 — Enumerasi user via timing login** (carry-over). Login balik cepat tanpa bcrypt saat
  NIM/email tak ada. Pertimbangkan dummy-hash agar waktu seragam.
- **Carry-over ronde 1:** refresh token di `localStorage` (→ cookie httpOnly), rate-limit login
  per-IP di balik NAT kampus (+ lockout per-akun), verifikasi ijazah publik mengekspos tanggal
  lahir lengkap.

---

## Hasil pengujian AKTUAL

Lingkungan: MySQL 8.4 (Docker, `siakad_test` @ localhost:3308), skema `prisma db push`.
Perintah: `TEST_DATABASE_URL=… npx vitest run` (API) · `npx vitest run` (web).

| Tahap | Hasil |
|---|---|
| **Baseline (sebelum ronde 2)** | **448 lulus / 0 gagal** (40 file). |
| **Sesudah ronde 2** | **451 lulus / 0 gagal** (40 file, API) + **18/18** (web). Test baru/diubah: `validators` (+2, kasus `.partial()` & `dateString`), `keuangan` (+1, jatuhTempo 400). |
| Typecheck API & web | bersih. |

Catatan proses: run suite penuh sekali jalan (±27 mnt) beberapa kali ter-*kill* di lingkungan ini;
diverifikasi dengan membersihkan proses vitest yatim lebih dulu (2 proses sempat menulis `resetDb`
konkuren ke DB test → kegagalan login FK semu) lalu menjalankan ulang bersih.

## File yang diubah (ronde 2)

`apps/api/src/lib/validators.ts` (optionalHttpUrl → null),
`apps/api/src/modules/akademik/keuangan.ts` (jatuhTempo ×2 → dateString),
`apps/api/tests/unit/validators.test.ts` (kasus .partial() + dateString),
`apps/api/tests/integration/keuangan.test.ts` (test jatuhTempo 400 + poll audit).

## Cara menjalankan

```bash
git apply review-perbaikan-v2.patch
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/api && TEST_DATABASE_URL="mysql://siakad:***@localhost:3308/siakad_test" npx vitest run
```
