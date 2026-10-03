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
