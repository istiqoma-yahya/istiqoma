// Verifies the Quran Foundation Content API integration end-to-end.
//
// This spec does not require any QF credentials to run: when
// QF_CONTENT_CLIENT_ID is unset on the server, the proxy in
// `server/qf-content.ts` transparently falls back to the legacy
// `api.quran.com/api/v4` upstream (same path shape, same response
// schema). Either way the contract — that hitting `/api/qf/content/<path>`
// returns JSON shaped like the QF v4 spec — is what the rest of the
// app depends on.
import { expect, test } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./global-setup";

// ─── API contract tests ───────────────────────────────────────────
// These exercise the proxy directly and run without authentication.
test.describe("Quran Foundation Content API proxy", () => {
  test("GET /api/qf/content/chapters returns the 114 surahs", async ({ request }) => {
    const res = await request.get("/api/qf/content/chapters?language=en");
    expect(res.ok(), `expected 2xx, got ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.chapters)).toBe(true);
    expect(body.chapters).toHaveLength(114);
    expect(body.chapters[0]).toMatchObject({
      id: 1,
      name_simple: expect.any(String),
      verses_count: 7,
    });
  });

  test("GET /api/qf/content/verses/by_chapter/1 returns Al-Fatiha verses with text_uthmani", async ({ request }) => {
    const res = await request.get(
      "/api/qf/content/verses/by_chapter/1?fields=text_uthmani&per_page=10",
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.verses)).toBe(true);
    // Al-Fatiha has 7 verses.
    expect(body.verses.length).toBeGreaterThanOrEqual(7);
    expect(body.verses[0]).toMatchObject({
      verse_key: "1:1",
      verse_number: 1,
      text_uthmani: expect.any(String),
    });
  });

  test("GET /api/qf/content/<unknown-path> is rejected with 404", async ({ request }) => {
    // The proxy is intentionally an allow-list of v4 paths so it cannot
    // be used as an open relay to arbitrary upstream resources.
    const res = await request.get("/api/qf/content/this/is/not/a/real/path");
    expect(res.status()).toBe(404);
  });
});

// ─── UI smoke tests ───────────────────────────────────────────────
// These load actual pages and assert that QF-sourced content is
// rendered correctly by the React client. Authentication is required
// because personal hooks (reading state, bookmarks, memorizations)
// call auth-gated API endpoints and redirect unauthenticated visitors
// to /api/login.
//
// data-testid conventions used by the components:
//   surah list cards  → "card-surah-<id>"     (SurahListCard component)
//   verse containers  → "verse-<verse_number>" (QuranSurahPage component)
test.describe("Quran reader UI (powered by QF Content API)", () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test("surah list page shows all 114 surahs", async ({ page }) => {
    await page.goto("/quran");
    // Wait for the surah list to finish loading.
    // Each surah card carries a data-testid of the form "card-surah-<id>".
    await page.waitForSelector('[data-testid^="card-surah-"]', { timeout: 15_000 });
    const cards = await page.locator('[data-testid^="card-surah-"]').count();
    expect(cards).toBe(114);

    // Al-Fatihah (surah 1) should be visible with its Arabic name.
    const first = page.locator('[data-testid="card-surah-1"]');
    await expect(first).toBeVisible();
    await expect(first).toContainText("Al-Fatihah");
  });

  test("surah reader for Al-Fatihah renders verses from QF", async ({ page }) => {
    await page.goto("/quran/1");
    // Wait for at least one verse to render.
    // Verse containers carry data-testid="verse-<verse_number>".
    await page.waitForSelector('[data-testid^="verse-"]', { timeout: 20_000 });
    const verses = await page.locator('[data-testid^="verse-"]').count();
    // Al-Fatihah has 7 verses.
    expect(verses).toBe(7);

    // The first verse element should be visible.
    const verse1 = page.locator('[data-testid="verse-1"]');
    await expect(verse1).toBeVisible();
    // The verse-number circle for verse 1 shows "1".
    await expect(verse1.locator('[aria-label*="1"]').first()).toBeVisible();
  });
});
