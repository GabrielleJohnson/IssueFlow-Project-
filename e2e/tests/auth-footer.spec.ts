import { test, expect } from "../fixtures";
import { E2E_PASSWORD, E2E_USERS } from "../support/environment";

test("guest protection and UI login/logout preserve the public boundary", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in to IssueFlow." })).toBeVisible();

  await page.getByLabel("Email").fill(E2E_USERS.tester.email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(E2E_USERS.tester.username, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("contentinfo")).toContainText("IssueFlow QA-focused issue tracking & test management.");

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("footer placement matches public, authenticated, and auth-page expectations", async ({ page, loginAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Built by Gabrielle Johnson · © 2026");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.goto("/login");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await page.goto("/register");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);

  await loginAs("tester");
  await page.goto("/dashboard");
  await expect(page.getByRole("contentinfo")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
