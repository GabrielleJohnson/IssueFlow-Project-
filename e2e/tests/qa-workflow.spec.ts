import { test, expect, loginThroughApi } from "../fixtures";
import { E2E_USERS } from "../support/environment";
import { e2eName } from "../support/names";

function idFromUrl(url: string, segment: string) {
  const match = url.match(new RegExp(`/${segment}/(\\d+)`));
  if (!match) throw new Error(`Could not read ${segment} id from ${url}`);
  return Number(match[1]);
}

async function createTestCase(page: import("@playwright/test").Page, title: string, module: string) {
  await page.goto("/dashboard/test-cases/new");
  await page.getByLabel("Test case title").fill(title);
  await page.getByLabel("Feature / module").fill(module);
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Scenario description").fill(`Browser-level QA scenario for ${title}.`);
  await page.getByLabel("Preconditions").fill("Synthetic E2E account and isolated database are ready.");
  await page.getByLabel("Test steps").fill("1. Open the synthetic workflow\n2. Execute the scenario\n3. Record the observed result");
  await page.getByLabel("Expected result").fill("The workflow completes without a defect.");
  await page.getByLabel("Actual result").fill("Awaiting execution.");
  await page.getByRole("button", { name: "Create Test Case" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  return idFromUrl(page.url(), "test-cases");
}

async function advanceDeveloperStatus(page: import("@playwright/test").Page, status: string) {
  await page.getByRole("link", { name: "Update Status" }).click();
  await page.getByLabel("Bug status").selectOption(status);
  await page.getByRole("button", { name: "Update Status" }).click();
  await expect(page.getByRole("link", { name: "Update Status" })).toBeVisible();
}

test("Tester execution failure becomes a traced bug with preserved historical runs", async ({ page, loginAs }, testInfo) => {
  const primaryTitle = e2eName(testInfo, "Checkout-Primary");
  const futureTitle = e2eName(testInfo, "Checkout-Future");
  const suiteName = e2eName(testInfo, "Checkout-Suite");
  const bugTitle = e2eName(testInfo, "Failed-Execution-Bug");

  await loginAs("tester");
  const primaryCaseId = await createTestCase(page, primaryTitle, "E2E Checkout");
  const futureCaseId = await createTestCase(page, futureTitle, "E2E Checkout");

  await page.goto("/dashboard/test-suites/new");
  await page.getByLabel("Suite name").fill(suiteName);
  await page.getByLabel("Description").fill("Synthetic suite for immutable execution-history coverage.");
  await page.getByRole("button", { name: "Create Suite" }).click();
  await expect(page).toHaveURL(/\/dashboard\/test-suites\/\d+$/);
  const suiteId = idFromUrl(page.url(), "test-suites");

  const membership = page.locator("select[name='test_case_id']");
  await membership.selectOption(String(primaryCaseId));
  await page.getByRole("button", { name: "Add Test Case" }).click();
  await expect(page.getByText(primaryTitle, { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Start New Run" }).click();
  await page.getByLabel("Release / build").fill("E2E-build-1");
  await page.getByLabel("Environment").fill("Chromium E2E / isolated SQLite");
  await page.getByLabel("Run notes").fill("Initial immutable snapshot.");
  await page.getByRole("button", { name: "Start Test Run" }).click();
  await expect(page).toHaveURL(/\/dashboard\/test-runs\/\d+$/);
  const firstRunId = idFromUrl(page.url(), "test-runs");

  const executionCard = page.getByRole("article").filter({ hasText: primaryTitle });
  await executionCard.locator('select[name="status"]').selectOption("FAILED");
  await executionCard.locator('textarea[name="actual_result"]').fill("The synthetic checkout total ignored its credit.");
  await executionCard.getByRole("button", { name: "Record Result" }).click();
  await expect(executionCard.locator("span").filter({ hasText: /^Failed$/ })).toBeVisible();
  await expect(page.getByText("1/1", { exact: true })).toBeVisible();

  await executionCard.getByRole("link", { name: "Create Bug Report from Failed Execution" }).click();
  await page.getByLabel("Bug title").fill(bugTitle);
  await page.getByLabel("Assigned to").selectOption({ label: `${E2E_USERS.developer.username} - Developer` });
  await page.getByRole("button", { name: "Create Bug Report" }).click();
  await expect(page).toHaveURL(/\/dashboard\/issues\/\d+$/);
  const issueId = idFromUrl(page.url(), "issues");

  await expect(page.getByRole("heading", { name: bugTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Originating failed execution" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(primaryTitle) })).toBeVisible();
  await expect(page.getByRole("link", { name: "View test run context" })).toHaveAttribute("href", `/dashboard/test-runs/${firstRunId}`);

  await loginThroughApi(page, "developer");
  await page.goto(`/dashboard/issues/${issueId}`);
  await expect(page.getByText(primaryTitle, { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(primaryTitle) })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View test run context" })).toHaveCount(0);

  await advanceDeveloperStatus(page, "IN_PROGRESS");
  await advanceDeveloperStatus(page, "IN_REVIEW");
  await advanceDeveloperStatus(page, "RESOLVED");

  await loginThroughApi(page, "tester");
  await page.goto(`/dashboard/issues/${issueId}`);
  await expect(page.getByRole("heading", { name: "Retest Resolution" })).toBeVisible();
  await page.getByRole("button", { name: "Verify & Close" }).click();
  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();

  await page.goto(`/dashboard/test-suites/${suiteId}`);
  await membership.selectOption(String(futureCaseId));
  await page.getByRole("button", { name: "Add Test Case" }).click();
  await expect(page.getByText(futureTitle, { exact: false })).toBeVisible();

  await page.goto(`/dashboard/test-runs/${firstRunId}`);
  await expect(page.getByText(primaryTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(futureTitle, { exact: true })).toHaveCount(0);
  await expect(page.getByText("1/1", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Run Again" }).click();
  await expect(page.getByLabel("Test suite")).toHaveValue(String(suiteId));
  await page.getByLabel("Release / build").fill("E2E-build-2");
  await page.getByLabel("Environment").fill("Chromium E2E / updated suite");
  await page.getByRole("button", { name: "Start Test Run" }).click();
  await expect(page).toHaveURL(/\/dashboard\/test-runs\/\d+$/);
  await expect(page.getByText(primaryTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(futureTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("0/2", { exact: true })).toBeVisible();
});
