import { chromium, request, type FullConfig } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

export const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  "playwright/.cache/storage-state.json",
);

export const TEST_USER = {
  username: process.env.E2E_TEST_USERNAME ?? "e2e_test_user",
  pin: process.env.E2E_TEST_PIN ?? "9182",
};

async function ensureSignedIn(baseURL: string) {
  const ctx = await request.newContext({ baseURL });
  const headers = { Origin: baseURL, "Content-Type": "application/json" };

  const signin = await ctx.post("/api/auth/username/signin", {
    headers,
    data: { username: TEST_USER.username, pin: TEST_USER.pin },
  });
  if (!signin.ok()) {
    const signup = await ctx.post("/api/auth/username/signup", {
      headers,
      data: {
        username: TEST_USER.username,
        pin: TEST_USER.pin,
        confirmPin: TEST_USER.pin,
      },
    });
    if (!signup.ok() && signup.status() !== 409) {
      const body = await signup.text();
      throw new Error(
        `[e2e] failed to create test user (${signup.status()}): ${body}`,
      );
    }
    if (signup.status() === 409) {
      const retry = await ctx.post("/api/auth/username/signin", {
        headers,
        data: { username: TEST_USER.username, pin: TEST_USER.pin },
      });
      if (!retry.ok()) {
        throw new Error(
          `[e2e] could not sign in existing test user (${retry.status()})`,
        );
      }
    }
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await ctx.storageState({ path: STORAGE_STATE_PATH });
  await ctx.dispose();
}

export default async function globalSetup(config: FullConfig) {
  const project = config.projects.find((p) => p.use?.baseURL);
  const baseURL =
    (project?.use?.baseURL as string | undefined) ??
    process.env.PLAYWRIGHT_BASE_URL ??
    `http://127.0.0.1:${process.env.PORT ?? 5000}`;

  await ensureSignedIn(baseURL);
}
