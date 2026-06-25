#!/bin/bash
# ============================================================
# Deploy script untuk VPS Domainesia (Docker + Caddy).
# Dijalankan via SSH dari GitHub Actions.
# Idempotent: aman dijalankan ulang.
#
# Pre-req:
#   - /opt/siakad sudah ada (initial clone done)
#   - docker + docker compose terinstal
#   - .env sudah ada di /opt/siakad/.env
# ============================================================
set -e
set -o pipefail

APP_DIR="${APP_DIR:-/opt/siakad}"
cd "$APP_DIR"

echo "▶ git pull"
git fetch origin
git reset --hard origin/main

# Selalu build — Docker layer cache bikin ini cepat kalau memang tidak ada
# yang berubah. Sebelumnya kami pakai `git diff HEAD@{1} HEAD` untuk skip
# build, tapi bash men-buffer skrip yang sedang berjalan: kalau skrip ini
# sendiri ter-update oleh `git reset --hard` di atas, baris-baris berikutnya
# bisa berasal dari versi lama atau baru — tidak dapat diandalkan. Selalu
# build menghilangkan footgun itu, dan rebuild dengan cache penuh ~5 detik.
echo "▶ build images"
if ! docker compose -f docker-compose.prod.yml build; then
  echo "⚠ build gagal — kemungkinan cache BuildKit korup, retry dengan --no-cache"
  docker compose -f docker-compose.prod.yml build --no-cache
fi

# Apply schema kalau berubah
SCHEMA_CHANGED=0
if ! git diff --quiet HEAD@{1} HEAD -- apps/api/prisma/schema.prisma 2>/dev/null; then
  echo "▶ schema berubah → prisma db push"
  docker compose -f docker-compose.prod.yml run --rm api npx prisma db push --skip-generate
  SCHEMA_CHANGED=1
fi

# Seed selalu jalan — seed.ts pakai upsert by-unique sehingga idempotent.
# Lebih sederhana dan tahan terhadap bash-buffer footgun pada self-modify.
# Kalau seed gagal, log warning tapi lanjut deploy supaya API tetap up.
echo "▶ prisma db seed"
docker compose -f docker-compose.prod.yml run --rm api npx prisma db seed || echo "⚠ seed gagal (lanjut deploy)"

# Restart stack (recreate services if image baru)
echo "▶ up -d"
docker compose -f docker-compose.prod.yml up -d

# Cleanup old images
echo "▶ prune old images"
docker image prune -f

echo "✓ Deploy selesai · $(date '+%Y-%m-%d %H:%M:%S')"
