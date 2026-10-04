import { test, expect } from "../fixtures";
import type { Page } from "@playwright/test";

async function expectSectionAtHeader(page: Page, selector: string) {
  await expect.poll(async () => {
    return page.locator(selector).evaluate((section) => {
      const top = section.getBoundingClientRect().top;
      return top >= 50 && top <= 180;
    });
  }).toBe(true);
}

test("public landing CTAs stay on the homepage and reach their sections", async ({ page }) => {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await page.getByRole("link", { name: "View Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectSectionAtHeader(page, "#public-dashboard-preview");

  await page.goto("/");
  await page.getByRole("link", { name: "Explore Features" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectSectionAtHeader(page, "#test-cases");
});

test("public mobile navigation preserves auth access and preview scrolling", async ({ page }) => {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const login = page.getByRole("link", { name: "Login", exact: true });
  const register = page.getByRole("link", { name: "Register", exact: true });
  await expect(login).toBeVisible();
  await expect(register).toBeVisible();

  await page.getByRole("link", { name: "View Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectSectionAtHeader(page, "#public-dashboard-preview");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await login.click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
