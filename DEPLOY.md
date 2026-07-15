# Tazkia SIAKAD — Production Deploy

Panduan deploy SIAKAD ke server produksi (Linux + Docker).

> Untuk **dev lokal**, lihat `SETUP.md`. File ini khusus untuk produksi.

---

## Prasyarat server

- **Linux** (Ubuntu 22.04+ / Debian 12+ / Rocky 9+ / Alma 9+)
- **Docker Engine 24+** dan **docker compose plugin v2+**
- **2 GB RAM minimum** (4 GB direkomendasikan untuk MySQL + API + Web build)
- **20 GB disk** untuk database + image
- Port `80` (atau yang Anda set) terbuka di firewall
- Direkomendasikan: **reverse proxy** (Caddy/Nginx host) + sertifikat HTTPS (Let's Encrypt)

---

## Step 1 — siapkan file env

```bash
# di server, di folder /opt/siakad (atau bebas)
git clone <repo> .            # atau salin source dengan rsync/scp
cp .env.example .env
```

**Generate JWT secrets yang kuat** (jangan pakai default):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Jalankan dua kali, isi ke `.env`:

```dotenv
JWT_ACCESS_SECRET=<hasil pertama>
JWT_REFRESH_SECRET=<hasil kedua>

MYSQL_ROOT_PASSWORD=<password kuat>
MYSQL_PASSWORD=<password kuat>
# MYSQL_DATABASE/MYSQL_USER bisa default

WEB_PORT=80
# atau 8080 kalau ada reverse proxy host di port 80/443
```

`CORS_ORIGINS` tidak perlu diset spesifik — browser hit `/api/*` same-origin via nginx; bisa biarkan default.

**Telegram (opsional)** — notifikasi admin (mis. dipakai oleh runbook autofix helpdesk). Kalau kosong, notifikasi cukup di-log ke console:

```dotenv
TELEGRAM_BOT_TOKEN=<token dari @BotFather>
TELEGRAM_ADMIN_CHAT_ID=<chat id, cek via getUpdates>
```

Lindungi file:

```bash
chmod 600 .env
```

## Step 2 — build & start

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

Tunggu ±30-60 detik, lalu cek status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail=50
```

Healthcheck akan menunjukkan `healthy` ketika MySQL siap, API merespons `/health`, dan nginx serve `/healthz`.

## Step 3 — migrasi & seed pertama

Skema Prisma otomatis di-sync saat container API start (`prisma db push --accept-data-loss`
— bukan `migrate deploy`; lihat komentar di `apps/api/Dockerfile` dan `scripts/deploy-vps.sh`).
Untuk **seed data awal** (1× pada server kosong):

```bash
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

Setelah seed, **WAJIB ganti password akun admin**:

```bash
# login akademik@tazkia.ac.id / password123, lalu reset password atau gunakan endpoint reset
# Lihat halaman /akademik/dosen → Reset PW; ulangi untuk semua akun seed.
```

## Step 4 — verifikasi

```bash
curl -s http://localhost/healthz       # → ok
curl -s http://localhost/api/health    # → {"ok":true,"service":"siakad-api",...}
```

Buka browser ke `http://<server-ip>/` — login screen Tazkia muncul.

---

## HTTPS / reverse proxy (sangat direkomendasikan)

Image `web` hanya melayani HTTP di port 80. Untuk produksi pakai reverse proxy host yang handle TLS.

### Caddy (paling mudah)

`/etc/caddy/Caddyfile`:

```
siakad.tazkia.ac.id {
  reverse_proxy localhost:8080
}
```

Pastikan `WEB_PORT=8080` di `.env`. Caddy auto-issue Let's Encrypt cert.

### Nginx host

`/etc/nginx/sites-available/siakad`:

```nginx
server {
  listen 80;
  server_name siakad.tazkia.ac.id;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name siakad.tazkia.ac.id;

  ssl_certificate     /etc/letsencrypt/live/siakad.tazkia.ac.id/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/siakad.tazkia.ac.id/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Issue cert via certbot, lalu `systemctl reload nginx`.

---

## Operasional

### Update aplikasi

```bash
git pull
docker compose -f docker-compose.prod.yml build api web
docker compose -f docker-compose.prod.yml up -d api web
```

API akan auto-run `prisma db push --accept-data-loss` saat start (idempoten selama tidak ada perubahan skema yang menghapus kolom/tabel berisi data).

### Backup database

Cron harian (`/etc/cron.daily/siakad-backup`):

```bash
#!/bin/sh
TS=$(date +%Y%m%d-%H%M%S)
DEST=/var/backups/siakad
mkdir -p "$DEST"
docker exec siakad_mysql_prod sh -c \
  'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --databases "$MYSQL_DATABASE"' \
  | gzip > "$DEST/siakad-$TS.sql.gz"
# retensi 30 hari
find "$DEST" -name 'siakad-*.sql.gz' -mtime +30 -delete
```

```bash
chmod +x /etc/cron.daily/siakad-backup
```

### Restore

```bash
gunzip < siakad-20260610-030000.sql.gz | \
  docker exec -i siakad_mysql_prod mysql -u root -p"$MYSQL_ROOT_PASSWORD"
```

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f mysql
```

Rekomendasi: pakai `journald` driver atau forward ke Loki/ELK untuk retensi panjang.

### Migrasi setelah update schema

Saat skema Prisma berubah (misal tambah kolom), buat migrasi di **lokal dev**:

```bash
npm run prisma:migrate    # buat file migrasi di apps/api/prisma/migrations/
git add apps/api/prisma/migrations/
git commit -m "migration: tambah kolom X"
```

Setelah pull di server, restart API — migrasi auto-deploy.

### Restart MySQL saja (mis. tuning)

```bash
docker compose -f docker-compose.prod.yml restart mysql
```

API akan reconnect otomatis (Prisma pool).

### Stop & destroy (hati-hati)

```bash
# stop saja (data MySQL aman):
docker compose -f docker-compose.prod.yml down

# destroy volume MySQL (HAPUS SEMUA DATA — TIDAK BISA DIBALIKKAN):
docker compose -f docker-compose.prod.yml down -v
```

---

## Tuning & hardening

- **MySQL buffer pool**: sudah set 512M di compose. Naikkan jadi ≥1G untuk >5000 mahasiswa aktif.
- **JWT TTL**: produksi default 15m / 30d. Untuk environment internal yang lebih konservatif: 5m / 7d.
- **CORS**: di-prod `CORS_ORIGINS` tidak begitu kritis (same-origin via nginx), tapi tetap set ke domain produksi untuk pertahanan defense-in-depth.
- **Rate limiting**: belum bawaan — tambahkan `express-rate-limit` di Fase berikutnya atau implementasi di reverse-proxy host.
- **Audit log**: belum bawaan — pertimbangkan tambah model `AuditLog` ke skema Prisma untuk track perubahan data sensitif (perubahan nilai, reset password, validasi KRS).
- **Backup off-site**: rotasi backup ke S3/B2/Wasabi.

---

## Troubleshooting

**API tidak start, log "P1001 Can't reach database"**
→ MySQL belum healthy. Tunggu 30 detik atau cek `docker compose logs mysql`.

**Web tampil tapi login bilang network error**
→ Cek nginx proxy: `docker compose exec web wget -qO- http://api:4000/health`.
→ Pastikan API container running: `docker compose ps`.

**Build gagal dengan "P3014 prisma engines"**
→ Pastikan koneksi internet saat build (download engine binary). Atau pakai mirror NPM (`.npmrc registry=...`).

**Migrasi gagal dengan "P3009"**
→ Migrasi lama ditandai failed. Investigasi `prisma_migrations` table di MySQL; mark resolved manual:
```bash
docker compose exec api npx prisma migrate resolve --rolled-back <nama_migration>
```

**Image Vite gagal build "Cannot find module @ds/..."**
→ Pastikan `tokens/`, `components/`, `assets/`, `styles.css` ter-COPY di `apps/web/Dockerfile` stage build (sudah diatur, tapi cek `.dockerignore` Anda tidak meng-exclude folder ini).

---

## Checklist sebelum go-live

- [ ] `.env` dibuat, JWT secrets di-generate ulang (bukan default)
- [ ] Password MySQL diganti kuat
- [ ] Backup harian (cron) aktif & lokasi off-site
- [ ] Reverse proxy + HTTPS (Caddy/Nginx + Let's Encrypt) aktif
- [ ] Domain DNS pointing ke server (A/AAAA record)
- [ ] Firewall: tutup port 3306 publik, hanya buka 80/443
- [ ] Akun seed default direset password (jangan biarkan `password123`)
- [ ] Periode KRS / Nilai di-set sesuai kalender akademik
- [ ] Tagihan SPP awal di-import (CSV → script atau via bulk akademik)
- [ ] Monitoring: minimal uptime check ke `/healthz`
- [ ] Tim akademik sudah dilatih operasional portal
