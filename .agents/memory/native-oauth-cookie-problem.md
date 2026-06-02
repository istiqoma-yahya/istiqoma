---
name: Native OAuth cookie problem
description: WKWebView (iOS) and Chrome WebView (Android) do not share session cookies with SFSafariViewController / Chrome Custom Tab. OIDC and QF OAuth must use the exchange-token pattern.
---

## The Rule

Never navigate `window.location.href = "/api/login"` inside a Capacitor WebView. The OIDC callback will set a session cookie in the system browser's cookie jar, not in the WebView's. The app will appear to log in but subsequent API requests from the WebView get 401.

## The Solution (implemented)

**For Replit Auth (OIDC / Google SSO):**
1. Client opens `Browser.open("/api/login?native=1")` via `@capacitor/browser`.
2. Server stores `nativeOAuth=true` in the session so `/api/callback` knows.
3. After passport authenticates, `/api/callback` generates a 5-min one-time exchange token, redirects to `istiqoma://auth/done?token=<t>`.
4. `App.addListener("appUrlOpen")` receives the token. Client calls `GET /api/auth/native-session?token=<t>` from the WebView (with `credentials: "include"`). Server calls `req.login()`, setting the session cookie in the WebView's HTTP context.
5. Client invalidates `/api/auth/user` query.

**For QF Connect:**
1. Client (already authenticated in WebView) fetches `GET /api/qf/connect-native` with `credentials: "include"` — gets back `{ url }`.
2. Client opens the URL via `Browser.open()`.
3. QF callback at `/api/qf/callback` checks `nativeQfPkceStore` (server-side Map keyed by state, TTL 10 min) first — no session needed. On success, redirects to `istiqoma://qf/done`.
4. Client invalidates `/api/qf/status` and `/api/quran/bookmarks`.

**For session-expired 401s on native:**
`triggerSessionExpiredRedirect()` in `queryClient.ts` dispatches `istiqoma:reauth-needed` CustomEvent instead of navigating. `useNativeAuth` hook listens for it and opens the system browser.

## Why

- WKWebView and SFSafariViewController have separate cookie jars (iOS Privacy sandbox).
- The exchange token approach is safe: it's one-time use, 5-min TTL, stored server-side.
- The OIDC and QF callback URLs registered with upstream providers are unchanged — the native hop is a server-side redirect AFTER those callbacks.

## Key Files

- `server/replit_integrations/auth/replitAuth.ts` — exchange token store, `/api/auth/native-session`
- `server/qf-user.ts` — `nativeQfPkceStore`, `/api/qf/connect-native`, modified `/api/qf/callback`
- `client/src/hooks/use-native-auth.ts` — `appUrlOpen` handler + `istiqoma:reauth-needed` listener
- `client/src/lib/native-login.ts` — `openNativeLogin()`, `openNativeLoginWithProvider()`, `openNativeBrowser()`
- `mobile/BUILD.md` — Android intent filter setup instructions

## Android Extra Step

Chrome Custom Tabs can't redirect to a custom scheme without an intent filter registered in `AndroidManifest.xml`. After `npx cap add android`, add a `<data android:scheme="istiqoma" />` intent filter inside the main `<activity>`. See `mobile/BUILD.md` for the exact XML.

## iOS — No Extra Setup

`ios.scheme: "istiqoma"` in `capacitor.config.ts` already registers `istiqoma://` in `Info.plist`.
