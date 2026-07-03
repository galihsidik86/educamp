# Manual Import Data — SIAKAD Tazkia

Panduan praktis untuk staf Akademik saat memasukkan data dalam jumlah besar via file Excel. Semua fitur import di aplikasi ini menggunakan format `.xlsx` (atau `.xls`) dengan baris header di baris pertama.

## Ringkasan fitur import yang tersedia

| # | Menu | Path | Digunakan untuk |
|---|---|---|---|
| 1 | Mahasiswa | `/akademik/mahasiswa` | Data mahasiswa baru dalam jumlah besar |
| 2 | Dosen | `/akademik/dosen` | Data dosen (tetap & LB) |
| 3 | Mata Kuliah | `/akademik/mata-kuliah` | Kurikulum MK per prodi |
| 4 | Kelas (Penawaran) | `/akademik/kelas` | Kelas yang ditawarkan tiap semester |
| 5 | Nilai (per Kelas) | `/dosen/kelas/:id/nilai` | Nilai akhir mahasiswa (untuk dosen) |

Data lain yang **belum** memiliki import massal (harus input satu per satu via form):
Fakultas, Prodi, Ruangan, Tahun Ajaran/Semester, Pengumuman, Kalender, KRS, Tagihan (bulk lewat filter, bukan file), CPL/CPMK, SPMI, Beasiswa, Sertifikasi, Prestasi.

## Aturan umum

- **Format file**: `.xlsx` (Excel 2007+) atau `.xls`. CSV tidak didukung.
- **Baris pertama = header**. Nama kolom **case-sensitive** — salin persis dari template.
- **Max 500 baris** per upload. Untuk data lebih besar, pecah jadi beberapa file.
- **Best-effort**: baris gagal tidak menghentikan batch. Setelah upload, sistem menampilkan ringkasan berhasil vs gagal per baris.
- **Duplikat**: sistem cek unik (email, NIM, NIDN, kode MK, dll). Baris duplikat akan **gagal, bukan di-update** (kecuali fitur Nilai — lihat catatannya).
- **Template Excel**: di setiap modal import ada tombol **"Unduh template"** — pakai itu supaya header pasti benar.

## Urutan import yang benar (dependency chain)

Ikuti urutan ini jika Anda baru mulai isi data dari nol. Melompat urutan akan menyebabkan error "prodi tidak ditemukan", "MK tidak ditemukan", dll.

```
1. Fakultas         (manual, via form)
2. Prodi            (manual, via form)  ← butuh Fakultas
3. Ruangan          (manual, via form)
4. Tahun Ajaran     (manual, via form)  ← centang "Aktif" pada semester!
5. Dosen            (import Excel)      ← butuh Prodi
6. Mata Kuliah      (import Excel)      ← butuh Prodi
7. Mahasiswa        (import Excel)      ← butuh Prodi, DPA opsional (butuh Dosen)
8. Kelas            (import Excel)      ← butuh MK, Semester, Dosen, Ruangan
9. Nilai            (import Excel)      ← butuh Kelas & KRS mahasiswa
```

---

## 1. Import Mahasiswa

**Menu**: Mahasiswa → tombol **Impor Excel**.

### Kolom

| Kolom | Wajib | Tipe | Format | Contoh |
|---|---|---|---|---|
| `nim` | ✅ | teks | 7–12 digit | `2021110001` |
| `nama` | ✅ | teks | 3–120 karakter | `Aisyah Maulida` |
| `email` | ✅ | teks | email valid & unik | `aisyah@student.tazkia.ac.id` |
| `jenisKelamin` | ✅ | enum | `L` atau `P` | `L` |
| `angkatan` | ✅ | angka | tahun 1990–2100 | `2024` |
| `prodiKode` | ✅ | teks | kode prodi terdaftar | `55201` |
| `dpaNidn` | ⬜ | teks | NIDN dosen DPA | `0412019001` |
| `tempatLahir` | ⬜ | teks | max 60 | `Bogor` |
| `tanggalLahir` | ⬜ | tanggal | `YYYY-MM-DD` | `2005-08-17` |
| `alamat` | ⬜ | teks | max 500 | `Jl. Merdeka No. 1` |
| `telepon` | ⬜ | teks | max 30 | `082123456789` |

### Perilaku

- Password default = NIM. Mahasiswa wajib ganti password saat login pertama.
- Jika NIM atau email sudah ada di database → baris gagal dengan pesan "sudah dipakai". Tidak menimpa data lama.
- Jika `dpaNidn` diisi tapi NIDN tidak ditemukan → baris tetap dibuat, tapi tanpa DPA (bisa di-set manual belakangan).

### Error umum

| Pesan | Penyebab | Solusi |
|---|---|---|
| "Prodi tidak ditemukan" | `prodiKode` belum ada | Buat Prodi dulu di menu Program Studi |
| "NIM sudah dipakai" | NIM dobel di DB atau di file | Cek duplikat di file, atau NIM sudah pernah di-import |
| "Email sudah dipakai" | Email sudah ada di sistem | Ganti alamat email atau update via form |
| "Format tanggalLahir salah" | Bukan `YYYY-MM-DD` | Set format sel di Excel ke text, lalu isi manual |

---

## 2. Import Dosen

**Menu**: Dosen → tombol **Impor Excel**.

### Kolom

| Kolom | Wajib | Tipe | Format | Contoh |
|---|---|---|---|---|
| `nidn` | ✅ | teks | 5–20 karakter, unik | `0412019001` |
| `nama` | ✅ | teks | 3–120 karakter | `Andi Setiawan` |
| `email` | ✅ | teks | email valid & unik | `andi@tazkia.ac.id` |
| `prodiKode` | ✅ | teks | kode prodi terdaftar | `55201` |
| `gelarDepan` | ⬜ | teks | max 30 | `Dr.` |
| `gelarBelakang` | ⬜ | teks | max 30 | `M.Kom.` |
| `jabatanFungsional` | ⬜ | enum | lihat daftar bawah | `lektor` |
| `jabatanStruktural` | ⬜ | teks | max 80 | `Ketua Program Studi` |
| `isDpa` | ⬜ | teks | `true`/`1`/`ya`/`y` | `true` |

**Nilai `jabatanFungsional` yang valid**: `asisten_ahli`, `lektor`, `lektor_kepala`, `guru_besar`, `tenaga_pengajar`.

### Perilaku

- Password default = NIDN. Dosen wajib ganti saat login pertama.
- `isDpa=true` menandai dosen berhak jadi Pembimbing Akademik (DPA) untuk mahasiswa.
- Duplikat NIDN atau email → gagal.

### Contoh 1 baris data

| nidn | nama | email | prodiKode | gelarDepan | gelarBelakang | jabatanFungsional | isDpa |
|---|---|---|---|---|---|---|---|
| 0412019001 | Andi Setiawan | andi@tazkia.ac.id | 55201 | Dr. | M.Kom. | lektor | true |

---

## 3. Import Mata Kuliah

**Menu**: Mata Kuliah → tombol **Impor Excel**.

### Kolom

| Kolom | Wajib | Tipe | Format | Contoh |
|---|---|---|---|---|
| `kode` | ✅ | teks | 2–20 karakter, unik | `IF-3101` |
| `nama` | ✅ | teks | 2–120 karakter | `Struktur Data` |
| `sks` | ✅ | angka | 1–10 | `3` |
| `prodiKode` | ✅ | teks | kode prodi terdaftar | `55201` |
| `namaInggris` | ⬜ | teks | max 120 | `Data Structures` |
| `sksTeori` | ⬜ | angka | 0–10, default 0 | `2` |
| `sksPraktik` | ⬜ | angka | 0–10, default 0 | `1` |
| `jenis` | ⬜ | enum | lihat bawah | `wajib_prodi` |

**Nilai `jenis` yang valid**: `wajib_universitas`, `wajib_prodi` (default), `pilihan`.

### Aturan penting

- **`sksTeori + sksPraktik` harus ≤ `sks`**. Kalau lebih, baris ditolak.
- Kode MK harus unik di seluruh sistem (bukan hanya per prodi).

---

## 4. Import Kelas (Penawaran)

**Menu**: Kelas → tombol **Impor Excel**.

### Kolom

| Kolom | Wajib | Tipe | Format | Contoh |
|---|---|---|---|---|
| `mkKode` | ✅ | teks | kode MK terdaftar | `IF-3101` |
| `semesterKode` | ✅ | teks | kode semester | `20241` |
| `dosenNidn` | ✅ | teks | NIDN dosen terdaftar | `0412019001` |
| `kodeKelas` | ✅ | teks | 1–8 karakter | `A` |
| `kapasitas` | ⬜ | angka | 1–500, default 40 | `40` |
| `hari` | ⬜ | enum | senin…minggu | `senin` |
| `jamMulai` | ⬜ | teks | `HH:MM` | `08:00` |
| `jamSelesai` | ⬜ | teks | `HH:MM` | `10:30` |
| `ruanganKode` | ⬜ | teks | kode ruangan | `R-201` |

### Perilaku

- Kombinasi `mkKode + semesterKode + kodeKelas` harus unik (satu MK boleh punya beberapa kelas A/B/C).
- Kalau `hari` diisi, sistem **otomatis generate 16 pertemuan** (rentang tanggal dihitung dari periode kuliah semester tersebut).
- Kalau `jamMulai` diisi, `jamSelesai` juga wajib, dan harus lebih besar.

### Format kode semester

Format: `[tahun][jenis]` dimana jenis = `1` (ganjil) atau `2` (genap). Contoh:
- `20241` = Ganjil 2024/2025
- `20242` = Genap 2024/2025

Pastikan Tahun Ajaran & Semester sudah dibuat di menu Periode KRS sebelum import kelas.

---

## 5. Import Nilai (per Kelas)

**Menu (dari sisi Dosen)**: Kelas → pilih kelas → tab Input Nilai → tombol **Impor Excel**.

Fitur ini khusus dosen pemilik kelas. Akademik tidak punya menu ini secara langsung (bisa via portal dosen jika perlu manual).

### Kolom

| Kolom | Wajib | Tipe | Format | Contoh |
|---|---|---|---|---|
| `nim` | ✅ | teks | NIM peserta kelas | `2021110001` |
| `tugas` | ⬜ | angka | 0–100 | `80` |
| `uts` | ⬜ | angka | 0–100 | `75` |
| `uas` | ⬜ | angka | 0–100 | `78` |
| `praktikum` | ⬜ | angka | 0–100 | `85` |
| `kehadiran` | ⬜ | angka | 0–100 | `95` |
| `nilaiAngka` | ⬜ | angka | 0–100 | `82` |
| `status` | ⬜ | enum | `belum` / `draft` / `finalized` | `draft` |

### Perilaku (berbeda dari import lain!)

- **Upsert**: jika baris untuk NIM tersebut sudah ada, nilainya di-**update** (bukan gagal).
- Jika `nilaiAngka` diisi, sistem otomatis hitung `nilaiHuruf` (A/AB/B/…) & `bobot` mengikuti skala 4 Kemendikbud.
- `status=finalized` **wajib** disertai `nilaiAngka`. Kalau kosong → gagal.
- NIM harus terdaftar sebagai peserta kelas (KRS status `disetujui`).

### Konversi nilai angka ke huruf (referensi)

| Nilai angka | Huruf | Bobot |
|---|---|---|
| ≥ 85 | A | 4.00 |
| 75–84 | AB | 3.50 |
| 70–74 | B | 3.00 |
| 65–69 | BC | 2.50 |
| 56–64 | C | 2.00 |
| 40–55 | D | 1.00 |
| < 40 | E | 0.00 |

---

## Tips agar import lancar

1. **Selalu unduh template dulu**. Modal import menyediakan tombol "Unduh template" yang men-generate Excel dengan header yang benar + 1–2 baris contoh.
2. **Kosongkan sel opsional**, jangan diisi `-` atau `null`. Sel kosong = tidak diset.
3. **Hindari spasi ekstra** di kolom kode (mis. `55201 ` vs `55201`). Sistem trim otomatis, tapi editor Excel kadang menyimpan whitespace tak terlihat.
4. **Angka disimpan sebagai teks di Excel**: kolom seperti `angkatan` atau `sks` bisa dibaca. Tapi kolom seperti `nim` **sebaiknya set format sel ke Text** supaya nol di depan tidak hilang.
5. **Format tanggal**: gunakan `YYYY-MM-DD`. Jangan pakai format lokal Indonesia (`dd/mm/yyyy`) atau serial number Excel.
6. **Cek ringkasan setelah upload**. Modal akan menampilkan jumlah `berhasil` vs `gagal` + tabel baris yang gagal dengan alasan spesifik. Perbaiki file lalu re-upload baris yang gagal saja.
7. **Backup dulu** sebelum import besar (>100 baris). Kalau ada kesalahan sistemik yang baru terdeteksi setelah import, rollback via database lebih cepat daripada delete manual.

## Troubleshooting cepat

| Masalah | Cek dulu |
|---|---|
| Semua baris gagal | Nama header di baris 1 sesuai template? Case-sensitive |
| "Prodi tidak ditemukan" | Sudah buat Prodi di menu Program Studi? Kodenya persis? |
| "MK tidak ditemukan" (saat import Kelas) | Sudah import MK dulu? |
| "Semester tidak ditemukan" | Sudah buat Tahun Ajaran + Semester di menu Periode KRS? |
| "Kapasitas kelas penuh" (saat import KRS oleh mahasiswa) | Kapasitas kelas terlalu kecil, edit dulu |
| Modal ter-freeze setelah klik Impor | Refresh halaman, cek Network tab browser untuk lihat error |

## Kontak

Kalau ada error yang tidak bisa Anda selesaikan sendiri, sertakan **screenshot ringkasan hasil import** + **file .xlsx** yang digunakan saat lapor ke tim IT.
