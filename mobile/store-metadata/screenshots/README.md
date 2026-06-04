# Istiqoma — Store Screenshots

Pre-processed screenshots ready for App Store Connect and Google Play Console.
Source screenshots were taken from a real device (iPhone 12 Pro, 1170×2532).

**To regenerate all sizes from source:** run `./mobile/generate-screenshots.sh` from
the project root (requires ImageMagick v7+).

---

## iOS App Store

Required screenshot sizes (Apple may update these — always verify at
https://help.apple.com/app-store-connect/#/devd274dd925):

| Device | Required Size | Files |
|--------|--------------|-------|
| iPhone 6.7" (15/16 Pro Max) | 1290×2796 | `ios/*_6.7in.png` ✅ |
| iPhone 5.5" (8 Plus) | 1242×2208 | `ios/*_5.5in.png` ✅ |
| iPad 12.9" (6th gen+) | 2048×2732 | `ios/*_ipad_12.9in.png` ✅ |

**Note on iPad screenshots:** The iPad 12.9" files are letterboxed from iPhone captures
(dark side bars visible). They meet Apple's size requirements. For a polished store listing,
replace them with native iPad Simulator captures (select "iPad Pro 12.9-inch" in Xcode Simulator,
build with `npx cap open ios`, and capture each screen).

**Upload order in App Store Connect matters** — the first screenshot is the
"feature" screenshot shown in search results. Recommended order:
1. `1_home` — Dashboard / today's progress
2. `2_deeds` — Deed logging
3. `3_quran` — Qur'an reader
4. `4_stats` — Progress & stats
5. `5_streaks` — Streak / leaderboard

---

## Google Play Store

Required sizes (see https://support.google.com/googleplay/android-developer/answer/9866151):

| Device | Required Size | Files |
|--------|-------------|-------|
| Phone | 1080×1920 (9:16) | `android/*_play_phone.png` ✅ |
| 7" tablet | 1200×1920 | `android/*_tablet_7in.png` ✅ |

**Note on tablet screenshots:** The 7" tablet files are letterboxed from iPhone captures
(dark side bars visible). They meet Play Store's minimum size requirements. For a polished
listing, replace them with Android emulator captures (create a Pixel Tablet AVD in
Android Studio, build with `npx cap open android`, capture each screen).

**Feature graphic** (Google Play only): 1024×500 flat image — NOT yet generated.
Create it in Figma/Canva or with:
```bash
magick -size 1024x500 xc:"#0a1120" \
  \( attached_assets/Istiqoma_New_Horizontal_Logo_-_Darkmode_1777804992389.png \
     -resize 700x185 \) \
  -gravity center -composite \
  mobile/store-metadata/feature-graphic.png
```

---

## Regenerating Screenshots

Run the included script to regenerate all sizes from source:

```bash
chmod +x mobile/generate-screenshots.sh
./mobile/generate-screenshots.sh
```

To use different source screenshots, edit the `SHOTS` array in the script.
Source files are in `attached_assets/` (1170×2532 iPhone 12 Pro captures).
