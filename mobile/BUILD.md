# Building Istiqoma for iOS and Android

Istiqoma uses [Capacitor](https://capacitorjs.com/) to wrap the existing React/Vite web app into
native iOS and Android shells. The Capacitor config is in `capacitor.config.ts` at the project root.

---

## Prerequisites

| Tool | Required for |
|---|---|
| Node.js 22+ | Always (Capacitor CLI 8 requires Node ≥ 22) |
| **macOS + Xcode 15+** | iOS builds |
| **Android Studio** (Flamingo+) | Android builds |
| `npx cap` CLI | Running Capacitor commands |

---

## One-time setup (do this locally after cloning)

### 1. Install npm dependencies

```bash
npm install
```

### 2. Build the web app

```bash
npm run build
```

This produces `dist/public/` which Capacitor bundles into the native shells.

### 3. Generate native projects (first time only)

```bash
npx cap add ios
npx cap add android
```

These commands create `ios/` and `android/` project folders. They are in `.gitignore` because
they're large and auto-generated — regenerate them from this repo on any fresh clone.

### 4. Generate app icons and splash screens

Source assets are in `resources/` (already committed):

| File | Size | Purpose |
|------|------|---------|
| `resources/icon.png` | 1024×1024, opaque | iOS icons (all sizes) |
| `resources/icon-foreground.png` | 1024×1024, transparent | Android adaptive icon foreground |
| `resources/icon-background.png` | 1024×1024, solid emerald | Android adaptive icon background |
| `resources/splash.png` | 2732×2732 | Splash screen (light + dark) |
| `resources/splash-dark.png` | 2732×2732 | Splash screen dark mode |

Run `@capacitor/assets` to generate every platform-specific size into `ios/` and `android/`:

```bash
npx @capacitor/assets generate
```

This writes icons to `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/mipmap-*/`. Run it after `npx cap add ios` and
`npx cap add android`, and re-run it any time the source icon changes.

### 5. Apply permission strings, privacy manifest & deep-link config

Run the included automation script once after each `npx cap add ios/android`:

```bash
chmod +x mobile/apply-native-config.sh
./mobile/apply-native-config.sh
```

The script (`mobile/apply-native-config.sh`) uses Python's `plistlib` and string
manipulation to make all required changes idempotently:

**iOS — what it wires in:**
| Destination | Change |
|-------------|--------|
| `ios/App/App/Info.plist` | `NSMicrophoneUsageDescription` (en/id/ms), `NSLocationWhenInUseUsageDescription` (en/id/ms), `UIBackgroundModes` (remote-notification, audio), `CFBundleURLTypes` (istiqoma:// scheme) |
| `ios/App/App/PrivacyInfo.xcprivacy` | Full Apple privacy manifest (data types: email, name, user content, audio, location, device ID, product interaction, user ID; `NSPrivacyTracking = false`) |
| `ios/App/App/{en,id,ms}.lproj/InfoPlist.strings` | Localized usage descriptions in English, Bahasa Indonesia, and Bahasa Melayu |

Source templates (human-readable, committed in git):
- `mobile/ios/Info.plist.additions.xml` — documents every key added
- `mobile/ios/PrivacyInfo.xcprivacy` — full privacy manifest XML
- `mobile/ios/InfoPlist.strings.{en,id,ms}` — localized usage strings

**Android — what it wires in:**
| Destination | Change |
|-------------|--------|
| `android/app/src/main/AndroidManifest.xml` | `INTERNET`, `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `VIBRATE` permissions; `istiqoma://` deep-link intent filter |
| `android/app/src/main/res/values/strings_istiqoma.xml` | English permission rationale strings |
| `android/app/src/main/res/values-id/strings_istiqoma.xml` | Indonesian permission rationale strings |
| `android/app/src/main/res/values-ms/strings_istiqoma.xml` | Malay permission rationale strings |

Source templates: `mobile/android/permissions.xml` and `mobile/android/strings.xml.{en,id,ms}`

**Splash screen** — the React app already calls `SplashScreen.hide({ fadeOutDuration: 200 })`
in `client/src/lib/capacitor.ts` → `initCapacitorPlugins()` on every native launch.
The splash configuration in `capacitor.config.ts` sets the background color to
`#0a0a0a` and the spinner color to `#10b981` (emerald) to match the brand.

### 6. Copy the web build into the native projects

```bash
npx cap sync
```

---

## Daily development workflow

```bash
# Build web + sync to native projects (calls vite build + cap sync)
npm run mobile:sync

# Open in Xcode (then Run from Xcode's toolbar)
npm run mobile:open:ios

# Open in Android Studio (then Run from the menu)
npm run mobile:open:android
```

Or to run directly on a connected device / simulator without opening the IDE:

```bash
npm run mobile:ios       # builds, syncs, runs on booted iOS simulator / connected iPhone
npm run mobile:android   # builds, syncs, runs on Android emulator / connected device
```

### Why mobile builds never include Replit dev-only plugins

`vite.config.ts` conditionally loads the Replit dev banner and Cartographer plugins only
when **both** `NODE_ENV !== "production"` **and** `REPL_ID !== undefined` are true:

```ts
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [devBanner(), cartographer()]
  : [])
```

`npm run mobile:sync` calls `npm run build`, which runs `tsx script/build.ts` with
`NODE_ENV=production` (set by the build script). This means `REPL_ID` is irrelevant —
`NODE_ENV=production` alone prevents the dev-only plugins from loading. The bundled
`dist/public/` output that Capacitor copies into the native shells is always clean
production output.

---

## Bundle ID and Display Name

| Field | Value |
|---|---|
| Bundle ID | `com.istiqoma.app` |
| Display Name | `Istiqoma` |
| Web scheme (iOS) | `istiqoma://` |

These are set in `capacitor.config.ts`. Changing them after the first Xcode/Android Studio build
requires also updating the values inside the native project files.

---

## Push Notifications (APNs + FCM)

Native push notifications require platform-specific credentials. Without them the app still works —
reminders just won't fire on iOS/Android (web VAPID push is unaffected).

### iOS — APNs (Authentication Key method)

1. In [Apple Developer Portal](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
   → **Keys**, create a new key with **Apple Push Notifications service (APNs)** enabled.
2. Download the `.p8` file. It can only be downloaded once — keep it safe.
3. Note your **Key ID** (10 chars) and **Team ID** (10 chars, shown in the top-right of the portal).
4. In Xcode → **Signing & Capabilities**, add the **Push Notifications** capability.
5. Set the following environment variables (server-side secrets):

| Secret | Value |
|---|---|
| `APNS_KEY_ID` | 10-char key ID from the portal |
| `APNS_TEAM_ID` | 10-char team ID |
| `APNS_BUNDLE_ID` | `com.istiqoma.app` (default) |
| `APNS_KEY_P8` | Full PEM contents of the `.p8` file (multi-line, include `-----BEGIN...` / `-----END...` headers) |
| `APNS_ENV` | `production` (or `sandbox` for development builds) |

### Android — FCM HTTP v1

1. In [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings**
   → **Service Accounts** → **Generate new private key**. Download the JSON file.
2. Add `google-services.json` to `android/app/` (generated by `npx cap add android`).
3. In Android Studio, ensure the **Firebase Cloud Messaging** dependency is present (Capacitor
   adds this automatically when `@capacitor/push-notifications` is installed and synced).
4. Set the following environment variable (server-side secret):

| Secret | Value |
|---|---|
| `FCM_SERVICE_ACCOUNT_JSON` | Full JSON contents of the service account key file |

### How push dispatch works

The server scheduler (`server/pushNotifications.ts`, `server/sholatReminders.ts`) iterates all
rows in `push_subscriptions`. Each row has a `platform` column (`web` | `ios` | `android`):

- **web** → VAPID Web Push via `web-push` npm package (existing path, unchanged)
- **ios** → APNs HTTP/2 via Node built-in `http2` + JWT token auth (`server/nativePush.ts`)
- **android** → FCM HTTP v1 via `fetch` + service-account OAuth2 token (`server/nativePush.ts`)

A single user can have all three rows simultaneously (web browser + iPhone + Android).
Notification preferences (daily reminder time, timezone, sholat reminders, etc.) are shared
across all platforms for each user.

The Capacitor client registers for native push via the `useNativePush` hook (`client/src/hooks/use-native-push.ts`),
which:
1. Calls `PushNotifications.requestPermissions()` on first mount.
2. On permission granted, calls `PushNotifications.register()`.
3. Receives the APNs/FCM token in the `registration` event and POSTs it to
   `POST /api/push/native-register`.
4. Listens for `pushNotificationActionPerformed` to deep-link into the correct page
   when the user taps a notification (uses the `url` field in the notification data).

---

## Native OAuth Flows (Google Sign-In + Quran Foundation)

Both Replit Auth (OIDC / Google SSO) and the Quran Foundation User API use full-page
browser redirects. WKWebView (iOS) and Capacitor WebView (Android) do **not** share
session cookies with the system browser, so both flows run via `@capacitor/browser`
(SFSafariViewController on iOS, Chrome Custom Tab on Android):

1. **Replit Auth / Google SSO** — client opens `Browser.open("/api/login?native=1")`.
   After OIDC completes, the server redirects to `istiqoma://auth/done?token=<t>`.
   `App.addListener("appUrlOpen")` receives the token, the app calls
   `GET /api/auth/native-session?token=<t>` from the WebView to plant the session
   cookie, then invalidates `/api/auth/user`.

2. **QF Connect** — client calls authenticated `GET /api/qf/connect-native` from the
   WebView, receives a JSON `{ url }`, opens it via `Browser.open(url)`. After the
   QF consent page, the server redirects to `istiqoma://qf/done`. The app invalidates
   `/api/qf/status` and `/api/quran/bookmarks`.

### iOS — no extra setup needed

The `ios.scheme: "istiqoma"` in `capacitor.config.ts` already registers `istiqoma://`
as a custom URL scheme in `Info.plist`. SFSafariViewController will hand off
`istiqoma://` URLs to the app automatically.

### Android — register the intent filter

Chrome Custom Tabs cannot redirect to a custom scheme unless the scheme is registered
as an Android intent filter. After running `npx cap add android`, add the following
`<intent-filter>` inside the `<activity>` element in
`android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:label="Istiqoma OAuth Callback">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="istiqoma" />
</intent-filter>
```

This lets the OS route `istiqoma://auth/done` and `istiqoma://qf/done` back into
the app after the system browser completes.

---

## Store Metadata

Pre-written store listing copy (titles, descriptions, keywords, what's new) is in
`mobile/store-metadata/`:

| File | Language |
|------|----------|
| `en.json` | English |
| `id.json` | Bahasa Indonesia |
| `ms.json` | Bahasa Melayu |

Each file contains: `app_name`, `apple_subtitle` (30 chars), `short_description` (80 chars),
`long_description` (up to 4000 chars), `keywords_apple` (100 chars, comma-separated),
`whats_new`, `category_primary`, `category_secondary`, and URLs for privacy / support /
marketing pages.

Store screenshots (pre-processed to required resolutions) are in
`mobile/store-metadata/screenshots/`:

| Subdirectory | Sizes | Destination |
|---|---|---|
| `ios/` | 1290×2796 (6.7"), 1242×2208 (5.5") | App Store Connect |
| `android/` | 1080×1920 (phone) | Google Play Console |

See `mobile/store-metadata/screenshots/README.md` for regeneration instructions
and notes about iPad and tablet screenshots (require Simulator captures).

---

## Safe areas

The web build uses `env(safe-area-inset-*)` CSS variables for iOS notch/Dynamic Island and
Android gesture-navigation bar padding. These are set in `client/src/index.css` under the
`.native-safe-area` class applied by `client/src/main.tsx` when running inside Capacitor.

---

## Signing (for store submission)

See the downstream store-submission task for signing certificates, provisioning
profiles, and store listing setup.

For iOS: generate a Distribution Certificate and App Store provisioning profile in
Apple Developer → Certificates, Identifiers & Profiles, then set them in Xcode →
Signing & Capabilities.

For Android: generate a signing keystore (`keytool -genkeypair …`), add it to
`android/app/build.gradle` under `signingConfigs`, and build with `./gradlew bundleRelease`.
