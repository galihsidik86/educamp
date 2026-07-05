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

# Selalu jalankan schema push — idempotent, no-op kalau DB sudah sync.
# Diff check sebelumnya rentan terhadap bash-buffer footgun saat
# script update dirinya sendiri di pull (skip schema padahal harusnya
# migrate). Always-run aman karena prisma db push mendeteksi state.
# --accept-data-loss: aman untuk additive schema changes (kolom baru
# nullable, unique constraint pada kolom baru). Prisma konservatif —
# MySQL mengizinkan banyak NULL pada unique constraint sehingga tidak
# ada data loss aktual.
echo "▶ prisma db push"
docker compose -f docker-compose.prod.yml run --rm api npx prisma db push --skip-generate --accept-data-loss

# Seed selalu jalan — seed.ts pakai upsert by-unique sehingga idempotent.
# Lebih sederhana dan tahan terhadap bash-buffer footgun pada self-modify.
# Kalau seed gagal, log warning tapi lanjut deploy supaya API tetap up.
echo "▶ prisma db seed"
docker compose -f docker-compose.prod.yml run --rm api npx prisma db seed || echo "⚠ seed gagal (lanjut deploy)"

# Restart stack (recreate services if image baru)
echo "▶ up -d"
docker compose -f docker-compose.prod.yml up -d

# Tunggu API benar-benar sehat sebelum menyatakan deploy sukses. `up -d`
# hanya meluncurkan container — kalau API crash-loop (mis. drift skema),
# tanpa gate ini deploy tetap "success" dan situs down diam-diam. Kita poll
# /health via container web (jalur nginx→api yang sama seperti browser).
echo "▶ tunggu API healthy"
API_OK=0
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml exec -T web wget -qO- http://api:4000/health >/dev/null 2>&1; then
    API_OK=1
    echo "  ✓ API sehat setelah ${i}x cek"
    break
  fi
  sleep 4
done
if [ "$API_OK" -ne 1 ]; then
  echo "✗ API tidak sehat dalam ~120 detik — deploy DIANGGAP GAGAL"
  echo "  Log API terakhir:"
  docker compose -f docker-compose.prod.yml logs api --tail=40 --no-color || true
  exit 1
fi

# Cleanup old images
echo "▶ prune old images"
docker image prune -f

echo "✓ Deploy selesai · $(date '+%Y-%m-%d %H:%M:%S')"
