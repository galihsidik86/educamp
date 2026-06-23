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

# Build images kalau Dockerfiles, lockfile, atau source code app berubah.
# (Runtime image jalan dist/ hasil tsc — perubahan TS tidak ikut tanpa rebuild.)
NEEDS_BUILD=0
if ! git diff --quiet HEAD@{1} HEAD -- \
    'apps/*/Dockerfile' \
    'apps/*/package.json' \
    'apps/api/src/**' \
    'apps/api/prisma/**' \
    'apps/web/src/**' \
    'apps/web/index.html' \
    'apps/web/vite.config.ts' \
    'apps/web/nginx.conf' \
    'package.json' \
    'package-lock.json' \
    2>/dev/null; then
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" = "1" ]; then
  echo "▶ build images (Dockerfile/deps berubah)"
  docker compose -f docker-compose.prod.yml build
else
  echo "▶ skip build (no Dockerfile/deps changes)"
fi

# Apply schema kalau berubah
if ! git diff --quiet HEAD@{1} HEAD -- apps/api/prisma/schema.prisma 2>/dev/null; then
  echo "▶ schema berubah → prisma db push"
  docker compose -f docker-compose.prod.yml run --rm api npx prisma db push --skip-generate
fi

# Restart stack (recreate services if image baru)
echo "▶ up -d"
docker compose -f docker-compose.prod.yml up -d

# Cleanup old images
echo "▶ prune old images"
docker image prune -f

echo "✓ Deploy selesai · $(date '+%Y-%m-%d %H:%M:%S')"
