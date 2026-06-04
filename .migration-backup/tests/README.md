# End-to-end tests

The Playwright specs in `tests/e2e/` exercise key user flows in a real browser.

## Run locally

```bash
npm run test:e2e
```

By default the runner starts the dev server (`npm run dev`) on `PORT=5000`,
or reuses an existing server on that port. To point the suite at a server you
already have running, set `PLAYWRIGHT_SKIP_WEBSERVER=1`:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
```

To override the base URL:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5000 PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
```

To run a single file:

```bash
npx playwright test tests/e2e/auth-chooser.spec.ts
```

The first run on a fresh machine needs the Chromium browser binary
(`npx playwright install chromium`) plus its system dependencies (already
installed in this Repl via Nix).

## Specs

- `auth-chooser.spec.ts` — runs against the public landing page (no auth).
- `product-tour.spec.ts` — runs against the public landing page (no auth).
- `memorization-mode.spec.ts` — requires an authenticated user. Runs in
  the `authenticated` Playwright project, which loads a `storageState`
  produced by `tests/e2e/global-setup.ts`. The setup signs the persisted
  test user (`e2e_test_user`) in via the first-party
  `POST /api/auth/username/{signup,signin}` endpoints and saves the
  resulting session cookie, so no OIDC mock is needed.
- `recommendations.spec.ts` — same `authenticated` project / storage
  state as `memorization-mode.spec.ts`.
- `voice-recording-mini-player.spec.ts` — same `authenticated` project.
  Mocks `MediaRecorder` and `HTMLAudioElement.play/pause` so no real
  microphone or audio hardware is needed. Covers: player appearance with
  correct label, play/pause toggle aria-label state, verse-swap label
  update, close (×) hides the player, delete removes the player and the
  per-verse controls.

The agent's testing skill can still drive the same suites against a
stubbed Replit OIDC issuer via `runTest({ testReplitAuth: true })`; that
path is independent of the username-based bootstrap used here.
