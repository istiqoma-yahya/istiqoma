# Building Istiqoma for iOS and Android

Istiqoma uses [Capacitor](https://capacitorjs.com/) to wrap the existing React/Vite web app into
native iOS and Android shells. The Capacitor config is in `capacitor.config.ts` at the project root.

---

## Prerequisites

| Tool | Required for |
|---|---|
| Node.js 18+ | Always |
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

### 4. Copy the web build into the native projects

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

## Known issues in the native shell (separate tasks)

| Issue | Planned fix |
|---|---|
| Google sign-in / Replit Auth redirects fail | Task #278 — Native OAuth flow via in-app browser |
| Web Push (VAPID) not supported on iOS native | Task #277 — Switch to APNs + FCM |
| App icons are the default Capacitor icon | Task #279 — Mobile app assets |

---

## Safe areas

The web build uses `env(safe-area-inset-*)` CSS variables for iOS notch/Dynamic Island and
Android gesture-navigation bar padding. These are set in `client/src/index.css` under the
`.native-safe-area` class applied by `client/src/main.tsx` when running inside Capacitor.

---

## Signing (for store submission)

See Task #280 (Submit to App Store and Play Store) for signing certificates, provisioning
profiles, and store listing setup.

For iOS: generate a Distribution Certificate and App Store provisioning profile in
Apple Developer → Certificates, Identifiers & Profiles, then set them in Xcode →
Signing & Capabilities.

For Android: generate a signing keystore (`keytool -genkeypair …`), add it to
`android/app/build.gradle` under `signingConfigs`, and build with `./gradlew bundleRelease`.
