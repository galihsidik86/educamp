#!/usr/bin/env bash
# Regenerate MANUAL-IMPORT.pdf dari MANUAL-IMPORT.md
# Prasyarat: pandoc + Chrome/Edge (headless).

set -euo pipefail
cd "$(dirname "$0")/.."

SRC=MANUAL-IMPORT.md
CSS=docs/manual-print.css
HTML=docs/MANUAL-IMPORT.html
PDF=docs/MANUAL-IMPORT.pdf

# Cari browser Chromium-based
BROWSER=""
for c in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -x "$c" ] && BROWSER="$c" && break
done
[ -z "$BROWSER" ] && { echo "❌ Chrome/Edge tidak ditemukan"; exit 1; }

# Cek pandoc
command -v pandoc >/dev/null || { echo "❌ pandoc tidak terpasang"; exit 1; }

echo "→ Generate HTML"
pandoc "$SRC" \
  --standalone --toc --toc-depth=2 --embed-resources \
  --metadata=title:"Manual Import Data — SIAKAD Tazkia" \
  --metadata=lang:id \
  --css="$CSS" -o "$HTML"

echo "→ Render HTML → PDF (via $BROWSER)"
"$BROWSER" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$(pwd)/$PDF" \
  "file:///$(pwd)/$HTML"

echo "✓ Selesai: $PDF ($(du -h "$PDF" | cut -f1))"
