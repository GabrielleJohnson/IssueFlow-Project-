import { test, expect } from "../fixtures";
import { e2eName } from "../support/names";

test("Bug Report search, filters, clear, and Reset all stay synchronized", async ({ page, loginAs }, testInfo) => {
  const title = e2eName(testInfo, "Bug-Productivity");
  await loginAs("tester");
  await page.goto("/dashboard/issues/new");

  await page.getByLabel("Bug title").fill(title);
  await page.getByLabel("Bug summary").fill("Synthetic browser-level coverage for IssueFlow productivity controls.");
  await page.getByLabel("Environment / browser / device").fill("Chromium E2E on Windows");
  await page.getByLabel("Steps to reproduce").fill("1. Open the E2E workflow\n2. Apply the synthetic action");
  await page.getByLabel("Expected result").fill("The workflow remains synchronized.");
  await page.getByLabel("Actual result").fill("The defect remains visible for verification.");
  await page.getByLabel("Severity").selectOption("HIGH");
  await page.getByRole("button", { name: "Create Bug Report" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/dashboard/issues");
  await page.getByLabel("Search bug reports").fill(title.toLowerCase());
  await page.locator('select[name="status"]').selectOption("OPEN");
  await page.locator('select[name="severity"]').selectOption("HIGH");
  await page.getByRole("button", { name: "Apply view" }).click();

  await expect(page).toHaveURL(/q=e2e-/);
  await expect(page).toHaveURL(/status=OPEN/);
  await expect(page).toHaveURL(/severity=HIGH/);
  await expect(page.locator('select[name="status"]')).toHaveValue("OPEN");
  await expect(page.locator('select[name="severity"]')).toHaveValue("HIGH");
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page).not.toHaveURL(/(?:\?|&)q=/);
  await expect(page).toHaveURL(/status=OPEN/);
  await expect(page).toHaveURL(/severity=HIGH/);
  await expect(page.getByLabel("Search bug reports")).toHaveValue("");
  await expect(page.locator('select[name="status"]')).toHaveValue("OPEN");
  await expect(page.locator('select[name="severity"]')).toHaveValue("HIGH");

  await page.getByRole("link", { name: "Reset all" }).click();
  await expect(page).toHaveURL(/\/dashboard\/issues$/);
  await expect(page.getByLabel("Search bug reports")).toHaveValue("");
  await expect(page.locator('select[name="status"]')).toHaveValue("");
  await expect(page.locator('select[name="severity"]')).toHaveValue("");
  await expect(page.locator('select[name="assignee"]')).toHaveValue("");
  await expect(page.locator('select[name="linked"]')).toHaveValue("");
  await expect(page.locator('select[name="sort"]')).toHaveValue("updated");
  await expect(page.locator('select[name="pageSize"]')).toHaveValue("10");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("Test Case search, filters, and Reset all stay synchronized", async ({ page, loginAs }, testInfo) => {
  const title = e2eName(testInfo, "TestCase-Productivity");
  await loginAs("tester");
  await page.goto("/dashboard/test-cases/new");

  await page.getByLabel("Test case title").fill(title);
  await page.getByLabel("Feature / module").fill("E2E Productivity");
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Scenario description").fill("Synthetic verification scenario for URL-backed Test Case controls.");
  await page.getByLabel("Preconditions").fill("The E2E database is initialized.");
  await page.getByLabel("Test steps").fill("1. Open Test Cases\n2. Search and filter\n3. Reset the view");
  await page.getByLabel("Expected result").fill("Controls and results remain synchronized.");
  await page.getByLabel("Actual result").fill("Not run yet.");
  await page.getByRole("button", { name: "Create Test Case" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/dashboard/test-cases");
  await page.getByLabel("Search test cases").fill(title.toLowerCase());
  await page.locator('select[name="status"]').selectOption("NOT_RUN");
  await page.locator('select[name="priority"]').selectOption("HIGH");
  await page.getByRole("button", { name: "Apply view" }).click();

  await expect(page).toHaveURL(/status=NOT_RUN/);
  await expect(page).toHaveURL(/priority=HIGH/);
  await expect(page.locator('select[name="status"]')).toHaveValue("NOT_RUN");
  await expect(page.locator('select[name="priority"]')).toHaveValue("HIGH");
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  await page.getByRole("link", { name: "Reset all" }).click();
  await expect(page).toHaveURL(/\/dashboard\/test-cases$/);
  await expect(page.getByLabel("Search test cases")).toHaveValue("");
  await expect(page.locator('select[name="status"]')).toHaveValue("");
  await expect(page.locator('select[name="priority"]')).toHaveValue("");
  await expect(page.locator('select[name="module"]')).toHaveValue("");
  await expect(page.locator('select[name="linked"]')).toHaveValue("");
  await expect(page.locator('select[name="sort"]')).toHaveValue("updated");
  await expect(page.locator('select[name="pageSize"]')).toHaveValue("10");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
