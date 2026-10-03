import { expect, test as base, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS, type E2ERole } from "./support/environment";

type IssueFlowFixtures = {
  loginAs: (role: E2ERole) => Promise<void>;
};

export async function loginThroughApi(page: Page, role: E2ERole) {
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      email: E2E_USERS[role].email,
      password: E2E_PASSWORD
    }
  });

  expect(response.ok(), `API login failed for synthetic ${role} user`).toBeTruthy();
}

export const test = base.extend<IssueFlowFixtures>({
  loginAs: async ({ page }, provide) => {
    await provide(async (role) => loginThroughApi(page, role));
  }
});

export { expect };
