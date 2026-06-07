---
name: PWA stale-client updates (Istiqoma)
description: Why a correctly-deployed web fix can still never reach an installed PWA, and the service-worker update path that fixes it.
---

# A deployed fix can be correct yet never reach an installed PWA

**Symptom pattern:** a bug is "fixed and published" but the user still sees it
ONLY in production, never in development; repeated re-deploys don't help.

**Why:** Istiqoma ships a service worker (`public/sw.js`) and is installable
(it has web push), so users run it as a home-screen PWA. An installed PWA loads
its JS once and almost never cold-starts. The SW registration originally had NO
update-and-reload path, so the running app kept executing the OLD bundle
indefinitely. Dev has no persistent SW (Vite serves fresh modules every load),
so dev always looked fixed. The give-away in deployment logs: the failing action
produced ZERO write requests (no POST/PUT/PATCH/DELETE) — the stale client was
blocking client-side before any network call, so the bug was never server-side
or DB-side.

**How to confirm it's a stale-client problem, not a code problem:**
- Deployment logs show only GETs for the failing flow, never the write.
- HEAD/lockfile/prod-build all contain the fix; publish happened after the fix
  commit. (i.e. the *deployed* bundle is provably correct.)
- It works in dev. → The user's running client is not the deployed bundle.

**The fix (in `main.tsx` + `sw.js`):**
1. `sw.js` already had `skipWaiting()` (install) + `clients.claim()` (activate).
2. Bump `CACHE_NAME` on every meaningful release so the SW file changes
   byte-wise — that is what makes the browser DETECT a new SW for already-
   installed clients (and `activate` purges the old app-shell cache).
3. In `main.tsx`, add a `controllerchange` listener that does ONE
   `window.location.reload()` (guard with `hadController` to skip the first-ever
   install, and a `refreshing` flag to avoid loops) so the open app swaps onto
   the new JS automatically.
4. Trigger update checks independent of the load event: register on
   `readyState==="complete"` else on `load`; also `serviceWorker.ready.then(r =>
   r.update())`, an hourly interval, and on `visibilitychange` (foreground).

**Unavoidable caveat — the FIRST transition needs one manual refresh:** the
currently-running OLD client does not contain any of the new auto-reload logic,
so it cannot auto-reload itself onto the first fixed bundle. The user must do
ONE hard refresh / fully close-and-reopen (or reinstall) the PWA once. After
that, all FUTURE deploys reach them automatically. Always tell the user this.

**If "production" is a native Capacitor app (App Store / TestFlight), none of
the above reaches them** — a web publish never rebuilds/redistributes a native
binary, and this repo has no `android`/`ios` project to rebuild. Disambiguate
the surface (browser vs installed PWA vs native app) before promising a fix.
