# Deploy SIAKAD ke Domainesia (cPanel + Node.js Selector)

Target: **stmik.sosmartpro.com** · stack: Node.js + MySQL · single-subdomain (API & SPA satu origin).

---

## Prasyarat di cPanel

1. **Subdomain** — cPanel → *Subdomains* → buat `stmik` di bawah `sosmartpro.com`.
   - Document Root: `/home/sosmartp/stmik.sosmartpro.com` (atau path default cPanel).
2. **MySQL Database** — cPanel → *MySQL Databases*:
   - Nama DB: `sosmartp_stmik`
   - User: `sosmartp_admin` (kalau belum ada, buat)
   - Add user ke database dengan **ALL PRIVILEGES**
3. **Node.js Selector** — pastikan tersedia di paket hosting (Node 18+ / 20+).
4. **SSH access** — pastikan terbuka (cPanel → *SSH Access*).

---

## Step 1 — clone & build di lokal

Lakukan build di mesin lokal Anda (lebih cepat & tidak makan resource shared hosting):

```bash
git clone https://github.com/galihsidik86/educamp.git siakad
cd siakad
npm install
npm --workspace apps/api run build   # → apps/api/dist/
npm --workspace apps/web run build   # → apps/web/dist/
```

Hasil yang akan di-upload:
- `apps/api/dist/` — compiled JS
- `apps/api/prisma/` — schema + seed (perlu di server utk db push)
- `apps/api/package.json` + `package-lock.json`
- `apps/web/dist/` — static SPA
- `apps/api/node_modules/` — **JANGAN upload**, install di server

---

## Step 2 — upload ke server

Via SFTP / rsync ke struktur ini di server:

```
/home/sosmartp/stmik-app/                  ← root aplikasi (Application Root di Node.js Selector)
├── package.json
├── package-lock.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── dist/                                  ← isi apps/api/dist/*
└── public/                                ← isi apps/web/dist/* (SPA)
```

Contoh rsync (sesuaikan path lokal):

```bash
# Dari lokal
rsync -avz --exclude node_modules --exclude .env \
  apps/api/dist/ apps/api/prisma/ apps/api/package.json apps/api/package-lock.json \
  USER@stmik.sosmartpro.com:/home/sosmartp/stmik-app/

rsync -avz apps/web/dist/ USER@stmik.sosmartpro.com:/home/sosmartp/stmik-app/public/
```

Atau via cPanel File Manager → upload zip → extract.

---

## Step 3 — buat `.env` di server

SSH ke server:

```bash
ssh USER@stmik.sosmartpro.com
cd ~/stmik-app
nano .env
```

Salin isi dari `.env.production.example` (sudah ada di repo). Sesuaikan:

```dotenv
NODE_ENV=production
DATABASE_URL="mysql://sosmartp_admin:19Feb2018.@localhost:3306/sosmartp_stmik"
JWT_ACCESS_SECRET=<panjang 64+ byte hex>
JWT_REFRESH_SECRET=<panjang 64+ byte hex>
CORS_ORIGINS=https://stmik.sosmartpro.com
FRONTEND_URL=https://stmik.sosmartpro.com
MAIL_FROM=SIAKAD STMIK Tazkia <no-reply@stmik.sosmartpro.com>
```

Lindungi: `chmod 600 .env`.

> ⚠ Password DB `19Feb2018.` sudah pernah ter-expose. Disarankan **ganti via cPanel** sebelum produksi.

---

## Step 4 — install deps + push schema + seed

```bash
cd ~/stmik-app
npm install --omit=dev          # install prod deps
npx prisma generate
npx prisma db push              # buat tabel di MySQL Domainesia
npx tsx prisma/seed.ts          # seed data awal (akun admin/dosen/mahasiswa demo)
```

> Kalau `tsx` tidak terinstal (karena `--omit=dev`), pakai: `npm install -D tsx` lalu seed.

---

## Step 5 — setup Node.js Selector di cPanel

cPanel → *Setup Node.js App* → Create:

| Field | Nilai |
|---|---|
| Node.js version | 20.x |
| Application mode | Production |
| Application root | `stmik-app` |
| Application URL | `stmik.sosmartpro.com` |
| Application startup file | `dist/server.prod.js` |
| Passenger log file | (kosongkan, default) |

Klik **Create**. Lalu di section "Detected configuration files":
- Klik **Run NPM Install** kalau belum.
- Lalu **Start App**.

cPanel akan otomatis bikin `.htaccess` di document root yang proxy ke Passenger app.

---

## Step 6 — verifikasi

Buka https://stmik.sosmartpro.com:

- Login page harus muncul (UI SPA).
- Test login dengan seed account:
  - **akademik@tazkia.ac.id** / `password123`
  - **2021110001** / `password123` (NIM Aisyah)

Cek log via cPanel atau SSH:

```bash
tail -f ~/logs/stmik.sosmartpro.com.error_log
```

---

## Step 7 — SSL (HTTPS)

cPanel → *SSL/TLS Status* → klik **Run AutoSSL** untuk `stmik.sosmartpro.com`.

Setelah AutoSSL aktif, redirect HTTP → HTTPS via cPanel → *Domains* → toggle "Force HTTPS Redirect".

---

## Update di kemudian hari

```bash
# Lokal — build & push
npm --workspace apps/api run build
npm --workspace apps/web run build
rsync -avz apps/api/dist/ USER@stmik.sosmartpro.com:/home/sosmartp/stmik-app/dist/
rsync -avz apps/web/dist/ USER@stmik.sosmartpro.com:/home/sosmartp/stmik-app/public/

# Kalau ada perubahan schema:
ssh USER@stmik.sosmartpro.com 'cd ~/stmik-app && npx prisma db push'

# Restart app via cPanel → Setup Node.js App → Restart, atau:
touch ~/stmik-app/tmp/restart.txt    # Passenger auto-restart
```

---

## Troubleshooting

- **502 Bad Gateway** → cek log error, biasanya: missing `.env`, db credential salah, atau port mismatch.
- **CORS error** → pastikan `CORS_ORIGINS` di `.env` cocok dengan domain (termasuk `https://`).
- **Database connection failed** → cek user MySQL sudah di-add ke database dengan privilege, dan `DATABASE_URL` benar.
- **Static file 404** → pastikan `public/` ada di Application Root dan berisi `index.html` + folder `assets/`.
- **Prisma DLL locked** (Windows local) — restart machine, atau `rm -rf node_modules/.prisma`.
