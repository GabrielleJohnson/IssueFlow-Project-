process.env.DATABASE_URL = `file:${process.cwd().replace(/\\/g, "/")}/prisma/dev.db`;
process.env.AUTH_SECRET = "issueflow-local-dev-secret-change-before-production";

const { spawn } = await import("node:child_process");
const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");

const prisma = new PrismaClient();
const baseUrl = "http://127.0.0.1:3211";
const stamp = Date.now();
const password = "AnalyticsSmoke123!";
const createdUserIds = [];
const createdIssueIds = [];
const createdTestCaseIds = [];
let server;

const issueStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "REOPENED", "CLOSED"];
const issueSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const testStatuses = ["NOT_RUN", "PASSED", "FAILED", "BLOCKED"];
const activeStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "REOPENED"];

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
  throw new Error("Analytics smoke server did not start.");
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

async function api(path, cookie, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...options.headers }
  });
  const text = await response.text();
  return { response, data: text ? JSON.parse(text) : {} };
}

function mapCounts(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], row._count._all]));
}

async function expectedFor(role, userId) {
  const issueWhere = role === "DEVELOPER" ? { OR: [{ assigned_to: userId }, { assigned_to: null }] } : {};
  const testWhere = role === "DEVELOPER" ? { linkedIssue: { is: issueWhere } } : {};
  const [statuses, severities, tests] = await Promise.all([
    prisma.issue.groupBy({ by: ["status"], where: issueWhere, _count: { _all: true } }),
    prisma.issue.groupBy({ by: ["severity"], where: issueWhere, _count: { _all: true } }),
    prisma.testCase.groupBy({ by: ["status"], where: testWhere, _count: { _all: true } })
  ]);
  return { statuses: mapCounts(statuses, "status"), severities: mapCounts(severities, "severity"), tests: mapCounts(tests, "status") };
}

function verifyCounts(analytics, expected, label) {
  for (const item of analytics.bugsByStatus) assert(item.count === (expected.statuses[item.key] ?? 0), `${label} status mismatch for ${item.key}`);
  for (const item of analytics.bugsBySeverity) assert(item.count === (expected.severities[item.key] ?? 0), `${label} severity mismatch for ${item.key}`);
  for (const item of analytics.testResults) assert(item.count === (expected.tests[item.key] ?? 0), `${label} test mismatch for ${item.key}`);

  const passed = expected.tests.PASSED ?? 0;
  const executed = passed + (expected.tests.FAILED ?? 0) + (expected.tests.BLOCKED ?? 0);
  const expectedRate = executed ? Math.round((passed / executed) * 1000) / 10 : 0;
  assert(analytics.summary.testPassRate === expectedRate, `${label} pass-rate mismatch: ${analytics.summary.testPassRate} !== ${expectedRate}`);
  assert(analytics.summary.reopenedBugs === (expected.statuses.REOPENED ?? 0), `${label} current reopened mismatch`);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, tester, developer, otherDeveloper] = await Promise.all([
    prisma.user.create({ data: { username: `AnalyticsAdmin${stamp}`, email: `analytics-admin-${stamp}@issueflow.local`, password_hash: passwordHash, role: "ADMIN" } }),
    prisma.user.create({ data: { username: `AnalyticsTester${stamp}`, email: `analytics-tester-${stamp}@issueflow.local`, password_hash: passwordHash, role: "TESTER" } }),
    prisma.user.create({ data: { username: `AnalyticsDev${stamp}`, email: `analytics-dev-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } }),
    prisma.user.create({ data: { username: `AnalyticsOtherDev${stamp}`, email: `analytics-other-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } })
  ]);
  createdUserIds.push(admin.id, tester.id, developer.id, otherDeveloper.id);

  for (let index = 0; index < issueStatuses.length; index += 1) {
    const status = issueStatuses[index];
    const issue = await prisma.issue.create({
      data: {
        title: `Analytics ${status} ${stamp}`,
        description: "Temporary analytics accuracy record.",
        environment: "Analytics smoke environment",
        steps_to_reproduce: "Run the analytics smoke scenario.",
        expected_result: "Metrics match the database.",
        actual_result: "A known lifecycle record is counted.",
        severity: issueSeverities[index % issueSeverities.length],
        status,
        created_by: tester.id,
        assigned_to: status === "IN_REVIEW" ? null : status === "CLOSED" ? otherDeveloper.id : developer.id
      }
    });
    createdIssueIds.push(issue.id);
  }

  const assignedIssueId = createdIssueIds[0];
  const reopenedIssueId = createdIssueIds[4];
  await prisma.issueActivity.createMany({
    data: [
      { issue_id: reopenedIssueId, actor_id: developer.id, action_type: "ISSUE_RESOLVED", field_name: "status", old_value: "IN_REVIEW", new_value: "RESOLVED", message: "Analytics smoke bug resolved." },
      { issue_id: reopenedIssueId, actor_id: tester.id, action_type: "ISSUE_REOPENED", field_name: "status", old_value: "RESOLVED", new_value: "REOPENED", message: "Analytics smoke bug reopened." }
    ]
  });

  for (const status of testStatuses) {
    const testCase = await prisma.testCase.create({
      data: {
        title: `Analytics ${status} test ${stamp}`,
        description: "Temporary analytics test result.",
        feature_module: status === "FAILED" ? "Checkout" : "Account",
        preconditions: "Smoke users exist.",
        test_steps: "Run the known test path.",
        expected_result: "The known result is recorded.",
        actual_result: `Result is ${status}.`,
        status,
        priority: status === "FAILED" ? "CRITICAL" : "MEDIUM",
        created_by: tester.id,
        linked_issue_id: assignedIssueId
      }
    });
    createdTestCaseIds.push(testCase.id);
  }

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3211"], { cwd: process.cwd(), stdio: "ignore" });
  await waitForServer();

  const unauthenticated = await fetch(`${baseUrl}/api/analytics`);
  assert(unauthenticated.status === 401, `Unauthenticated analytics returned ${unauthenticated.status}`);

  const [adminCookie, testerCookie, developerCookie] = await Promise.all([login(admin.email), login(tester.email), login(developer.email)]);
  const [adminResult, testerResult, developerResult] = await Promise.all([
    api("/api/analytics", adminCookie),
    api("/api/analytics", testerCookie),
    api("/api/analytics", developerCookie)
  ]);
  assert(adminResult.response.ok && testerResult.response.ok && developerResult.response.ok, "One or more role analytics requests failed.");

  const [adminExpected, testerExpected, developerExpected] = await Promise.all([
    expectedFor("ADMIN", admin.id),
    expectedFor("TESTER", tester.id),
    expectedFor("DEVELOPER", developer.id)
  ]);
  verifyCounts(adminResult.data.analytics, adminExpected, "ADMIN");
  verifyCounts(testerResult.data.analytics, testerExpected, "TESTER");
  verifyCounts(developerResult.data.analytics, developerExpected, "DEVELOPER");
  assert(adminResult.data.analytics.scope === "all", "Admin scope was not organization-wide.");
  assert(testerResult.data.analytics.scope === "qa", "Tester scope was not QA-wide.");
  assert(developerResult.data.analytics.scope === "developer", "Developer scope was not developer-scoped.");
  assert(testerResult.data.analytics.developerWorkload.length === 0, "Tester received developer workload data.");
  assert(developerResult.data.analytics.developerWorkload.length === 1 && developerResult.data.analytics.developerWorkload[0].id === developer.id, "Developer workload was not limited to the current developer.");

  const expectedDeveloperActive = await prisma.issue.count({ where: { assigned_to: developer.id, status: { in: activeStatuses } } });
  assert(developerResult.data.analytics.developerWorkload[0].totalActive === expectedDeveloperActive, "Developer active workload does not match assigned records.");
  assert(adminResult.data.analytics.reopenMetrics.recordedReopenEvents >= 1, "Recorded reopen event was not counted.");

  const commentText = `Analytics recent activity ${stamp}`;
  const comment = await api(`/api/issues/${assignedIssueId}/comments`, testerCookie, { method: "POST", body: JSON.stringify({ content: commentText }) });
  assert(comment.response.status === 201, `Recent activity setup comment failed: ${comment.response.status}`);
  const refreshed = await api("/api/analytics", testerCookie);
  assert(refreshed.data.analytics.recentActivity.some((activity) => activity.actionType === "COMMENT_ADDED" && activity.issue.id === assignedIssueId), "New comment did not appear in Recent Activity.");
  assert(refreshed.data.analytics.problemAreas.some((area) => area.module === "Checkout" && area.failedTests >= 1), "Structured Checkout problem area was not reported.");

  console.log(JSON.stringify({
    scenarioAStatusAccuracy: "passed",
    scenarioBSeverityAccuracy: "passed",
    scenarioCTestAccuracy: "passed",
    scenarioDPassRate: "passed",
    scenarioEReopened: "passed",
    scenarioFDeveloperWorkload: "passed",
    scenarioGRbac: "passed",
    scenarioHRecentActivity: "passed",
    adminTotalBugs: adminResult.data.analytics.summary.totalBugReports,
    developerVisibleBugs: developerResult.data.analytics.summary.totalBugReports,
    testerPassRate: testerResult.data.analytics.summary.testPassRate
  }, null, 2));
} finally {
  server?.kill();
  if (createdIssueIds.length) {
    await prisma.issueComment.deleteMany({ where: { issue_id: { in: createdIssueIds } } });
    await prisma.issueActivity.deleteMany({ where: { issue_id: { in: createdIssueIds } } });
  }
  if (createdTestCaseIds.length) await prisma.testCase.deleteMany({ where: { id: { in: createdTestCaseIds } } });
  if (createdIssueIds.length) await prisma.issue.deleteMany({ where: { id: { in: createdIssueIds } } });
  if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
}
