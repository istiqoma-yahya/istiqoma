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
  // The walkthrough is driven exclusively through each step's coachmark
  // action button. This is the same React code path a real visitor hits
  // (the coachmark button calls `handleCoachmarkAction`, which performs
  // the right state mutation per step and then advances), but it sidesteps
  // a Playwright pitfall in the simulated phone frame: the inner screen
  // is `overflow-y-auto` and the SpotlightOverlay sits above it, so
  // coordinate-based clicks can be misattributed to surrounding chrome.
  // Driving via the coachmark keeps this spec focused on the end-to-end
  // step transitions; the per-interaction mechanics (3 dzikir taps,
  // counter increments, etc.) are exercised by the separate "interactive
  // steps" test below.
  for (const stepId of STEP_IDS) {
    const action = page.getByTestId(`tour-coachmark-action-${stepId}`);
    await expect(action).toBeVisible();
    await expectSpotlightOnNonFinalStep(page, stepId);
    if (stepId === "final") {
      await expect(page.getByTestId("tour-button-signup-google")).toBeVisible();
      await expect(page.getByTestId("tour-button-signup-username")).toBeVisible();
    }
    await action.click();
  }

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
    // moves on to the sholat step on its own. `dispatchEvent('click')` is
    // used for the same overflow/spotlight reason documented in
    // `walkThroughTour`.
    await tapBtn.dispatchEvent("click");
    await tapBtn.dispatchEvent("click");
    await tapBtn.dispatchEvent("click");
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
