import { test, expect } from "../fixtures";
import { E2E_USERS } from "../support/environment";

test("long account identity remains contained on narrow dashboards", async ({ page, loginAs }) => {
  await loginAs("longIdentity");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByTestId("signed-in-username")).toHaveText(E2E_USERS.longIdentity.username);
    await expect(page.getByTestId("signed-in-email")).toHaveText(E2E_USERS.longIdentity.email);

    const layout = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>("[data-testid='signed-in-card']")!;
      const username = document.querySelector<HTMLElement>("[data-testid='signed-in-username']")!;
      const email = document.querySelector<HTMLElement>("[data-testid='signed-in-email']")!;
      const role = document.querySelector<HTMLElement>("[data-testid='signed-in-role']")!;
      const cardRect = card.getBoundingClientRect();
      const usernameRect = username.getBoundingClientRect();
      const emailRect = email.getBoundingClientRect();
      const roleRect = role.getBoundingClientRect();
      const overlaps = !(emailRect.right <= roleRect.left || roleRect.right <= emailRect.left || emailRect.bottom <= roleRect.top || roleRect.bottom <= emailRect.top);

      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        cardContained: cardRect.left >= 0 && cardRect.right <= document.documentElement.clientWidth,
        usernameContained: usernameRect.left >= cardRect.left && usernameRect.right <= cardRect.right,
        emailContained: emailRect.left >= cardRect.left && emailRect.right <= cardRect.right,
        roleContained: roleRect.left >= cardRect.left && roleRect.right <= cardRect.right,
        overlaps
      };
    });

    expect(layout).toEqual({
      pageOverflow: false,
      cardContained: true,
      usernameContained: true,
      emailContained: true,
      roleContained: true,
      overlaps: false
    });
    await expect(page.getByRole("contentinfo")).toBeVisible();
  }
});

test("mobile navigation preserves role-aware access without overflow", async ({ page, loginAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs("tester");
  await page.goto("/dashboard");

  await expect(page.getByTestId("desktop-dashboard-navigation")).toBeHidden();
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(page.getByRole("button", { name: "Close navigation" }).first()).toHaveAttribute("aria-expanded", "true");

  const menu = page.getByTestId("mobile-dashboard-navigation");
  for (const label of ["Dashboard", "Bug Reports", "Test Cases", "Suites", "Runs", "Coverage", "Releases", "Analytics"]) {
    await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Logout" })).toBeVisible();

  await menu.getByRole("link", { name: "Coverage", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/requirements$/);
  await expect(page.getByTestId("mobile-dashboard-navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("mobile-dashboard-navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await loginAs("developer");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const developerMenu = page.getByTestId("mobile-dashboard-navigation");
  await expect(developerMenu.getByRole("link", { name: "Assigned Bugs", exact: true })).toBeVisible();
  await expect(developerMenu.getByRole("link", { name: "Coverage", exact: true })).toHaveCount(0);
  await expect(developerMenu.getByRole("link", { name: "Releases", exact: true })).toHaveCount(0);
  await expect(developerMenu.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
});

test("Developer mobile navigation highlights only the most specific Bug Report route", async ({ page, loginAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs("developer");

  await page.goto("/dashboard/issues/assigned");
  await page.getByRole("button", { name: "Open navigation" }).click();
  let menu = page.getByTestId("mobile-dashboard-navigation");
  await expect(menu.getByRole("link", { name: "Assigned Bugs", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: "Bug Reports", exact: true })).not.toHaveAttribute("aria-current", "page");

  await menu.getByRole("link", { name: "Bug Reports", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/issues$/);
  await page.getByRole("button", { name: "Open navigation" }).click();
  menu = page.getByTestId("mobile-dashboard-navigation");
  await expect(menu.getByRole("link", { name: "Bug Reports", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: "Assigned Bugs", exact: true })).not.toHaveAttribute("aria-current", "page");
});
