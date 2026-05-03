/**
 * E2E test plan for the Qur'an memorization mode (Task #115).
 *
 * Like the other specs in this directory, this file is consumed by the
 * agent's testing skill (which drives a Playwright-based runner). It also
 * works as-is when imported by a vanilla `@playwright/test` runner.
 *
 * Covers:
 *   1. Toggling memorization mode reveals the apply-to-all controls and the
 *      per-verse display-mode toggles + recording controls; toggling back
 *      hides them.
 *   2. Switching display modes per verse: full -> firstLast -> hidden, and
 *      verifying the verse text region swaps between
 *      `text-arabic-{n}` (full), `text-arabic-firstlast-{n}` (firstLast),
 *      and `button-reveal-{n}` (hidden).
 *   3. The apply-to-all toggle group sets the same display mode on every
 *      verse at once.
 *   4. Peeking a hidden verse reveals the full text + a re-hide button,
 *      and tapping re-hide restores the placeholder.
 *   5. Marking a verse as memorized persists across reload (it round-trips
 *      through the `/api/quran/memorizations` endpoint), and unmarking it
 *      removes the badge after another reload.
 *   6. Recording controls (record / stop / play / delete) appear only in
 *      memorization mode and disappear when memorization mode is exited.
 *
 * Surah 112 (Al-Ikhlas, 4 verses) is used as the test target because it is
 * short, never starts with the bismillah header (id !== 1, !== 9 still
 * applies — we just want a small surah for fast iteration).
 */
import { expect, test } from "@playwright/test";

const SURAH_ID = 112; // Al-Ikhlas, 4 verses

test.describe("Qur'an memorization mode", () => {
  test.beforeEach(async ({ page }) => {
    // Auth — driven by the testReplitAuth helper / OIDC mock when running
    // through the Replit testing skill.
    await page.goto("/");
    await page.getByTestId("button-login").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    await page.goto(`/quran/${SURAH_ID}`);
    await expect(page.getByTestId("text-surah-title")).toBeVisible();
    // Wait for at least one verse to render before we start interacting.
    await expect(page.getByTestId("verse-1")).toBeVisible();
  });

  test("toggling memorization mode shows / hides the controls", async ({
    page,
  }) => {
    // Off by default: no apply-to-all panel and no per-verse mode toggles.
    await expect(page.getByTestId("panel-memorization-controls")).toBeHidden();
    await expect(page.getByTestId("button-mode-full-1")).toBeHidden();
    await expect(page.getByTestId("button-record-1")).toBeHidden();

    // Turn it on.
    await page.getByTestId("button-toggle-memorization").click();
    await expect(page.getByTestId("panel-memorization-controls")).toBeVisible();
    await expect(page.getByTestId("button-mode-full-1")).toBeVisible();
    await expect(page.getByTestId("button-mode-firstlast-1")).toBeVisible();
    await expect(page.getByTestId("button-mode-hidden-1")).toBeVisible();
    await expect(page.getByTestId("button-record-1")).toBeVisible();

    // Default per-verse mode is "firstLast".
    await expect(page.getByTestId("text-arabic-firstlast-1")).toBeVisible();
    await expect(page.getByTestId("text-arabic-1")).toBeHidden();

    // Turn it back off.
    await page.getByTestId("button-toggle-memorization").click();
    await expect(page.getByTestId("panel-memorization-controls")).toBeHidden();
    await expect(page.getByTestId("button-mode-full-1")).toBeHidden();
    await expect(page.getByTestId("button-record-1")).toBeHidden();
    // And the verse text returns to fully visible.
    await expect(page.getByTestId("text-arabic-1")).toBeVisible();
  });

  test("switching display mode per verse swaps the text region", async ({
    page,
  }) => {
    await page.getByTestId("button-toggle-memorization").click();

    // Default firstLast → switch verse 1 to "hidden": placeholder appears.
    await page.getByTestId("button-mode-hidden-1").click();
    await expect(page.getByTestId("button-reveal-1")).toBeVisible();
    await expect(page.getByTestId("text-arabic-firstlast-1")).toBeHidden();
    await expect(page.getByTestId("text-arabic-1")).toBeHidden();

    // Switch to "full": full Arabic text shows.
    await page.getByTestId("button-mode-full-1").click();
    await expect(page.getByTestId("text-arabic-1")).toBeVisible();
    await expect(page.getByTestId("button-reveal-1")).toBeHidden();

    // Switch back to "firstLast": placeholder boxes around the words.
    await page.getByTestId("button-mode-firstlast-1").click();
    await expect(page.getByTestId("text-arabic-firstlast-1")).toBeVisible();
    await expect(page.getByTestId("text-arabic-1")).toBeHidden();

    // Other verses are unaffected (still default firstLast).
    await expect(page.getByTestId("text-arabic-firstlast-2")).toBeVisible();
  });

  test("apply-to-all sets the same display mode on every verse", async ({
    page,
  }) => {
    await page.getByTestId("button-toggle-memorization").click();

    // Apply "hidden" to all verses → every verse now shows a reveal button.
    await page.getByTestId("button-apply-all-hidden").click();
    for (const n of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`button-reveal-${n}`)).toBeVisible();
    }

    // Apply "full" to all verses → every verse now shows full Arabic.
    await page.getByTestId("button-apply-all-full").click();
    for (const n of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`text-arabic-${n}`)).toBeVisible();
      await expect(page.getByTestId(`button-reveal-${n}`)).toBeHidden();
    }

    // Apply "firstLast" → every verse goes back to the placeholder words.
    await page.getByTestId("button-apply-all-first-last").click();
    for (const n of [1, 2, 3, 4]) {
      await expect(
        page.getByTestId(`text-arabic-firstlast-${n}`),
      ).toBeVisible();
    }
  });

  test("peeking a hidden verse reveals it and re-hide restores it", async ({
    page,
  }) => {
    await page.getByTestId("button-toggle-memorization").click();
    await page.getByTestId("button-mode-hidden-1").click();

    // Hidden state: only the reveal button is shown.
    await expect(page.getByTestId("button-reveal-1")).toBeVisible();
    await expect(page.getByTestId("text-arabic-1")).toBeHidden();
    await expect(page.getByTestId("button-rehide-1")).toBeHidden();

    // Tap to peek → full Arabic visible + re-hide button appears.
    await page.getByTestId("button-reveal-1").click();
    await expect(page.getByTestId("text-arabic-1")).toBeVisible();
    await expect(page.getByTestId("button-rehide-1")).toBeVisible();

    // Tap re-hide → back to the placeholder.
    await page.getByTestId("button-rehide-1").click();
    await expect(page.getByTestId("button-reveal-1")).toBeVisible();
    await expect(page.getByTestId("text-arabic-1")).toBeHidden();
    await expect(page.getByTestId("button-rehide-1")).toBeHidden();
  });

  test("marking a verse as memorized persists across reload", async ({
    page,
  }) => {
    // Start clean: ensure verse 1 is not already memorized. If it is, the
    // toggle handler will treat the click as "unmark" and break the test,
    // so DELETE first.
    await page.request.delete(`/api/quran/memorizations/${SURAH_ID}/1`);
    await page.reload();
    await expect(page.getByTestId("verse-1")).toBeVisible();
    await expect(page.getByTestId("badge-memorized-1")).toBeHidden();

    // Mark verse 1 as memorized.
    await page.getByTestId("button-memorize-1").click();
    await expect(page.getByTestId("badge-memorized-1")).toBeVisible();

    // Reload and verify the badge persists (it round-trips through the
    // backend's /api/quran/memorizations endpoint).
    await page.reload();
    await expect(page.getByTestId("verse-1")).toBeVisible();
    await expect(page.getByTestId("badge-memorized-1")).toBeVisible();

    // Unmark and verify removal also persists.
    await page.getByTestId("button-memorize-1").click();
    await expect(page.getByTestId("badge-memorized-1")).toBeHidden();

    await page.reload();
    await expect(page.getByTestId("verse-1")).toBeVisible();
    await expect(page.getByTestId("badge-memorized-1")).toBeHidden();
  });

  test("recording controls only appear in memorization mode", async ({
    page,
  }) => {
    // Outside memorization mode: no record button.
    await expect(page.getByTestId("button-record-1")).toBeHidden();

    // Enter memorization mode → record button appears for every verse.
    await page.getByTestId("button-toggle-memorization").click();
    for (const n of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`button-record-${n}`)).toBeVisible();
    }
    // Stop / play / delete and the in-memory <audio> element only show up
    // once a recording exists, so they should be absent on first entry.
    await expect(page.getByTestId("button-stop-record-1")).toBeHidden();
    await expect(page.getByTestId("button-play-record-1")).toBeHidden();
    await expect(page.getByTestId("button-delete-record-1")).toBeHidden();
    await expect(page.getByTestId("audio-record-1")).toBeHidden();

    // Exit memorization mode → record buttons disappear again.
    await page.getByTestId("button-toggle-memorization").click();
    for (const n of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`button-record-${n}`)).toBeHidden();
    }
  });
});
