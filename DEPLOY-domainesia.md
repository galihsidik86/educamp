# Deploy SIAKAD ke Domainesia (CloudLinux Node.js Selector)

> # ⚠️ DOKUMEN USANG — JANGAN DIIKUTI
>
> **Setup cPanel ini sudah tidak dipakai dan tidak melayani `stmik.sosmartpro.com`.**
>
> Diverifikasi 2026-07-20: domain tersebut me-resolve ke VPS **`202.134.242.202`**, di mana **Caddy** mem-proxy-nya ke `localhost:8080` (container `siakad_web_prod`). Produksi berjalan di **Docker**, bukan CloudLinux Node.js Selector, dan databasenya **`siakad`** — bukan `sosmartp_stmik`.
>
> "Domainesia" di judul ini merujuk pada **penyedia hosting**, yang kini menyediakan VPS tersebut. Ini bukan deployment terpisah dari VPS.
>
> **Yang berlaku sekarang:**
> - Deploy kode → `DEPLOY.md` (Docker) dan `scripts/deploy-vps.sh` (dipanggil GitHub Actions saat push ke `main`)
> - Rilis data nilai → `RILIS-NILAI-KE-PRODUKSI.md`
>
> Dokumen ini disimpan sebagai catatan sejarah. Database `sosmartp_stmik` bila masih ada **bukan** sumber data produksi — jangan membaca apalagi menulis ke sana.

Target: **stmik.sosmartpro.com** · Domainesia cPanel + CloudLinux Node.js Selector + MySQL shared.

Panduan ini sudah diuji & berhasil — ikuti urutan persis.

---

## 0 — Prasyarat di cPanel

Sebelum SSH/Terminal, siapkan via cPanel UI:

1. **Subdomain** → buat `stmik.sosmartpro.com` (Document Root default: `~/stmik.sosmartpro.com/`)
2. **MySQL Databases**:
   - Database: `sosmartp_stmik`
   - User: `sosmartp_admin`
   - Add user ke DB dengan **ALL PRIVILEGES**
3. **Terminal** (Advanced) — pastikan aktif.

---

## 1 — Clone repo

Di Terminal:

```bash
cd ~
git clone https://github.com/galihsidik86/educamp.git stmik-app
cd stmik-app
```

**JANGAN** jalankan `npm install` di sini — CloudLinux akan handle dependency install nanti via virtualenv. Pre-install bakal di-overwrite dan bikin error.

---

## 2 — Buat file `.env`

Generate JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy hasilnya (SECRET_A)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy hasilnya (SECRET_B)
```

Buat `.env` di root project:

```bash
nano ~/stmik-app/.env
```

Isi (ganti `<SECRET_A>` & `<SECRET_B>`, dan **password DB** sesuai milik Anda):

```dotenv
NODE_ENV=production
API_PORT=4000

# PENTING: pakai 127.0.0.1, bukan localhost.
# MySQL Domainesia default listen Unix socket — Prisma butuh TCP.
DATABASE_URL="mysql://sosmartp_admin:PASSWORD_DB@127.0.0.1:3306/sosmartp_stmik"

JWT_ACCESS_SECRET=<SECRET_A>
JWT_REFRESH_SECRET=<SECRET_B>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

CORS_ORIGINS=https://stmik.sosmartpro.com
FRONTEND_URL=https://stmik.sosmartpro.com

MAIL_FROM=SIAKAD <no-reply@stmik.sosmartpro.com>
```

Simpan (Ctrl+O → Enter → Ctrl+X) lalu protect:

```bash
chmod 600 ~/stmik-app/.env
```

Symlink ke `apps/api/.env` agar Prisma CLI bisa baca:

```bash
ln -s ~/stmik-app/.env ~/stmik-app/apps/api/.env
```

Verifikasi koneksi DB:

```bash
mysql -u sosmartp_admin -p'PASSWORD_DB' -e "SELECT VERSION();" sosmartp_stmik
```

Harus muncul version MySQL. Kalau gagal, **STOP** — perbaiki credential dulu.

---

## 3 — Setup Node.js App di cPanel

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Nilai |
|---|---|
| Node.js version | **20.x** atau lebih baru (≥18) |
| Application mode | Production |
| Application root | `stmik-app` |
| Application URL | `stmik.sosmartpro.com` |
| Application startup file | `apps/api/dist/server.prod.js` |

Klik **Create**. CloudLinux akan:
- Buat virtualenv di `~/nodevenv/stmik-app/<version>/`
- Replace `~/stmik-app/node_modules` (kalau ada) dengan symlink ke virtualenv

> **Catatan**: kalau muncul error "application should not contain folder/file with such name node_modules" → hapus dulu `rm -rf ~/stmik-app/node_modules` lalu retry Create.

---

## 4 — Install workspace dependencies

CloudLinux Node.js Selector **TIDAK** auto-install workspace deps. Lakukan manual via Terminal:

```bash
# Aktifkan virtualenv (cPanel kasih command persis di halaman app)
source ~/nodevenv/stmik-app/*/bin/activate

# Install root + semua workspace deps
cd ~/stmik-app
npm install --workspaces --include-workspace-root
```

Tunggu 2-5 menit. Warning "vulnerabilities" boleh diabaikan.

---

## 5 — Generate Prisma + push schema + seed

Masih dengan virtualenv aktif:

```bash
cd ~/stmik-app/apps/api
npx prisma generate
npx prisma db push
npx prisma db seed
```

Output yang diharapkan:
- `generate`: `✔ Generated Prisma Client`
- `db push`: `Your database is now in sync with your Prisma schema`
- `db seed`: `The seed command has been executed`

---

## 6 — Build (TS → JS, Vite SPA → static)

```bash
cd ~/stmik-app
npm --workspace apps/api run build
npm --workspace apps/web run build
```

Web build bisa 1-2 menit (rendering chunks, minify). Warning Vite "NODE_ENV=production not supported in .env" — **abaikan, harmless**.

Copy hasil web ke folder yang di-serve oleh API:

```bash
mkdir -p ~/stmik-app/apps/api/public
cp -r ~/stmik-app/apps/web/dist/* ~/stmik-app/apps/api/public/
```

Verifikasi:

```bash
ls ~/stmik-app/apps/api/dist/server.prod.js && echo "✓ entry"
ls ~/stmik-app/apps/api/public/index.html && echo "✓ SPA"
```

Kedua-duanya harus muncul ✓.

---

## 7 — Re-generate Prisma (penting!)

`npm install --workspaces` kadang menggusur Prisma client. Generate ulang:

```bash
cd ~/stmik-app/apps/api
npx prisma generate
```

---

## 8 — Start App

cPanel → halaman Setup Node.js App → klik **Restart App** (atau **Start App** kalau belum pernah jalan).

Buka **https://stmik.sosmartpro.com** di browser.

Harapan: halaman login SIAKAD muncul. Login pakai akun seed:
- **akademik@tazkia.ac.id** / `password123`
- **2021110001** / `password123` (NIM Aisyah)

---

## 9 — SSL (HTTPS)

cPanel → **SSL/TLS Status** → run **AutoSSL** untuk `stmik.sosmartpro.com`.

Setelah AutoSSL aktif, set **Force HTTPS Redirect** via cPanel → **Domains**.

---

## Update di kemudian hari

Saat ada perubahan kode:

```bash
cd ~/stmik-app
git pull

# Aktifkan virtualenv
source ~/nodevenv/stmik-app/*/bin/activate

# Install kalau ada deps baru
npm install --workspaces --include-workspace-root

# Build ulang
npm --workspace apps/api run build
npm --workspace apps/web run build
cp -r apps/web/dist/* apps/api/public/

# Kalau schema berubah
cd apps/api && npx prisma db push && npx prisma generate
```

Restart app via cPanel → **Restart App**.

Atau via touch file (Passenger auto-restart):

```bash
mkdir -p ~/stmik-app/tmp
touch ~/stmik-app/tmp/restart.txt
```

---

## Troubleshooting

### `Error: P1001: Can't reach database server at localhost:3306`
MySQL Domainesia listen Unix socket. Pakai `127.0.0.1` di DATABASE_URL (bukan `localhost`).

### `Error: P1012: Environment variable not found: DATABASE_URL`
Prisma CLI tidak baca root `.env`. Symlink: `ln -s ~/stmik-app/.env ~/stmik-app/apps/api/.env`.

### `ERR_MODULE_NOT_FOUND: Cannot find package 'express-async-errors'`
Workspace deps belum di-install. Aktifkan virtualenv lalu: `npm install --workspaces --include-workspace-root`.

### `application should not contain folder/file with such name node_modules`
CloudLinux mau bikin symlink sendiri. Hapus dulu: `rm -rf ~/stmik-app/node_modules`. Lalu retry NPM Install di cPanel.

### Tons of TypeScript errors saat `npm run build`
Prisma client belum di-generate (atau hilang setelah workspace install). Jalankan: `cd apps/api && npx prisma generate`.

### Vite warning: `NODE_ENV=production is not supported in .env`
Harmless. Vite minta NODE_ENV di-set via flag, tapi build tetap jalan dalam mode production.

### Halaman muncul tapi error 500
Cek Passenger log di cPanel → halaman app → **stderr log**. Atau `tail -40 ~/stmik-app/passenger.log` (kalau aktif).

### Build lambat / hang
Shared hosting CPU/memory terbatas. Disable sourcemap untuk web build:
```bash
sed -i 's/sourcemap: true/sourcemap: false/' ~/stmik-app/apps/web/vite.config.ts
```

### Curl localhost dari Terminal returns 000
Normal di shared hosting (firewall/CageFS block direct localhost TCP). Cek via browser dengan URL publik, atau via cPanel **Restart** + **Open**.
