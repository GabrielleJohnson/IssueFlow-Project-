process.env.DATABASE_URL = `file:${process.cwd().replace(/\\/g, "/")}/prisma/dev.db`;
process.env.AUTH_SECRET = "issueflow-local-dev-secret-change-before-production";

const { spawn } = await import("node:child_process");
const { unlink } = await import("node:fs/promises");
const { join } = await import("node:path");
const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");

const prisma = new PrismaClient();
const baseUrl = "http://127.0.0.1:3213";
const stamp = Date.now();
const password = "ExecutionSmoke123!";
const userIds = [];
const testCaseIds = [];
const issueIds = [];
const suiteIds = [];
const runIds = [];
const attachmentFiles = [];
let server;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("v0.7 smoke server did not start.");
}

async function login(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert(response.ok, `Login failed for ${email}: ${response.status}`);
  return cookieFrom(response);
}

async function api(path, cookie = "", options = {}) {
  const headers = { Cookie: cookie, ...options.headers };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

async function createTestCase(createdBy, index, status = "NOT_RUN") {
  const testCase = await prisma.testCase.create({
    data: {
      title: `Execution scenario ${index} ${stamp}`,
      description: `Reusable v0.7 smoke definition ${index}.`,
      feature_module: index < 4 ? "Checkout" : "Account",
      preconditions: "A smoke account and catalog item exist.",
      test_steps: `1. Open scenario ${index}.\n2. Complete the expected workflow.`,
      expected_result: `Scenario ${index} completes successfully.`,
      actual_result: status === "FAILED" ? "Legacy manual result failed." : "Not yet executed in a run.",
      status,
      priority: index === 2 ? "CRITICAL" : "HIGH",
      created_by: createdBy
    }
  });
  testCaseIds.push(testCase.id);
  return testCase;
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, tester, developerA, developerB] = await Promise.all([
    prisma.user.create({ data: { username: `ExecutionAdmin${stamp}`, email: `execution-admin-${stamp}@issueflow.local`, password_hash: passwordHash, role: "ADMIN" } }),
    prisma.user.create({ data: { username: `ExecutionTester${stamp}`, email: `execution-tester-${stamp}@issueflow.local`, password_hash: passwordHash, role: "TESTER" } }),
    prisma.user.create({ data: { username: `ExecutionDevA${stamp}`, email: `execution-dev-a-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } }),
    prisma.user.create({ data: { username: `ExecutionDevB${stamp}`, email: `execution-dev-b-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } })
  ]);
  userIds.push(admin.id, tester.id, developerA.id, developerB.id);
  const [tc1, tc2, tc3, tc4, legacyFailed] = await Promise.all([
    createTestCase(tester.id, 1), createTestCase(tester.id, 2), createTestCase(tester.id, 3), createTestCase(tester.id, 4), createTestCase(tester.id, 5, "FAILED")
  ]);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3213"], { cwd: process.cwd(), stdio: "ignore" });
  await waitForServer();

  const unauthenticated = await api("/api/test-suites");
  assert(unauthenticated.response.status === 401, "Unauthenticated suite access was not rejected.");
  const [adminCookie, testerCookie, developerACookie, developerBCookie] = await Promise.all([
    login(admin.email), login(tester.email), login(developerA.email), login(developerB.email)
  ]);

  const suiteCreate = await api("/api/test-suites", testerCookie, { method: "POST", body: JSON.stringify({ name: `Checkout Regression ${stamp}`, description: "Reusable checkout regression coverage." }) });
  assert(suiteCreate.response.status === 201, "A. Tester could not create a suite.");
  const suiteId = suiteCreate.data.suite.id;
  suiteIds.push(suiteId);

  const emptySuite = await api("/api/test-suites", testerCookie, { method: "POST", body: JSON.stringify({ name: `Empty Suite ${stamp}` }) });
  assert(emptySuite.response.status === 201, "Empty-suite fixture creation failed.");
  suiteIds.push(emptySuite.data.suite.id);
  const emptyRun = await api("/api/test-runs", testerCookie, { method: "POST", body: JSON.stringify({ suite_id: emptySuite.data.suite.id, release_label: "v0.7-empty", environment: "Chrome" }) });
  assert(emptyRun.response.status === 400, "Starting an empty suite did not fail cleanly.");

  for (const testCase of [tc1, tc2, tc3]) {
    const added = await api(`/api/test-suites/${suiteId}/cases`, testerCookie, { method: "POST", body: JSON.stringify({ test_case_id: testCase.id }) });
    assert(added.response.status === 201, `B. Could not add TC-${testCase.id} to suite.`);
  }
  const duplicateMembership = await api(`/api/test-suites/${suiteId}/cases`, testerCookie, { method: "POST", body: JSON.stringify({ test_case_id: tc1.id }) });
  assert(duplicateMembership.response.status === 409, "Duplicate suite membership was not rejected.");
  const removed = await api(`/api/test-suites/${suiteId}/cases`, testerCookie, { method: "DELETE", body: JSON.stringify({ test_case_id: tc3.id }) });
  const readded = await api(`/api/test-suites/${suiteId}/cases`, testerCookie, { method: "POST", body: JSON.stringify({ test_case_id: tc3.id }) });
  assert(removed.response.ok && readded.response.status === 201, "B. Remove/re-add suite membership failed.");

  const firstRunCreate = await api("/api/test-runs", testerCookie, { method: "POST", body: JSON.stringify({ suite_id: suiteId, release_label: "v0.7.0-rc1", environment: "Chrome 140 / Windows 11", notes: "First immutable snapshot." }) });
  assert(firstRunCreate.response.status === 201 && firstRunCreate.data.run.executions.length === 3, "C. First test run did not snapshot three cases.");
  const firstRunId = firstRunCreate.data.run.id;
  runIds.push(firstRunId);
  const firstExecutionIds = firstRunCreate.data.run.executions.map((execution) => execution.id);

  const addAfterStart = await api(`/api/test-suites/${suiteId}/cases`, testerCookie, { method: "POST", body: JSON.stringify({ test_case_id: tc4.id }) });
  const firstRunAfterSuiteChange = await api(`/api/test-runs/${firstRunId}`, testerCookie);
  assert(addAfterStart.response.status === 201 && firstRunAfterSuiteChange.data.run.executions.length === 3, "D. Suite changes altered an active run snapshot.");

  const passed = await api(`/api/test-executions/${firstExecutionIds[0]}`, testerCookie, { method: "PATCH", body: JSON.stringify({ status: "PASSED", actual_result: "Checkout completed." }) });
  const passedAgain = await api(`/api/test-executions/${firstExecutionIds[0]}`, testerCookie, { method: "PATCH", body: JSON.stringify({ status: "PASSED", actual_result: "Reconfirmed without creating a new record." }) });
  const failed = await api(`/api/test-executions/${firstExecutionIds[1]}`, testerCookie, { method: "PATCH", body: JSON.stringify({ status: "FAILED", actual_result: "Order total ignored the loyalty credit." }) });
  const blocked = await api(`/api/test-executions/${firstExecutionIds[2]}`, testerCookie, { method: "PATCH", body: JSON.stringify({ status: "BLOCKED", actual_result: "Payment sandbox was unavailable." }) });
  assert(passed.response.ok && passedAgain.response.ok && passedAgain.data.execution.id === firstExecutionIds[0], "E. Passed/repeated execution update failed.");
  assert(failed.response.ok && failed.data.execution.status === "FAILED", "F. Failed execution update failed.");
  assert(blocked.response.ok && blocked.data.execution.status === "BLOCKED" && blocked.data.run.status === "COMPLETED", "G. Blocked result or run completion failed.");

  const executionBugPayload = {
    title: `Loyalty credit missing ${stamp}`,
    description: "Checkout total does not include the earned loyalty credit.",
    environment: "Chrome 140 / Windows 11; v0.7.0-rc1",
    steps_to_reproduce: "Run the checkout regression scenario.",
    expected_result: "The credit reduces the total.",
    actual_result: "The total remains unchanged.",
    severity: "HIGH",
    status: "OPEN",
    assigned_to: developerB.id,
    linked_test_case_id: tc2.id,
    origin_execution_id: firstExecutionIds[1]
  };
  const executionBug = await api("/api/issues", testerCookie, { method: "POST", body: JSON.stringify(executionBugPayload) });
  assert(executionBug.response.status === 201, "H. Failed execution did not create a bug report.");
  issueIds.push(executionBug.data.issue.id);
  const duplicateBug = await api("/api/issues", testerCookie, { method: "POST", body: JSON.stringify({ ...executionBugPayload, title: `${executionBugPayload.title} duplicate` }) });
  assert(duplicateBug.response.status === 409, "Duplicate bug creation from one execution was not rejected.");
  const tracedBug = await api(`/api/issues/${executionBug.data.issue.id}`, developerBCookie);
  assert(tracedBug.response.ok && tracedBug.data.issue.origin_execution_id === firstExecutionIds[1] && tracedBug.data.issue.linked_test_case_id === tc2.id, "I. Bug traceability to execution/test case is incomplete.");
  const [developerTracePage, testerTracePage] = await Promise.all([
    fetch(`${baseUrl}/dashboard/issues/${executionBug.data.issue.id}`, { headers: { Cookie: developerBCookie } }),
    fetch(`${baseUrl}/dashboard/issues/${executionBug.data.issue.id}`, { headers: { Cookie: testerCookie } })
  ]);
  const [developerTraceHtml, testerTraceHtml] = await Promise.all([developerTracePage.text(), testerTracePage.text()]);
  const testCaseHref = `href="/dashboard/test-cases/${tc2.id}"`;
  const testRunHref = `href="/dashboard/test-runs/${firstRunId}"`;
  assert(developerTracePage.ok && developerTraceHtml.includes(`TC-${String(tc2.id).padStart(4, "0")}`) && developerTraceHtml.includes(tc2.title), "I. Developer lost read-only originating Test Case context.");
  assert(!developerTraceHtml.includes(testCaseHref) && !developerTraceHtml.includes(testRunHref), "I. Developer was shown inaccessible QA traceability links.");
  assert(testerTracePage.ok && testerTraceHtml.includes(testCaseHref) && testerTraceHtml.includes(testRunHref), "I. Tester lost authorized QA traceability links.");

  const secondRunCreate = await api("/api/test-runs", testerCookie, { method: "POST", body: JSON.stringify({ suite_id: suiteId, release_label: "v0.7.0-rc2", environment: "Firefox 142 / Windows 11", notes: "Regression rerun." }) });
  assert(secondRunCreate.response.status === 201 && secondRunCreate.data.run.executions.length === 4, "J. Second run did not use the latest suite membership.");
  const secondRunId = secondRunCreate.data.run.id;
  runIds.push(secondRunId);
  const preservedFirst = await api(`/api/test-runs/${firstRunId}`, testerCookie);
  assert(preservedFirst.data.run.executions.length === 3 && preservedFirst.data.run.executions[1].status === "FAILED", "J. Second run overwrote first-run history.");

  const testerSuiteEdit = await api(`/api/test-suites/${suiteId}`, testerCookie, { method: "PATCH", body: JSON.stringify({ description: "Updated by the suite owner." }) });
  assert(testerSuiteEdit.response.ok, "K. Tester could not manage their own suite.");
  const [developerCreate, developerExecute, developerDelete, developerRunView] = await Promise.all([
    api("/api/test-suites", developerACookie, { method: "POST", body: JSON.stringify({ name: "Forbidden suite" }) }),
    api(`/api/test-executions/${secondRunCreate.data.run.executions[0].id}`, developerACookie, { method: "PATCH", body: JSON.stringify({ status: "PASSED" }) }),
    api(`/api/test-suites/${suiteId}`, developerACookie, { method: "DELETE" }),
    api(`/api/test-runs/${firstRunId}`, developerACookie)
  ]);
  assert([developerCreate, developerExecute, developerDelete, developerRunView].every((result) => result.response.status === 403), "L. Developer mutated or browsed restricted QA run data.");
  const hiddenIssue = await api(`/api/issues/${executionBug.data.issue.id}`, developerACookie);
  assert(hiddenIssue.response.status === 403, "M. New traceability bypassed Developer bug visibility.");

  const adminSuite = await api("/api/test-suites", adminCookie, { method: "POST", body: JSON.stringify({ name: `Admin Suite ${stamp}` }) });
  assert(adminSuite.response.status === 201, "N. Admin could not create a suite.");
  suiteIds.push(adminSuite.data.suite.id);
  await api(`/api/test-suites/${adminSuite.data.suite.id}/cases`, adminCookie, { method: "POST", body: JSON.stringify({ test_case_id: legacyFailed.id }) });
  const adminRun = await api("/api/test-runs", adminCookie, { method: "POST", body: JSON.stringify({ suite_id: adminSuite.data.suite.id, release_label: "admin-cleanup", environment: "Admin smoke" }) });
  assert(adminRun.response.status === 201, "N. Admin could not start a run.");
  runIds.push(adminRun.data.run.id);
  const adminDeleteRun = await api(`/api/test-runs/${adminRun.data.run.id}`, adminCookie, { method: "DELETE" });
  const adminDeleteSuite = await api(`/api/test-suites/${adminSuite.data.suite.id}`, adminCookie, { method: "DELETE" });
  assert(adminDeleteRun.response.ok && adminDeleteSuite.response.ok, "N. Admin delete permissions failed.");
  runIds.splice(runIds.indexOf(adminRun.data.run.id), 1);
  suiteIds.splice(suiteIds.indexOf(adminSuite.data.suite.id), 1);

  const [testerAnalytics, developerAAnalytics, developerBAnalytics] = await Promise.all([
    api("/api/analytics", testerCookie), api("/api/analytics", developerACookie), api("/api/analytics", developerBCookie)
  ]);
  const [expectedDeveloperAExecutions, expectedDeveloperBExecutions] = await Promise.all([
    prisma.testExecution.count({ where: { bugReport: { is: { OR: [{ assigned_to: developerA.id }, { assigned_to: null }] } } } }),
    prisma.testExecution.count({ where: { bugReport: { is: { OR: [{ assigned_to: developerB.id }, { assigned_to: null }] } } } })
  ]);
  assert(testerAnalytics.data.analytics.executionAnalytics.totalExecutions >= 7, "O. QA analytics omitted test-run executions.");
  assert(developerAAnalytics.data.analytics.executionAnalytics.totalExecutions === expectedDeveloperAExecutions, "O. Developer analytics leaked hidden execution data.");
  assert(developerBAnalytics.data.analytics.executionAnalytics.totalExecutions === expectedDeveloperBExecutions, "O. Developer analytics did not scope linked visible execution context.");

  const productivityPage = await fetch(`${baseUrl}/dashboard/issues?status=OPEN&severity=HIGH`, { headers: { Cookie: testerCookie } });
  const productivityHtml = await productivityPage.text();
  const resetPage = await fetch(`${baseUrl}/dashboard/issues`, { headers: { Cookie: testerCookie } });
  const resetHtml = await resetPage.text();
  assert(productivityPage.ok && productivityHtml.includes('option value="OPEN" selected') && productivityHtml.includes('option value="HIGH" selected'), "P. Filtered v0.6 control state was not restored.");
  assert(resetPage.ok && resetHtml.includes("All statuses") && resetHtml.includes("All severities"), "P. Reset v0.6 defaults were not rendered.");

  const lifecycleIssue = await api("/api/issues", testerCookie, { method: "POST", body: JSON.stringify({ title: `Lifecycle regression ${stamp}`, description: "Existing lifecycle remains available.", environment: "Chrome", steps_to_reproduce: "Open the known flow.", expected_result: "Flow succeeds.", actual_result: "Flow fails.", severity: "MEDIUM", status: "OPEN", assigned_to: developerA.id }) });
  assert(lifecycleIssue.response.status === 201, "Q. Lifecycle bug fixture failed.");
  issueIds.push(lifecycleIssue.data.issue.id);
  const lifecycleTransition = await api(`/api/issues/${lifecycleIssue.data.issue.id}`, developerACookie, { method: "PATCH", body: JSON.stringify({ status: "IN_PROGRESS" }) });
  assert(lifecycleTransition.response.ok && lifecycleTransition.data.issue.status === "IN_PROGRESS", "Q. Existing Developer lifecycle transition failed.");

  const legacyBug = await api("/api/issues", testerCookie, { method: "POST", body: JSON.stringify({ title: `Legacy failed test bug ${stamp}`, description: "Legacy failed-test workflow remains valid.", environment: "Safari", steps_to_reproduce: "Run the legacy failed test.", expected_result: "It passes.", actual_result: "It fails.", severity: "CRITICAL", status: "OPEN", linked_test_case_id: legacyFailed.id }) });
  assert(legacyBug.response.status === 201 && !legacyBug.data.issue.origin_execution_id, "R. Existing failed Test Case to Bug workflow regressed.");
  issueIds.push(legacyBug.data.issue.id);

  const comment = await api(`/api/issues/${lifecycleIssue.data.issue.id}/comments`, testerCookie, { method: "POST", body: JSON.stringify({ content: `v0.7 collaboration regression ${stamp}` }) });
  const evidence = new FormData();
  evidence.append("files", new File([new Uint8Array([137, 80, 78, 71])], `v07-evidence-${stamp}.png`, { type: "image/png" }));
  const upload = await api(`/api/issues/${lifecycleIssue.data.issue.id}/attachments`, testerCookie, { method: "POST", body: evidence });
  if (upload.response.status === 201) attachmentFiles.push(upload.data.attachments[0].filepath);
  const activity = await api(`/api/issues/${lifecycleIssue.data.issue.id}/activity`, testerCookie);
  assert(comment.response.status === 201 && upload.response.status === 201, "S. Existing comments/evidence behavior failed.");
  assert(activity.data.activity.some((entry) => entry.action_type === "COMMENT_ADDED") && activity.data.activity.some((entry) => entry.action_type === "EVIDENCE_UPLOADED") && activity.data.activity.some((entry) => entry.action_type === "STATUS_CHANGED"), "S. Existing activity history omitted regression events.");

  const deleteSuite = await api(`/api/test-suites/${suiteId}`, testerCookie, { method: "DELETE" });
  assert(deleteSuite.response.ok, "Suite owner could not delete their suite.");
  suiteIds.splice(suiteIds.indexOf(suiteId), 1);
  const [preservedCases, detachedRuns, preservedExecutions] = await Promise.all([
    prisma.testCase.count({ where: { id: { in: [tc1.id, tc2.id, tc3.id, tc4.id] } } }),
    prisma.testRun.count({ where: { id: { in: [firstRunId, secondRunId] }, suite_id: null } }),
    prisma.testExecution.count({ where: { run_id: firstRunId } })
  ]);
  assert(preservedCases === 4 && detachedRuns === 2 && preservedExecutions === 3, "Suite deletion damaged test cases or historical runs.");

  console.log(JSON.stringify({
    A_suiteCreation: "passed", B_membership: "passed", C_runCreation: "passed", D_snapshotStability: "passed",
    E_passedResult: "passed", F_failedResult: "passed", G_blockedResult: "passed", H_failedExecutionBug: "passed",
    I_traceability: "passed", J_rerunHistory: "passed", K_testerPermissions: "passed", L_developerMutation: "passed",
    M_developerVisibility: "passed", N_adminPermissions: "passed", O_analyticsScope: "passed", P_productivityRegression: "passed",
    Q_lifecycleRegression: "passed", R_legacyFailedTestBug: "passed", S_collaborationEvidenceActivity: "passed",
    edgeCases: ["empty suite", "duplicate membership", "repeated result update", "duplicate execution bug", "deleted suite history"]
  }, null, 2));
} finally {
  server?.kill();
  if (issueIds.length) {
    await prisma.testCase.updateMany({ where: { linked_issue_id: { in: issueIds } }, data: { linked_issue_id: null } }).catch(() => null);
    await prisma.issueComment.deleteMany({ where: { issue_id: { in: issueIds } } }).catch(() => null);
    await prisma.issueActivity.deleteMany({ where: { issue_id: { in: issueIds } } }).catch(() => null);
    await prisma.attachment.deleteMany({ where: { issue_id: { in: issueIds } } }).catch(() => null);
    await prisma.issue.deleteMany({ where: { id: { in: issueIds } } }).catch(() => null);
  }
  if (runIds.length) await prisma.testRun.deleteMany({ where: { id: { in: runIds } } }).catch(() => null);
  if (suiteIds.length) await prisma.testSuite.deleteMany({ where: { id: { in: suiteIds } } }).catch(() => null);
  if (testCaseIds.length) await prisma.testCase.deleteMany({ where: { id: { in: testCaseIds } } }).catch(() => null);
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => null);
  for (const filepath of attachmentFiles) await unlink(join(process.cwd(), filepath)).catch(() => null);
  await prisma.$disconnect();
}
