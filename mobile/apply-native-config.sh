#!/usr/bin/env bash
# ============================================================
# Istiqoma — Apply Native Configuration
# ============================================================
# Wires permission strings, privacy manifests, and deep-link
# intent filters into the generated ios/ and android/ projects.
#
# Run this ONCE after `npx cap add ios` / `npx cap add android`,
# and again after any major Capacitor upgrade that regenerates
# the native projects.
#
# Usage:
#   chmod +x mobile/apply-native-config.sh
#   ./mobile/apply-native-config.sh
#
# Requirements: bash, python3 (pre-installed on macOS/Linux)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

IOS_APP="$ROOT_DIR/ios/App/App"
ANDROID_RES="$ROOT_DIR/android/app/src/main/res"
ANDROID_MANIFEST="$ROOT_DIR/android/app/src/main/AndroidManifest.xml"

echo "=== Istiqoma: Apply Native Configuration ==="

# ────────────────────────────────────────────────────────────
# iOS
# ────────────────────────────────────────────────────────────
if [ -d "$IOS_APP" ]; then
  echo ""
  echo "── iOS ──────────────────────────────────────────────"

  # 1. Merge usage descriptions + URL scheme into Info.plist
  INFO_PLIST="$IOS_APP/Info.plist"
  if [ -f "$INFO_PLIST" ]; then
    echo "  Merging Info.plist additions …"
    python3 - <<PYEOF
import plistlib, sys, os

plist_path = "$INFO_PLIST"

with open(plist_path, "rb") as f:
    plist = plistlib.load(f)

changed = False

# Microphone
key = "NSMicrophoneUsageDescription"
val = "Istiqoma uses the microphone to record Qur'an recitations for memorization practice. Recordings are stored on your device or saved to your account for progress tracking."
if plist.get(key) != val:
    plist[key] = val; changed = True

# Location (when in use)
key = "NSLocationWhenInUseUsageDescription"
val = "Istiqoma uses your location to calculate accurate prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) and show you the Qibla direction. Your location is never stored permanently."
if plist.get(key) != val:
    plist[key] = val; changed = True

# Background modes
key = "UIBackgroundModes"
modes = {"remote-notification", "audio"}
existing = set(plist.get(key, []))
if not modes.issubset(existing):
    plist[key] = sorted(existing | modes); changed = True

# Custom URL scheme (istiqoma://)
existing_url_types = plist.get("CFBundleURLTypes", [])
has_scheme = any(
    "istiqoma" in t.get("CFBundleURLSchemes", [])
    for t in existing_url_types
)
if not has_scheme:
    existing_url_types.append({
        "CFBundleURLSchemes": ["istiqoma"],
        "CFBundleURLName": "com.istiqoma.app",
    })
    plist["CFBundleURLTypes"] = existing_url_types
    changed = True

if changed:
    with open(plist_path, "wb") as f:
        plistlib.dump(plist, f)
    print("    ✓ Info.plist updated")
else:
    print("    ✓ Info.plist already up to date")
PYEOF
  else
    echo "  ⚠ $INFO_PLIST not found — run 'npx cap add ios' first"
  fi

  # 2. Copy PrivacyInfo.xcprivacy
  PRIVACY_DEST="$IOS_APP/PrivacyInfo.xcprivacy"
  PRIVACY_SRC="$SCRIPT_DIR/ios/PrivacyInfo.xcprivacy"
  if [ -f "$PRIVACY_SRC" ]; then
    cp "$PRIVACY_SRC" "$PRIVACY_DEST"
    echo "  ✓ PrivacyInfo.xcprivacy copied"
  fi

  # 3. Copy localized InfoPlist.strings (usage descriptions)
  for LANG in en id ms; do
    SRC="$SCRIPT_DIR/ios/InfoPlist.strings.$LANG"
    LPROJ_DIR="$IOS_APP/$LANG.lproj"
    if [ -f "$SRC" ] && [ -d "$IOS_APP" ]; then
      mkdir -p "$LPROJ_DIR"
      cp "$SRC" "$LPROJ_DIR/InfoPlist.strings"
      echo "  ✓ InfoPlist.strings ($LANG) → $LANG.lproj/"
    fi
  done

  echo "  iOS config applied ✓"
else
  echo "  ⚠ ios/ not found — run 'npx cap add ios' first, then re-run this script"
fi

# ────────────────────────────────────────────────────────────
# Android
# ────────────────────────────────────────────────────────────
if [ -d "$ANDROID_RES" ]; then
  echo ""
  echo "── Android ──────────────────────────────────────────"

  # 1. Add permissions + intent filter to AndroidManifest.xml
  if [ -f "$ANDROID_MANIFEST" ]; then
    echo "  Patching AndroidManifest.xml …"
    python3 - <<PYEOF
import xml.etree.ElementTree as ET
import re, sys

ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
ET.register_namespace("tools",   "http://schemas.android.com/tools")

with open("$ANDROID_MANIFEST", "r") as f:
    content = f.read()

changed = False

# ── Permissions ──────────────────────────────────────────
PERMS = [
    "android.permission.INTERNET",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.RECORD_AUDIO",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.VIBRATE",
]
for perm in PERMS:
    tag = f'<uses-permission android:name="{perm}" />'
    if perm not in content:
        # Insert before <application
        content = content.replace(
            "\n    <application",
            f"\n    {tag}\n    <application",
            1
        )
        changed = True

# ── Deep-link intent filter ────────────────────────────
FILTER = '''        <intent-filter android:label="Istiqoma OAuth Callback">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="istiqoma" />
        </intent-filter>'''
if 'android:scheme="istiqoma"' not in content:
    # Insert after the first closing </intent-filter> inside <activity>
    content = content.replace(
        "</intent-filter>",
        "</intent-filter>\n" + FILTER,
        1
    )
    changed = True

if changed:
    with open("$ANDROID_MANIFEST", "w") as f:
        f.write(content)
    print("    ✓ AndroidManifest.xml updated")
else:
    print("    ✓ AndroidManifest.xml already up to date")
PYEOF
  else
    echo "  ⚠ $ANDROID_MANIFEST not found"
  fi

  # 2. Copy localized strings.xml (permission rationale)
  for LANG in en id ms; do
    SRC="$SCRIPT_DIR/android/strings.xml.$LANG"
    if [ "$LANG" = "en" ]; then
      DEST_DIR="$ANDROID_RES/values"
    else
      DEST_DIR="$ANDROID_RES/values-$LANG"
    fi
    if [ -f "$SRC" ]; then
      mkdir -p "$DEST_DIR"
      cp "$SRC" "$DEST_DIR/strings_istiqoma.xml"
      echo "  ✓ strings_istiqoma.xml ($LANG) → res/values${LANG:+"-$LANG"}/"
    fi
  done

  echo "  Android config applied ✓"
else
  echo "  ⚠ android/ not found — run 'npx cap add android' first, then re-run this script"
fi

echo ""
echo "=== Done. Run 'npx cap sync' to copy web assets into native projects. ==="
