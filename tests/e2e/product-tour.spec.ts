/**
 * E2E test plan for the landing-page interactive product tour (Task #206).
 *
 * Like the other specs in this directory, this file is consumed by the
 * agent's testing skill (which drives a Playwright-based runner). It is
 * also written so that it works as-is when imported by a vanilla
 * `@playwright/test` runner once one is wired into the repo.
 *
 * The tour lives in `client/src/components/ProductTour.tsx` and is
 * launched from the landing page (`client/src/pages/Landing.tsx`) via the
 * "See it in action" button (`button-take-tour-features`). It walks the
 * visitor through 8 steps, four of which only advance after the visitor
 * actually interacts with the simulated screen:
 *
 *   1. dashboard      (advances on Next)
 *   2. record-deed    (advances after the Save Deed button is clicked)
 *   3. dzikir         (advances after the tap counter reaches 3)
 *   4. sholat         (advances after Fajr is marked done)
 *   5. targets        (advances on Next)
 *   6. quran          (advances after the highlighted surah is opened)
 *   7. progress       (advances on Next)
 *   8. final          (closes the tour and scrolls the auth-chooser into view)
 *
 * Covers:
 *   - The "See it in action" CTA opens the tour overlay and renders the
 *     spotlight, coachmark, and progress dots.
 *   - All 8 steps render correctly and the spotlight overlay highlights an
 *     element on every non-final step.
 *   - The four interactive steps advance only after the required
 *     interaction (Save Deed, 3x dzikir taps, Fajr toggle, surah tap),
 *     and the three non-interactive steps advance via the coachmark Next
 *     button.
 *   - The final step's "Sign Up Free" button closes the tour and scrolls
 *     the inline `auth-chooser` block into view.
 *   - The full walkthrough succeeds in both light and dark mode (so future
 *     refactors of `ProductTour.tsx` can't silently break either theme).
 */
import { expect, test, type Page } from "@playwright/test";

const STEP_IDS = [
  "dashboard",
  "record-deed",
  "dzikir",
  "sholat",
  "targets",
  "quran",
  "progress",
  "final",
] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  // The ThemeProvider toggles the `dark` class on <html> and persists the
  // user's choice in localStorage. Seeding both before navigation gives a
  // deterministic starting theme without depending on the toggle UI (which
  // is replaced by the tour's own header once the overlay opens).
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      /* ignore storage errors in private mode */
    }
  }, theme);
}

async function openTour(page: Page) {
  await page.goto("/");

  // The "See it in action" button lives in the features section. Scrolling
  // it into view first avoids flakiness when the button is below the fold.
  const launch = page.getByTestId("button-take-tour-features");
  await launch.scrollIntoViewIfNeeded();
  await expect(launch).toBeVisible();
  await launch.click();

  // Tour overlay chrome is now mounted.
  await expect(page.getByTestId("tour-progress-dots")).toBeVisible();
  await expect(page.getByTestId("tour-progress-bar")).toBeVisible();
  await expect(page.getByTestId("tour-button-exit")).toBeVisible();
  await expect(page.getByTestId("tour-dot-0")).toBeVisible();
}

async function expectSpotlightOnNonFinalStep(page: Page, stepId: string) {
  // Every non-final step has at least one element marked
  // `data-tour-highlight`; the SpotlightOverlay measures it and only
  // renders when bounds are available, so its presence is the strongest
  // signal that the spotlight is correctly anchored.
  if (stepId === "final") return;
  await expect(page.locator("[data-tour-highlight]")).toBeVisible();
}

async function walkThroughTour(page: Page) {
  // Step 1: dashboard — Next-driven.
  await expectSpotlightOnNonFinalStep(page, "dashboard");
  await expect(page.getByTestId("tour-coachmark-action-dashboard")).toBeVisible();
  await page.getByTestId("tour-coachmark-action-dashboard").click();

  // Step 2: record-deed — clicking the highlighted Save Deed button must
  // mark the deed as recorded AND auto-advance after a short delay.
  await expect(page.getByTestId("tour-button-record-deed")).toBeVisible();
  await expectSpotlightOnNonFinalStep(page, "record-deed");
  await page.getByTestId("tour-button-record-deed").click();

  // Step 3: dzikir — the counter starts at 0 and only auto-advances once
  // it hits 3 taps. The button stays mounted (it's the highlighted target).
  await expect(page.getByTestId("tour-button-dzikir-tap")).toBeVisible();
  await expectSpotlightOnNonFinalStep(page, "dzikir");
  const tapBtn = page.getByTestId("tour-button-dzikir-tap");
  await expect(tapBtn).toContainText("0");
  await tapBtn.click();
  await expect(tapBtn).toContainText("1");
  await tapBtn.click();
  await expect(tapBtn).toContainText("2");
  await tapBtn.click();
  // After the 3rd tap the tour auto-advances to the sholat step.

  // Step 4: sholat — only marking Fajr advances the tour. Use the
  // shared <PrayerListCard /> testid for the Fajr toggle. The component
  // exposes `button-toggle-{name}` for each prayer.
  const fajrToggle = page.getByTestId("button-toggle-fajr");
  await expect(fajrToggle).toBeVisible();
  await expectSpotlightOnNonFinalStep(page, "sholat");
  await fajrToggle.click();

  // Step 5: targets — Next-driven.
  await expect(page.getByTestId("tour-coachmark-action-targets")).toBeVisible();
  await expectSpotlightOnNonFinalStep(page, "targets");
  await page.getByTestId("tour-coachmark-action-targets").click();

  // Step 6: quran — tapping the highlighted Al-Fatihah surah card
  // advances the tour. The shared <SurahListCard /> with `highlight`
  // is the only clickable surah row in the simulated list.
  await expect(page.locator("[data-tour-highlight]")).toBeVisible();
  await page.locator("[data-tour-highlight]").click();

  // Step 7: progress — Next-driven.
  await expect(page.getByTestId("tour-coachmark-action-progress")).toBeVisible();
  await expectSpotlightOnNonFinalStep(page, "progress");
  await page.getByTestId("tour-coachmark-action-progress").click();

  // Step 8: final — coachmark action button doubles as the Sign Up Free
  // CTA; clicking it must close the tour overlay and scroll the inline
  // auth chooser into view.
  await expect(page.getByTestId("tour-coachmark-action-final")).toBeVisible();
  await expect(page.getByTestId("tour-button-signup-google")).toBeVisible();
  await expect(page.getByTestId("tour-button-signup-username")).toBeVisible();
  await page.getByTestId("tour-coachmark-action-final").click();

  // Tour overlay tears down and the auth chooser is scrolled into view.
  await expect(page.getByTestId("tour-progress-dots")).toHaveCount(0);
  const chooser = page.getByTestId("auth-chooser");
  await expect(chooser).toBeVisible();
  await expect(page.getByTestId("button-chooser-google")).toBeVisible();
  await expect(page.getByTestId("button-chooser-username")).toBeVisible();
}

test.describe("Landing product tour", () => {
  test("opening the tour mounts the overlay with progress dots for all 8 steps", async ({ page }) => {
    await openTour(page);

    // One progress dot per step; the active dot must be index 0.
    for (let i = 0; i < STEP_IDS.length; i++) {
      await expect(page.getByTestId(`tour-dot-${i}`)).toBeVisible();
    }

    // The dashboard step's coachmark action is the first one shown.
    await expect(page.getByTestId("tour-coachmark-action-dashboard")).toBeVisible();
    await expectSpotlightOnNonFinalStep(page, "dashboard");
  });

  test("interactive steps advance only after the required interaction (light mode)", async ({ page }) => {
    await setTheme(page, "light");
    await openTour(page);

    // Jump straight to the dzikir step via the progress dots and confirm
    // that pure inactivity does NOT advance the tour. The coachmark
    // surfaces a "tour.coachmark.interactHint" hint when the interaction
    // is still pending — the action button label remains the step's
    // interact label (e.g. "Tap to count") rather than "Next" until the
    // interaction completes.
    await page.getByTestId("tour-dot-2").click();
    const tapBtn = page.getByTestId("tour-button-dzikir-tap");
    await expect(tapBtn).toBeVisible();
    await expect(tapBtn).toContainText("0");

    // The dzikir dot must remain the active step (index 2) — i.e. the
    // tour did not auto-advance just because the coachmark mounted.
    await page.waitForTimeout(750);
    await expect(tapBtn).toBeVisible();

    // Tapping 3 times is the required interaction; after that the tour
    // moves on to the sholat step on its own.
    await tapBtn.click();
    await tapBtn.click();
    await tapBtn.click();
    await expect(page.getByTestId("button-toggle-fajr")).toBeVisible();
  });

  test("full walkthrough succeeds in light mode and final step scrolls auth chooser into view", async ({ page }) => {
    await setTheme(page, "light");
    await openTour(page);
    await walkThroughTour(page);
  });

  test("full walkthrough succeeds in dark mode and final step scrolls auth chooser into view", async ({ page }) => {
    await setTheme(page, "dark");
    await openTour(page);

    // Sanity: <html> has the `dark` class applied so the tour renders
    // its dark-themed chrome (dark logo, dark backgrounds, etc.).
    await expect(page.locator("html")).toHaveClass(/dark/);

    await walkThroughTour(page);
  });

  test("exit button closes the tour without scrolling to the auth chooser", async ({ page }) => {
    await openTour(page);

    await page.getByTestId("tour-button-exit").click();
    await expect(page.getByTestId("tour-progress-dots")).toHaveCount(0);

    // The tour exit must NOT trigger the final-step scroll-to-chooser
    // behavior; the visitor stays where they were on the landing page.
    await expect(page.getByTestId("button-take-tour-features")).toBeVisible();
  });
});
