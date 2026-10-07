import { test, expect } from "../fixtures";
import { e2eUser, prisma } from "../support/database";
import { e2eName } from "../support/names";

function idFromUrl(url: string, segment: string) {
  const match = url.match(new RegExp(`/${segment}/(\\d+)`));
  if (!match) throw new Error(`Could not read ${segment} id from ${url}`);
  return Number(match[1]);
}

test("Requirements trace to tests and drive deterministic Release readiness and CSV", async ({ page, loginAs }, testInfo) => {
  const tester = await e2eUser("tester");
  const stamp = e2eName(testInfo, "Coverage");
  const requirementTitle = `=SUM(1,1) \"${stamp}\" with an intentionally long requirement name for responsive verification`;
  const releaseName = `${stamp}-Release-With-An-Intentionally-Long-Version-Name`;
  const testCase = await prisma.testCase.create({
    data: {
      title: `${stamp}-Test-Case`, description: "Synthetic coverage scenario.", feature_module: "E2E Release Readiness", preconditions: "Synthetic data exists.", test_steps: "1. Run the release check", expected_result: "The check passes.", actual_result: "A release blocker was observed.", status: "FAILED", priority: "HIGH", created_by: tester.id
    }
  });
  const suite = await prisma.testSuite.create({ data: { name: `${stamp}-Suite`, description: "Synthetic release suite.", created_by: tester.id } });
  const run = await prisma.testRun.create({
    data: {
      suite_id: suite.id, suite_name: suite.name, release_label: `${stamp}-build`, environment: "Chromium E2E / isolated PostgreSQL", status: "COMPLETED", created_by: tester.id, completed_at: new Date(),
      executions: { create: { test_case_id: testCase.id, test_case_reference: `TC-${String(testCase.id).padStart(4, "0")}`, title_snapshot: testCase.title, description_snapshot: testCase.description, feature_module_snapshot: testCase.feature_module, preconditions_snapshot: testCase.preconditions, test_steps_snapshot: testCase.test_steps, expected_result_snapshot: testCase.expected_result, priority_snapshot: testCase.priority, status: "FAILED", actual_result: "Synthetic blocker", executed_by: tester.id, executed_at: new Date() } }
    }, include: { executions: true }
  });
  const historicalRun = await prisma.testRun.create({
    data: {
      suite_id: suite.id, suite_name: `${stamp}-Historical-Suite`, release_label: `${stamp}-earlier-build`, environment: "Chromium E2E / historical PostgreSQL", status: "COMPLETED", created_by: tester.id, completed_at: new Date(Date.now() - 60_000),
      executions: { create: { test_case_id: testCase.id, test_case_reference: `TC-${String(testCase.id).padStart(4, "0")}`, title_snapshot: testCase.title, description_snapshot: testCase.description, feature_module_snapshot: testCase.feature_module, preconditions_snapshot: testCase.preconditions, test_steps_snapshot: testCase.test_steps, expected_result_snapshot: testCase.expected_result, priority_snapshot: testCase.priority, status: "FAILED", actual_result: "Historical failure created a defect.", executed_by: tester.id, executed_at: new Date(Date.now() - 60_000) } }
    }, include: { executions: true }
  });
  const closedDefect = await prisma.issue.create({
    data: {
      title: `${stamp}-Closed-Direct-Defect`, description: "Closed defect linked directly from the scoped Test Case.", environment: "Historical E2E", steps_to_reproduce: "Run the earlier scenario.", expected_result: "The scenario passes.", actual_result: "A now-closed issue was observed.", severity: "LOW", status: "CLOSED", created_by: tester.id
    }
  });
  await prisma.testCase.update({ where: { id: testCase.id }, data: { linked_issue_id: closedDefect.id } });
  const openDefect = await prisma.issue.create({
    data: {
      title: `${stamp}-Open-Historical-Execution-Defect`, description: "Open defect from an earlier failed execution of the currently scoped Test Case.", environment: "Historical E2E", steps_to_reproduce: "Run the earlier scenario.", expected_result: "The scenario passes.", actual_result: "The earlier execution failed.", severity: "MEDIUM", status: "OPEN", created_by: tester.id, linked_test_case_id: testCase.id, origin_execution_id: historicalRun.executions[0].id
    }
  });

  await loginAs("tester");
  await page.goto("/dashboard/requirements/new");
  await page.getByLabel("Requirement title").fill(requirementTitle);
  await page.getByLabel("Description").fill("A concise QA requirement with commas, quotes, and current traceability.");
  await page.getByLabel("Feature / module").fill("E2E Release Readiness");
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Status").selectOption("READY");
  await page.getByLabel(new RegExp(testCase.title)).check();
  await page.getByRole("button", { name: "Create Requirement" }).click();
  await expect(page.getByRole("heading", { name: requirementTitle })).toBeVisible();
  const requirementId = idFromUrl(page.url(), "requirements");
  await expect(page.getByText("Failing", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(testCase.title) })).toBeVisible();

  await page.goto("/dashboard/requirements");
  await page.getByLabel("Search requirements").fill(stamp);
  await page.locator('select[name="status"]').selectOption("READY");
  await page.locator('select[name="priority"]').selectOption("HIGH");
  await page.locator('select[name="coverage"]').selectOption("FAILING");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=READY/); await expect(page).toHaveURL(/priority=HIGH/); await expect(page).toHaveURL(/coverage=FAILING/);
  await expect(page.getByText(requirementTitle, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Clear Search" }).click();
  await expect(page).not.toHaveURL(/(?:\?|&)q=/); await expect(page).toHaveURL(/status=READY/); await expect(page.locator('select[name="priority"]')).toHaveValue("HIGH");
  await page.getByRole("link", { name: "Reset All" }).click();
  await expect(page).toHaveURL(/\/dashboard\/requirements$/); await expect(page.getByLabel("Search requirements")).toHaveValue(""); await expect(page.locator('select[name="status"]')).toHaveValue(""); await expect(page.locator('select[name="priority"]')).toHaveValue(""); await expect(page.locator('select[name="coverage"]')).toHaveValue(""); await expect(page.locator('select[name="sort"]')).toHaveValue("updated"); await expect(page.locator('select[name="pageSize"]')).toHaveValue("10");

  await page.goto("/dashboard/releases/new");
  await page.getByLabel("Release name / version").fill(releaseName);
  await page.getByLabel("Lifecycle status").selectOption("IN_TESTING");
  await page.getByLabel("Description").fill("Synthetic E2E release readiness record.");
  await page.getByLabel(requirementTitle, { exact: false }).check();
  await page.getByLabel(new RegExp(run.suite_name)).check();
  await page.getByRole("button", { name: "Create Release" }).click();
  await expect(page.getByRole("heading", { name: releaseName })).toBeVisible();
  const releaseId = idFromUrl(page.url(), "releases");
  await expect(page.getByText("Not Ready", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

  const executionResponse = await page.request.patch(`/api/test-executions/${run.executions[0].id}`, { data: { status: "PASSED", actual_result: "Retest passed." } });
  expect(executionResponse.ok()).toBe(true);
  await page.reload();
  await expect(page.getByText("At Risk", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(openDefect.title) })).toBeVisible();
  await page.goto(`/dashboard/requirements/${requirementId}`);
  await expect(page.getByText("Passing", { exact: true }).first()).toBeVisible();

  const report = await page.request.get(`/api/releases/${releaseId}/report`);
  expect(report.ok()).toBe(true);
  expect(report.headers()["content-type"]).toContain("text/csv");
  expect(report.headers()["content-disposition"]).toContain("issueflow-");
  const csv = await report.text();
  expect(csv).toContain("\"Release\",\"Readiness\"");
  expect(csv).toContain("\"'=");
  expect(csv).toContain("\"PASSING\"");
  expect(csv).toContain(`\"TC-${String(testCase.id).padStart(4, "0")}\"`);
  expect(csv).toContain(`\"IF-${String(closedDefect.id).padStart(4, "0")}; IF-${String(openDefect.id).padStart(4, "0")}\"`);
  expect(csv).toContain("\"LOW; MEDIUM\"");
  expect(csv).toContain("\"CLOSED; OPEN\"");

  await prisma.issue.update({ where: { id: openDefect.id }, data: { status: "CLOSED" } });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/dashboard/requirements?q=${encodeURIComponent(stamp)}`);
    const requirementCard = page.locator(`a[href^="/dashboard/requirements/${requirementId}"]`);
    const passingBadge = requirementCard.getByText("Passing", { exact: true });
    const requirementReadyBadge = requirementCard.getByText("Ready", { exact: true });
    for (const badge of [passingBadge, requirementReadyBadge]) {
      await expect(badge).toBeVisible();
      expect(await badge.evaluate((element) => {
        const badgeRect = element.getBoundingClientRect();
        const cardRect = element.closest("a")!.getBoundingClientRect();
        return badgeRect.width < cardRect.width / 2;
      })).toBe(true);
    }

    await page.goto(`/dashboard/releases?q=${encodeURIComponent(stamp)}`);
    const releaseCard = page.locator(`a[href="/dashboard/releases/${releaseId}"]`);
    const releaseReadyBadge = releaseCard.getByText("Ready", { exact: true });
    const inTestingBadge = releaseCard.getByText("In Testing", { exact: true });
    for (const badge of [releaseReadyBadge, inTestingBadge]) {
      await expect(badge).toBeVisible();
      expect(await badge.evaluate((element) => {
        const badgeRect = element.getBoundingClientRect();
        const cardRect = element.closest("a")!.getBoundingClientRect();
        return badgeRect.width < cardRect.width / 2;
      })).toBe(true);
    }

    await page.goto(`/dashboard/releases/${releaseId}`);
    await expect(page.getByRole("heading", { name: releaseName })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await page.goto(`/dashboard/requirements/${requirementId}`);
    await expect(page.getByRole("heading", { name: requirementTitle })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await expect(page.getByRole("contentinfo")).toBeVisible();
  }
});
