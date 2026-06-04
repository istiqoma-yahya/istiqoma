#!/usr/bin/env bash
# ============================================================
# Istiqoma — Store Screenshot Generator
# ============================================================
# Resizes / letterboxes source iPhone screenshots to every
# required size for the App Store and Google Play Store.
#
# Usage:
#   chmod +x mobile/generate-screenshots.sh
#   ./mobile/generate-screenshots.sh
#
# Requirements: ImageMagick v7+ (`magick` command)
# Output: mobile/store-metadata/screenshots/{ios,android}/
# ============================================================
set -euo pipefail

OUT_IOS="mobile/store-metadata/screenshots/ios"
OUT_ANDROID="mobile/store-metadata/screenshots/android"
BG="#0a1120"   # Istiqoma dark navy background for letterboxing

mkdir -p "$OUT_IOS" "$OUT_ANDROID"

# Source screenshots — edit this list to swap screens
SHOTS=(
  "IMG_4205_1778976591050.PNG:1_home"
  "IMG_4207_1778976591055.PNG:2_deeds"
  "IMG_4208_1778976591057.PNG:3_quran"
  "IMG_4213_1778976591062.PNG:4_stats"
  "IMG_4284_1779244101609.png:5_streaks"
)

for entry in "${SHOTS[@]}"; do
  SRC="attached_assets/${entry%%:*}"
  NAME="${entry##*:}"

  echo "Processing $NAME from $SRC …"

  # ── iOS ──────────────────────────────────────────────────
  # iPhone 6.7" (1290×2796) — almost identical aspect; just resize
  magick "$SRC" -resize 1290x2796! \
    "$OUT_IOS/${NAME}_6.7in.png"

  # iPhone 5.5" (1242×2208) — pillarbox (dark bars left/right)
  magick "$SRC" \
    -resize 1242x2208 -background "$BG" -gravity center -extent 1242x2208 \
    "$OUT_IOS/${NAME}_5.5in.png"

  # iPad 12.9" (2048×2732) — pillarbox (dark bars left/right)
  magick "$SRC" \
    -resize 1262x2732 -background "$BG" -gravity center -extent 2048x2732 \
    "$OUT_IOS/${NAME}_ipad_12.9in.png"

  # ── Android ──────────────────────────────────────────────
  # Phone (1080×1920) — pillarbox
  magick "$SRC" \
    -resize 1080x1920 -background "$BG" -gravity center -extent 1080x1920 \
    "$OUT_ANDROID/${NAME}_play_phone.png"

  # 7" tablet (1200×1920) — pillarbox
  magick "$SRC" \
    -resize 887x1920 -background "$BG" -gravity center -extent 1200x1920 \
    "$OUT_ANDROID/${NAME}_tablet_7in.png"

  echo "  ✓ All sizes written for $NAME"
done

echo ""
echo "Done. Files in $OUT_IOS and $OUT_ANDROID."
echo ""
echo "Note: iPad and tablet screenshots are letterboxed from iPhone captures."
echo "For a polished store listing, replace them with native Simulator captures."
echo "See mobile/store-metadata/screenshots/README.md for details."
