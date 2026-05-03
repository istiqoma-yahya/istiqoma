/**
 * E2E test plan for the auth method chooser on the signed-out landing page
 * (Task #105).
 *
 * Like the other specs in this directory, this file is consumed by the
 * agent's testing skill (which drives a Playwright-based runner). It also
 * works as-is when imported by a vanilla `@playwright/test` runner.
 *
 * Covers:
 *   1. The signed-out landing page surfaces the auth chooser with both
 *      "Continue with Google" and "Continue with Username & PIN" visible.
 *   2. Clicking the navbar "Login" button reveals/scrolls to the chooser
 *      (both options remain visible and clickable).
 *   3. The Google option triggers the SSO redirect to `/api/login`.
 *   4. The Username & PIN option navigates to `/login/username` and the
 *      Sign In / Sign Up tabs are intact.
 *   5. The back arrow on the username page returns the user to the
 *      landing chooser.
 */
import { expect, test } from "@playwright/test";

test.describe("Auth method chooser", () => {
  test("signed-out landing page shows the chooser with both options", async ({
    page,
  }) => {
    await page.goto("/");

    // Chooser is rendered inline on the landing hero.
    await expect(page.getByTestId("auth-chooser")).toBeVisible();
    await expect(page.getByTestId("button-chooser-google")).toBeVisible();
    await expect(page.getByTestId("button-chooser-username")).toBeVisible();
  });

  test("clicking navbar Login keeps the chooser with both options visible", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("button-login").click();

    // The Login control scrolls to / focuses the chooser; both options
    // must remain visible after the interaction.
    await expect(page.getByTestId("auth-chooser")).toBeVisible();
    await expect(page.getByTestId("button-chooser-google")).toBeVisible();
    await expect(page.getByTestId("button-chooser-username")).toBeVisible();
  });

  test("Google option triggers the SSO redirect to /api/login", async ({
    page,
  }) => {
    await page.goto("/");

    // /api/login is a server redirect to the OIDC provider. We don't want
    // the test to actually leave the app, so intercept the request and
    // assert it was made.
    const loginRequest = page.waitForRequest((req) =>
      req.url().endsWith("/api/login"),
    );
    await page.route("**/api/login", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );

    await page.getByTestId("button-chooser-google").click();
    const req = await loginRequest;
    expect(req.url()).toMatch(/\/api\/login$/);
  });

  test("Username & PIN option navigates to /login/username with tabs intact", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("button-chooser-username").click();
    await page.waitForURL(/\/login\/username$/);

    await expect(page.getByTestId("text-username-login-title")).toBeVisible();
    await expect(page.getByTestId("tab-signin")).toBeVisible();
    await expect(page.getByTestId("tab-signup")).toBeVisible();

    // Sign In is the default tab; switching to Sign Up reveals the
    // signup form, confirming both tabs work.
    await expect(page.getByTestId("form-signin")).toBeVisible();
    await page.getByTestId("tab-signup").click();
    await expect(page.getByTestId("form-signup")).toBeVisible();
  });

  test("sticky 'Begin Your Journey' CTA reveals the chooser with both options", async ({
    page,
  }) => {
    await page.goto("/");

    // The sticky header (with the Login + Begin Your Journey CTAs) only
    // appears once the user has scrolled past the hero (~400px).
    await page.evaluate(() => window.scrollTo({ top: 800 }));
    await expect(page.getByTestId("sticky-button-start-tracking")).toBeVisible();

    await page.getByTestId("sticky-button-start-tracking").click();

    // CTA scrolls to the inline chooser; both options must remain visible.
    await expect(page.getByTestId("auth-chooser")).toBeVisible();
    await expect(page.getByTestId("button-chooser-google")).toBeVisible();
    await expect(page.getByTestId("button-chooser-username")).toBeVisible();
  });

  test("back arrow on the username page returns to the landing chooser", async ({
    page,
  }) => {
    await page.goto("/login/username");
    await expect(page.getByTestId("text-username-login-title")).toBeVisible();

    await page.getByTestId("button-back").click();
    await page.waitForURL((url) => url.pathname === "/");

    await expect(page.getByTestId("auth-chooser")).toBeVisible();
    await expect(page.getByTestId("button-chooser-google")).toBeVisible();
    await expect(page.getByTestId("button-chooser-username")).toBeVisible();
  });
});
