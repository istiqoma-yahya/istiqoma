/**
 * E2E test plan for the opt-in target recommendations flow (Task #78).
 *
 * This file documents the end-to-end scenario expected to pass for the
 * recommendations feature. The repo doesn't have a Playwright runner wired
 * into `package.json` yet, so this spec is consumed by the agent's testing
 * skill (which drives a Playwright-based runner). When a Playwright test
 * runner is added, this file works as-is by importing `@playwright/test`.
 *
 * Covers:
 *   1. Authenticated user lands on /targets/new and sees the entry card.
 *   2. Tapping "See suggestions" opens the bottom sheet, which fetches a
 *      fresh set of recommendations from the backend each time.
 *   3. Tapping a recommendation reveals a preview that explicitly renders
 *      the full proposal: name, category, amount, period, recurrence,
 *      Arabic text, translation, and citation.
 *   4. Tapping "Use this target" navigates to the Create Target page with
 *      the name AND the amount fields prefilled from the recommendation.
 */
import { expect, test } from "@playwright/test";

test.describe("Target recommendations", () => {
  // The first test asserts the empty Targets page state, so wipe any leftover
  // targets from prior runs of the same persisted test user before each test.
  test.beforeEach(async ({ request, baseURL }) => {
    const headers = { Origin: baseURL ?? "" };
    const list = await request.get("/api/targets", { headers });
    if (!list.ok()) return;
    const targets = (await list.json()) as Array<{ id: string }>;
    for (const t of targets) {
      await request.delete(`/api/targets/${t.id}`, { headers });
    }
  });

  test("empty Targets state -> recommendations -> preview -> use target -> form prefilled", async ({ page }) => {
    // Auth is provided by Playwright `storageState` (see
    // `tests/e2e/global-setup.ts`).
    // 1. Empty Targets page surfaces the entry card and the open button.
    await page.goto("/targets");
    await expect(page.getByTestId("card-recommendations-entry-targets-empty")).toBeVisible();

    // 2. Open the sheet from the empty state — fetches fresh recommendations.
    await page.getByTestId("button-open-recommendations-targets-empty").click();
    await expect(page.getByTestId("sheet-recommendations")).toBeVisible();
    await expect(page.getByTestId("state-recommendations-loading")).toBeVisible();
    await expect(page.getByTestId("list-recommendations")).toBeVisible({ timeout: 90_000 });
    const firstCard = page.locator('[data-testid^="card-recommendation-"]').first();
    await expect(firstCard).toBeVisible();

    // 3. Open the preview — must show the full proposal breakdown
    await firstCard.click();
    await expect(page.getByTestId("text-recommendation-preview-title")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-preview-name")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-preview-period")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-preview-recurrence")).toBeVisible();
    await expect(page.getByTestId("badge-recommendation-recurrence")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-arabic")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-translation")).toBeVisible();
    await expect(page.getByTestId("text-recommendation-reference")).toBeVisible();

    // Capture the recommended amount from the badge so we can assert prefill.
    const amountBadgeText = (await page.getByTestId("badge-recommendation-amount").textContent()) || "";
    const recommendedAmount = (amountBadgeText.match(/\d+/) || [""])[0];
    expect(recommendedAmount).not.toEqual("");

    // 4. Use this target → navigates to /targets/new?recommendation=<id>
    //    with the form prefilled.
    await page.getByTestId("button-use-recommendation").click();
    await page.waitForURL(/\/targets\/new\?recommendation=/);

    const nameValue = await page.getByTestId("input-target-name").inputValue();
    expect(nameValue.trim().length).toBeGreaterThan(0);

    const targetValueValue = await page.getByTestId("input-target-value").inputValue();
    expect(targetValueValue).toEqual(recommendedAmount);
  });

  test("each open of the sheet fetches a fresh batch (no result caching)", async ({ page }) => {
    await page.goto("/targets/new");
    await page.getByTestId("button-open-recommendations-create-target").click();
    await expect(page.getByTestId("list-recommendations")).toBeVisible({ timeout: 90_000 });

    // Close the sheet by pressing Escape (Radix dismiss).
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sheet-recommendations")).toBeHidden();

    // Reopen — must show the loading skeleton again, which proves we're
    // calling the backend fresh instead of reusing previous results.
    await page.getByTestId("button-open-recommendations-create-target").click();
    await expect(page.getByTestId("state-recommendations-loading")).toBeVisible();
  });
});
