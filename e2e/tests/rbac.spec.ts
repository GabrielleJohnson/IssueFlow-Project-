import { test, expect } from "../fixtures";
import { e2eUser, prisma } from "../support/database";
import { E2E_USERS } from "../support/environment";
import { e2eName } from "../support/names";

test("Admin role changes require confirmation and cancel keeps the saved role", async ({ page, loginAs }) => {
  await loginAs("admin");
  await page.goto("/dashboard/users");

  const row = page.getByRole("row").filter({ hasText: E2E_USERS.roleTarget.username });
  const roleSelect = row.locator("select");
  await expect(roleSelect).toHaveValue("TESTER");

  await roleSelect.selectOption("DEVELOPER");
  const dialog = page.getByRole("dialog", { name: `Change ${E2E_USERS.roleTarget.username}'s role?` });
  await expect(dialog).toContainText("Tester");
  await expect(dialog).toContainText("Developer");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(roleSelect).toHaveValue("TESTER");

  await roleSelect.selectOption("DEVELOPER");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(roleSelect).toHaveValue("TESTER");

  await page.reload();
  await expect(row.locator("select")).toHaveValue("TESTER");
  await row.locator("select").selectOption("DEVELOPER");
  const developerResponse = page.waitForResponse((response) => response.url().includes(`/api/users/`) && response.url().endsWith("/role") && response.request().method() === "PATCH");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm Role Change" }).click();
  expect((await developerResponse).ok()).toBe(true);
  await expect(row.locator("select")).toHaveValue("DEVELOPER");
  await page.reload();
  await expect(row.locator("select")).toHaveValue("DEVELOPER");

  await row.locator("select").selectOption("TESTER");
  const testerResponse = page.waitForResponse((response) => response.url().includes(`/api/users/`) && response.url().endsWith("/role") && response.request().method() === "PATCH");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm Role Change" }).click();
  expect((await testerResponse).ok()).toBe(true);
  await expect(row.locator("select")).toHaveValue("TESTER");
});

test("Tester sees QA workspaces but cannot enter Admin user management", async ({ page, loginAs }) => {
  await loginAs("tester");
  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: "Test Cases", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Suites", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Runs", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Coverage", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Releases", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);

  await page.goto("/dashboard/users");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("Developer keeps restricted navigation and can advance an assigned defect", async ({ page, loginAs }, testInfo) => {
  const developer = await e2eUser("developer");
  const tester = await e2eUser("tester");
  const title = e2eName(testInfo, "Developer-Lifecycle");
  const issue = await prisma.issue.create({
    data: {
      title,
      description: "Synthetic defect for the Developer E2E lifecycle boundary.",
      environment: "Chromium E2E",
      steps_to_reproduce: "Open the assigned synthetic defect.",
      expected_result: "The workflow advances.",
      actual_result: "The workflow is still open.",
      severity: "HIGH",
      status: "OPEN",
      created_by: tester.id,
      assigned_to: developer.id
    }
  });

  await loginAs("developer");
  await page.goto("/dashboard");
  const navigation = page.getByRole("navigation");
  await expect(navigation.getByRole("link", { name: "Assigned Bugs", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Suites", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Runs", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Coverage", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Releases", exact: true })).toHaveCount(0);

  await page.goto("/dashboard/users");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/test-suites");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/requirements");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/releases");
  await expect(page).toHaveURL(/\/dashboard$/);

  const requirementResponse = await page.request.post("/api/requirements", { data: { title: "Forbidden Developer Requirement" } });
  expect(requirementResponse.status()).toBe(403);
  const releaseResponse = await page.request.post("/api/releases", { data: { name: "Forbidden Developer Release" } });
  expect(releaseResponse.status()).toBe(403);

  await page.goto(`/dashboard/issues/${issue.id}`);
  await page.getByRole("link", { name: "Update Status" }).click();
  await page.getByLabel("Bug status").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Update Status" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/issues/${issue.id}$`));
  await expect(page.getByText("In Progress", { exact: true }).first()).toBeVisible();
});
