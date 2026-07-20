# Rilis Nilai ke Produksi

Panduan menerbitkan nilai satu kelas ke **stmik.sosmartpro.com** sehingga terlihat oleh mahasiswa.

Berbeda dari `DEPLOY-domainesia.md` yang membahas rilis **kode** — dokumen ini soal rilis **data**.

Contoh yang dipakai di sini: **MKUT.201 Fiqih Muamalah, Kelas A, semester 20252, dosen Abdul Mughni, 23 mahasiswa**. Langkahnya berlaku umum untuk kelas mana pun.

> ⚠️ **Ada dua deployment produksi, dan isinya sudah menyimpang.** Dokumen ini menargetkan **Domainesia** — `stmik.sosmartpro.com`, database `sosmartp_stmik`, akses lewat cPanel Terminal. Deployment lain di VPS `202.134.242.202` (database `siakad`, container `siakad_mysql_prod`) **bukan** target rilis nilai. Pembenahan kode MK duplikat yang tercatat "selesai di prod" dikerjakan di VPS itu — jangan asumsikan Domainesia sudah ikut bersih. Selalu jalankan Fase 0 di database yang benar.

---

## Prinsip

> **Jangan menyalin database dev ke produksi.**

Database dev (`siakad_tazkia`) dan produksi (`sosmartp_stmik`) punya isi yang berbeda dan hidup masing-masing. Menyalin dev ke produksi akan menimpa data riil mahasiswa lain. Yang dipindahkan hanya **nilai kelas ini**, lewat jalur aplikasi.

> **Nilai masuk lewat portal dosen, bukan lewat SQL.**

Alur `draft → finalized` adalah keputusan akademik dosen pengampu. Menulis langsung ke tabel `Nilai` melewatinya, dan tidak meninggalkan jejak di `AuditLog`.

---

## Fase 0 — Periksa kondisi produksi

Semua query di fase ini **read-only**. Jalankan di Terminal cPanel:

```bash
mysql -u sosmartp_admin -p sosmartp_stmik
```

### 0.1 Semester

```sql
SELECT id, kode, jenis, isAktif, nilaiMulai, nilaiSelesai
FROM Semester WHERE kode = '20252';
```

Kalau kosong → semester belum dibuat. Lihat Fase 1.1.

### 0.2 Mata kuliah

```sql
SELECT m.id, m.kode, m.nama, m.sks, m.jenis, p.kode AS prodi
FROM MataKuliah m JOIN Prodi p ON p.id = m.prodiId
WHERE m.nama LIKE '%Muamalah%';
```

Catat `id` dan prodinya. Kalau MK yang sama ada di beberapa prodi, pilih yang `jenis = 'wajib_universitas'` bila kelasnya lintas prodi — mahasiswa dari prodi lain hanya bisa ambil kelas MK berjenis itu (`mahasiswa/krs.ts:217`).

> **Baca `jenis` sebelum memutuskan berapa kelas yang dibuat.** MK `wajib_universitas` cukup **satu kelas** untuk semua prodi. MK `wajib_prodi` butuh **kelas terpisah per prodi**. Salah baca di sini berujung membuat kelas yang tidak perlu, atau mahasiswa lintas prodi ditolak saat KRS.

> ⚠️ **Hati-hati MK duplikat hasil migrasi 16 Juli 2026.** Beberapa mata kuliah punya **dua record berbeda dengan nama sama** (kode lama dari migrasi vs kode resmi Kurikulum 2026), kadang dengan `jenis` yang berlawanan. Fiqih Muamalah misalnya muncul sebagai `MKUT.201` **dan** `MKU.202` di kedua prodi. **Kode resmi = yang ada di PDF Kurikulum 2026**; `MKU.202` termasuk yang seharusnya di-merge ke `MKUT.201`.
>
> Bahayanya: data historis sering menempel di record yang kodenya salah. Kalau query di atas mengembalikan lebih dari satu baris per prodi, hitung dulu nilai yang menempel di masing-masing sebelum memilih:
>
> ```sql
> SELECT mk.kode, p.kode AS prodi, s.kode AS smt, k.kodeKelas,
>        COUNT(krs.id) AS n_krs, COUNT(n.id) AS n_nilai
> FROM Kelas k
> JOIN MataKuliah mk ON mk.id = k.mataKuliahId
> JOIN Prodi p ON p.id = mk.prodiId
> JOIN Semester s ON s.id = k.semesterId
> LEFT JOIN Krs krs ON krs.kelasId = k.id
> LEFT JOIN Nilai n ON n.krsId = krs.id
> WHERE mk.nama LIKE '%Muamalah%'
> GROUP BY k.id ORDER BY mk.kode, p.kode, s.kode;
> ```
>
> Menaruh nilai baru di record yang salah akan memecah riwayat mahasiswa antara dua MK bernama sama.

### 0.3 Dosen

```sql
SELECT d.id, d.nidn, d.nama, u.email
FROM Dosen d JOIN User u ON u.id = d.userId
WHERE d.nama LIKE '%Mughni%';
```

Pastikan akun `User`-nya ada — dosen perlu login untuk input nilai.

### 0.4 Mahasiswa

Ganti daftar NIM sesuai kelas Anda:

```sql
SELECT nim, nama FROM Mahasiswa WHERE nim IN ('251572010002', '251572010040', ...);
```

Bandingkan jumlahnya dengan daftar di rekap. NIM yang belum ada harus diimpor dulu (Akademik → Mahasiswa → Impor Excel).

### 0.5 Kelas

```sql
SELECT k.id, k.kodeKelas, k.kapasitas, d.nama AS dosen
FROM Kelas k
JOIN MataKuliah m ON m.id = k.mataKuliahId
JOIN Semester s ON s.id = k.semesterId
LEFT JOIN Dosen d ON d.id = k.dosenId
WHERE m.kode = 'MKUT.201' AND s.kode = '20252';
```

### 0.6 Peserta

```sql
SELECT m.nim, m.nama, k.status
FROM Krs k JOIN Mahasiswa m ON m.id = k.mahasiswaId
WHERE k.kelasId = '<KELAS_ID>';
```

### Ringkasan

Isi tabel ini sebelum lanjut:

| Prasyarat | Ada? | Tindakan bila belum |
|---|---|---|
| Semester 20252 | | Fase 1.1 |
| MK Fiqih Muamalah | | Fase 1.2 |
| Dosen + akun login | | Fase 1.3 |
| 23 mahasiswa | | Fase 1.4 |
| Kelas A | | Fase 1.5 |
| 23 peserta KRS | | Fase 1.6 |

---

## Fase 1 — Lengkapi yang kurang

Semua lewat portal akademik di `https://stmik.sosmartpro.com`.

> Menu Kelas / Mata Kuliah / Mahasiswa dijaga `subRoleGate` dan hanya bisa diakses akun ber-`subRole` **`akademik`**, **`prodi`**, atau **`super_admin`** (`middleware/auth.ts:40-57`). Pastikan akun Anda salah satunya sebelum mulai.

### 1.1 Semester

**Akademik → Periode** → buat Tahun Ajaran 2025/2026 bila belum ada → tambah semester genap, kode `20252`.

Isi **periode nilai** (mis. `2026-07-01` s/d `2026-08-15`). Ini hanya informatif — ditampilkan ke dosen (`dosen/kelas.ts:95`), tidak mengunci input.

Jangan aktifkan `isAktif` kalau semester berjalan sudah yang lain.

### 1.2 Mata kuliah

**Akademik → Mata Kuliah** → Impor Excel atau tambah manual. Kolom wajib: `kode`, `nama`, `sks`, `prodiKode`, `jenis`.

Set `jenis = wajib_universitas` bila kelasnya akan diisi mahasiswa lintas prodi.

### 1.3 Dosen

**Akademik → Dosen** → pastikan ada beserta NIDN. Sistem otomatis membuat akun `User` — catat emailnya dan sampaikan kredensial ke dosen lewat jalur yang aman.

### 1.4 Mahasiswa

**Akademik → Mahasiswa** → Impor Excel untuk NIM yang belum terdaftar. Set format sel kolom `nim` ke **Text** agar nol di depan tidak hilang.

### 1.5 Kelas

**Akademik → Kelas** → filter semester ke **20252** → Impor Excel atau Tambah Kelas.

| Kolom | Contoh |
|---|---|
| `mkKode` | `MKUT.201` |
| `semesterKode` | `20252` |
| `dosenNidn` | `2120047501` |
| `kodeKelas` | `A` |
| `kapasitas` | `40` |

Kalau kode MK yang sama dipakai beberapa prodi, tambahkan kolom `prodiKode`.

> **Kalau kelas sudah ada tapi dosennya berbeda**, ubah lewat form edit — dan periksa juga tab **Dosen** pada kelas itu. Tabel `KelasDosen` (team teaching) **menimpa** kolom `dosenId`: bila ada entri `lead` atas nama dosen lain, dosen baru tetap ditolak dengan "Kelas ini bukan milik Anda" (`lib/context.ts:51-61`). Keduanya harus konsisten.

### 1.6 Peserta KRS

**Tidak ada impor massal untuk KRS.** Dua pilihan:

- **Mahasiswa mengisi KRS sendiri** lewat portal masing-masing, lalu Akademik menyetujui. Ini alur normalnya.
- **Akademik menambahkan manual** — **Akademik → KRS** → pilih mahasiswa → tambah kelas. Diulang per mahasiswa (23×).

Status akhir harus **`disetujui`** — impor nilai menolak NIM yang bukan peserta berstatus disetujui.

---

## Fase 2 — Input nilai

Login sebagai **dosen pengampu** (akun akademik tidak bisa membuka route `/dosen/*`).

**Kelas → pilih kelas → tab Input Nilai → Impor Excel.**

File: `impor-nilai-MKUT201-20252.xlsx`

| Kolom | Wajib | Keterangan |
|---|---|---|
| `nim` | ✅ | harus peserta berstatus `disetujui` |
| `tugas` | ⬜ | 0–100 |
| `uts` | ⬜ | 0–100 |
| `uas` | ⬜ | 0–100 |
| `nilaiAngka` | ⬜ | 0–100, dasar penghitungan huruf |
| `status` | ⬜ | kosongkan → masuk sebagai `draft` |

Catatan:

- Sel kosong = tidak diset. Jangan isi `-` atau `—`.
- `nilaiAngka` otomatis dikonversi ke huruf + bobot: A ≥85, AB 75–84, B 70–74, BC 65–69, C 56–64, D 40–55, E <40.
- **Skala aplikasi tidak mengenal B+/C+.** Nilai 78.5 menjadi `AB`, bukan `B+`. Kalau rekap dosen memakai notasi lain, sampaikan perbedaan ini sebelum finalisasi.
- Impor bersifat **upsert** — NIM yang sudah bernilai akan diperbarui, bukan gagal. Aman diulang.

Setelah unggah, periksa ringkasan berhasil vs gagal. Perbaiki baris yang gagal, unggah ulang baris itu saja.

---

## Fase 3 — Finalisasi

**Keputusan dosen pengampu, bukan akademik dan bukan operator.**

Di tab Input Nilai → tombol **Finalisasi**. Efeknya:

- Status `draft` → `finalized`
- Nilai terlihat oleh mahasiswa di KHS/transkrip
- Ikut terhitung ke IP semester dan IPK
- Muncul di laporan akademik (layar akademik memfilter `status = 'finalized'`, jadi nilai draft memang tidak tampil di sana — `akademik/mahasiswa.ts:389`, `akademik/laporan.ts:48`)

Finalisasi menolak baris yang `nilaiAngka`-nya kosong.

**Sebelum menekan tombol ini**, pastikan dosen sudah memeriksa: jumlah peserta benar, tidak ada mahasiswa asing, tidak ada nilai kosong yang seharusnya terisi.

---

## Fase 4 — Verifikasi

Setelah finalisasi:

```sql
SELECT m.nim, m.nama, n.nilaiAngka, n.nilaiHuruf, n.bobot, n.status
FROM Krs k
JOIN Mahasiswa m ON m.id = k.mahasiswaId
JOIN Nilai n ON n.krsId = k.id
WHERE k.kelasId = '<KELAS_ID>'
ORDER BY m.nama;
```

Cek:

- [ ] Jumlah baris = jumlah peserta
- [ ] Semua `status = 'finalized'`
- [ ] Distribusi huruf sesuai rekap dosen
- [ ] Tidak ada NIM di luar rekap

Lalu konfirmasi dari sisi mahasiswa: login sebagai salah satu peserta, buka **KHS** — nilai harus muncul dengan IP semester ikut terhitung.

---

## Rollback

**Backup sebelum Fase 2:**

```bash
mysqldump -u sosmartp_admin -p sosmartp_stmik Krs Nilai > ~/backup-nilai-$(date +%F-%H%M).sql
```

Batalkan finalisasi satu kelas (kembali ke draft, nilai tetap tersimpan):

```sql
UPDATE Nilai n
JOIN Krs k ON k.id = n.krsId
SET n.status = 'draft', n.updatedAt = NOW(3)
WHERE k.kelasId = '<KELAS_ID>';
```

Hapus seluruh nilai satu kelas:

```sql
DELETE n FROM Nilai n
JOIN Krs k ON k.id = n.krsId
WHERE k.kelasId = '<KELAS_ID>';
```

> Menghapus baris `Krs` akan **cascade** menghapus `Nilai`, `NilaiCpmk`, dan `NilaiKomponenEvaluasi` yang menempel padanya. Jangan hapus KRS kalau yang ingin dibatalkan hanya nilainya.

---

## Yang mudah terlewat

| Gejala | Sebab |
|---|---|
| Kelas tidak muncul di menu Kelas | Filter semester default ke semester **aktif** (`routes/akademik/Kelas.tsx:21-23`). Ganti ke 20252. |
| Dosen: "Kelas ini bukan milik Anda" | Entri `KelasDosen` masih atas nama dosen lama — lihat Fase 1.5. |
| Impor nilai: NIM ditolak | Mahasiswa belum jadi peserta berstatus `disetujui`. |
| Nilai tidak terlihat di portal akademik | Masih `draft`. Layar akademik hanya menampilkan `finalized`. |
| Menu Kelas/Mahasiswa 403 | `subRole` akun bukan `akademik`/`prodi`/`super_admin`. |
| Mahasiswa lintas prodi ditolak saat KRS | MK bukan `wajib_universitas` (`mahasiswa/krs.ts:217`). |

---

## Catatan untuk kelas Fiqih Muamalah 20252

### Status per 2026-07-20

**Dev — selesai.** Tidak perlu diimpor ulang.

- Kelas A (`7e006c03-…`), MK `MKUT.201` prodi 55201, dosen Abdul Mughni (NIDN 2120047501), kapasitas 100
- 23 peserta berstatus `disetujui` — **11 mahasiswa TI + 12 mahasiswa SI dalam satu kelas**
- 23 nilai `draft` dengan komponen tugas/UTS/UAS — 22 A + 1 AB
- Periode nilai 20252: 1 Juli – 15 Agustus 2026

**Produksi (Domainesia) — belum dikerjakan.** Perlu seluruh langkah di atas.

### Keputusan: pakai `MKUT.201`

Fiqih Muamalah punya record ganda (`MKUT.201` dan `MKU.202`). Yang dipakai untuk 20252 adalah **`MKUT.201`**, sesuai kode resmi PDF Kurikulum 2026.

Konsekuensi yang harus dicek di Domainesia: di VPS, `MKU.202` justru yang menyimpan **41 nilai historis semester 20242** (22 TI + 19 SI) sementara `MKUT.201` kosong, dan `jenis` keduanya terbalik dari dev. Kalau pola yang sama muncul di Domainesia, riwayat 20242 dan nilai 20252 akan terpisah di dua MK sampai keduanya di-merge.

### Satu kelas, bukan dua

`MKUT.201` prodi 55201 berjenis `wajib_universitas`, jadi **satu kelas menampung kedua prodi**. Jangan membuat kelas terpisah untuk prodi SI — mahasiswa SI masuk ke kelas yang sama.

### File impor

`impor-nilai-MKUT201-20252.xlsx` (kolom `nim`, `tugas`, `uts`, `uas`, `nilaiAngka`), 23 baris.

Kolom **Kuis** dari rekap asli tidak diimpor — tabel `Nilai` tidak punya field padanannya. Nilai akhir di rekap sudah memperhitungkan kuis, jadi hasil akhirnya tetap benar, tapi rincian kuis tidak tersimpan di sistem.

### Yang perlu disampaikan ke dosen pengampu

Raihan Muhammad Faqih — rekap menulis **B+** untuk nilai 78.5, sistem akan menyimpannya sebagai **AB**. Aplikasi tidak mengenal notasi B+/C+. Sampaikan sebelum finalisasi.

### Hambatan terbesar

**KRS tidak punya impor massal.** 23 peserta harus berstatus `disetujui` sebelum nilai bisa diunggah — lewat KRS mahasiswa masing-masing, atau ditambahkan Akademik satu per satu. Ini bagian paling makan waktu, bukan impor nilainya.
