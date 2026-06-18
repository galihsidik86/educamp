#!/bin/bash
# ============================================================
# Deploy script — dijalankan di server Domainesia via SSH dari
# GitHub Actions. Idempotent: aman dijalankan ulang.
#
# Pre-req:
#   - ~/stmik-app/ sudah ada (initial clone done)
#   - ~/nodevenv/stmik-app/<version>/ sudah ada (cPanel Node.js App created)
#   - ~/stmik-app/.env sudah ada + symlink di apps/api/.env
# ============================================================
set -e
set -o pipefail

APP_DIR="${APP_DIR:-$HOME/stmik-app}"
cd "$APP_DIR"

echo "▶ git pull"
git fetch origin
git reset --hard origin/main

# Aktifkan virtualenv Node.js Selector (cari versi yang dipakai)
NODE_ACTIVATE=$(ls -d "$HOME"/nodevenv/stmik-app/*/bin/activate 2>/dev/null | head -1)
if [ -z "$NODE_ACTIVATE" ]; then
  echo "✗ nodevenv stmik-app tidak ditemukan. Setup cPanel Node.js App dulu."
  exit 1
fi
# shellcheck disable=SC1090
source "$NODE_ACTIVATE"
echo "▶ nodevenv aktif: $(node --version)"

# Install deps kalau package-lock berubah
if ! git diff --quiet HEAD@{1} HEAD -- package-lock.json apps/api/package.json apps/web/package.json 2>/dev/null; then
  echo "▶ deps berubah → npm install"
  npm install --workspaces --include-workspace-root
fi

# Generate Prisma + push schema (kalau ada perubahan)
if ! git diff --quiet HEAD@{1} HEAD -- apps/api/prisma/schema.prisma 2>/dev/null; then
  echo "▶ schema berubah → prisma db push"
  cd apps/api
  npx prisma db push --skip-generate
  cd "$APP_DIR"
fi

echo "▶ prisma generate"
cd apps/api && npx prisma generate && cd "$APP_DIR"

echo "▶ build API"
npm --workspace apps/api run build

echo "▶ build Web"
npm --workspace apps/web run build

echo "▶ copy web → apps/api/public"
rm -rf apps/api/public
mkdir -p apps/api/public
cp -r apps/web/dist/* apps/api/public/

echo "▶ Passenger restart (touch tmp/restart.txt)"
mkdir -p tmp
touch tmp/restart.txt

echo "✓ Deploy selesai · $(date '+%Y-%m-%d %H:%M:%S')"
