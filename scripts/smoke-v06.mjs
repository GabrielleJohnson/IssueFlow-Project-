const { resetTestDatabase } = await import("./lib/postgres-test-database.mjs");
await resetTestDatabase("issueflow_smoke_v06");

const { spawn } = await import("node:child_process");
const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3212";
const stamp = Date.now();
const password = "ProductivitySmoke123!";
const createdUserIds = [];
const createdIssueIds = [];
const createdTestCaseIds = [];
let server;

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

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
  throw new Error("Productivity smoke server did not start.");
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
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

function assertRanked(records, field, rank, label) {
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    assert(rank[previous[field]] <= rank[current[field]], `${label} is not logically ranked at index ${index}.`);
    if (previous[field] === current[field]) {
      const previousTime = new Date(previous.created_at).getTime();
      const currentTime = new Date(current.created_at).getTime();
      assert(previousTime > currentTime || (previousTime === currentTime && previous.id > current.id), `${label} secondary ordering is not stable.`);
    }
  }
}

function htmlAttribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";
}

function formControlValue(html, name) {
  const input = html.match(new RegExp(`<input\\b(?=[^>]*\\bname="${name}")[^>]*>`, "i"))?.[0];
  if (input) return htmlAttribute(input, "value");

  const select = html.match(new RegExp(`<select\\b(?=[^>]*\\bname="${name}")[^>]*>[\\s\\S]*?<\\/select>`, "i"))?.[0];
  assert(select, `Could not find ${name} control in rendered page.`);
  const options = [...select.matchAll(/<option\b[^>]*>[\s\S]*?<\/option>/gi)].map((match) => match[0]);
  const selected = options.find((option) => /\sselected(?:=""|="selected")?/i.test(option)) ?? options[0];
  return selected ? htmlAttribute(selected, "value") : "";
}

function assertFormState(html, expected, label) {
  for (const [name, value] of Object.entries(expected)) {
    assert(formControlValue(html, name) === String(value), `${label} ${name} control is not synchronized.`);
  }
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, tester, developerA, developerB] = await Promise.all([
    prisma.user.create({ data: { username: `ProductivityAdmin${stamp}`, email: `productivity-admin-${stamp}@issueflow.local`, password_hash: passwordHash, role: "ADMIN" } }),
    prisma.user.create({ data: { username: `ProductivityTester${stamp}`, email: `productivity-tester-${stamp}@issueflow.local`, password_hash: passwordHash, role: "TESTER" } }),
    prisma.user.create({ data: { username: `ProductivityDevA${stamp}`, email: `productivity-dev-a-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } }),
    prisma.user.create({ data: { username: `ProductivityDevB${stamp}`, email: `productivity-dev-b-${stamp}@issueflow.local`, password_hash: passwordHash, role: "DEVELOPER" } })
  ]);
  createdUserIds.push(admin.id, tester.id, developerA.id, developerB.id);

  const statuses = ["REOPENED", "OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"];
  const severities = ["HIGH", "CRITICAL", "MEDIUM", "LOW"];
  const now = Date.now();
  for (let index = 0; index < 16; index += 1) {
    const issue = await prisma.issue.create({
      data: {
        title: index === 2 ? `Needle checkout defect ${stamp}` : `Productivity bug ${index} ${stamp}`,
        description: `Generated productivity bug ${index}.`,
        environment: index % 2 === 0 ? "Chrome desktop" : "Safari mobile",
        steps_to_reproduce: "Open the generated smoke workflow.",
        expected_result: "The productivity query is accurate.",
        actual_result: "A generated defect is present.",
        status: statuses[index % statuses.length],
        severity: severities[index % severities.length],
        created_by: tester.id,
        assigned_to: index % 3 === 0 ? developerB.id : index % 3 === 1 ? null : developerA.id,
        created_at: new Date(now - index * 60_000),
        updated_at: new Date(now - index * 30_000)
      }
    });
    createdIssueIds.push(issue.id);
  }

  const openIssue = await prisma.issue.findFirstOrThrow({ where: { id: { in: createdIssueIds }, status: "OPEN" } });
  const visibleOpenIssue = await prisma.issue.update({ where: { id: openIssue.id }, data: { assigned_to: developerA.id } });
  const hiddenIssue = await prisma.issue.findFirstOrThrow({ where: { id: { in: createdIssueIds }, assigned_to: developerB.id } });
  const combinedMatch = await prisma.issue.findFirstOrThrow({ where: { id: { in: createdIssueIds }, status: "REOPENED", severity: "HIGH" } });

  const testStatuses = ["FAILED", "PASSED", "BLOCKED", "NOT_RUN"];
  const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (let index = 0; index < 14; index += 1) {
    const testCase = await prisma.testCase.create({
      data: {
        title: index === 0 ? `Needle checkout test ${stamp}` : `Productivity test ${index} ${stamp}`,
        description: `Generated productivity test ${index}.`,
        feature_module: index % 2 === 0 ? "Checkout Smoke" : "Account Smoke",
        preconditions: "A generated smoke account exists.",
        test_steps: "Run the generated productivity scenario.",
        expected_result: "The list query remains accurate.",
        actual_result: `Generated result ${testStatuses[index % testStatuses.length]}.`,
        status: testStatuses[index % testStatuses.length],
        priority: priorities[index % priorities.length],
        created_by: tester.id,
        linked_issue_id: visibleOpenIssue.id,
        created_at: new Date(now - index * 90_000),
        updated_at: new Date(now - index * 45_000)
      }
    });
    createdTestCaseIds.push(testCase.id);
  }
  const hiddenTestCase = await prisma.testCase.create({
    data: { title: `Hidden developer test ${stamp}`, description: "Hidden from Developer A.", feature_module: "Hidden Smoke", preconditions: "Hidden bug exists.", test_steps: "Open hidden bug.", expected_result: "Developer A cannot see it.", actual_result: "Scoped correctly.", status: "FAILED", priority: "CRITICAL", created_by: tester.id, linked_issue_id: hiddenIssue.id }
  });
  createdTestCaseIds.push(hiddenTestCase.id);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3212"], { cwd: process.cwd(), stdio: "ignore" });
  await waitForServer();
  const [adminCookie, testerCookie, developerCookie] = await Promise.all([login(admin.email), login(tester.email), login(developerA.email)]);

  const titleSearch = await api(`/api/issues?q=${encodeURIComponent(`Needle checkout defect ${stamp}`)}&pageSize=50`, testerCookie);
  assert(titleSearch.response.ok && titleSearch.data.pagination.total === 1 && titleSearch.data.issues[0].title.includes("Needle checkout defect"), "Scenario A title search failed.");
  const referenceSearch = await api(`/api/issues?q=IF-${String(titleSearch.data.issues[0].id).padStart(4, "0")}`, testerCookie);
  assert(referenceSearch.data.pagination.total === 1 && referenceSearch.data.issues[0].id === titleSearch.data.issues[0].id, "Scenario A reference search failed.");

  const combined = await api("/api/issues?status=REOPENED&severity=HIGH&pageSize=50", testerCookie);
  assert(combined.data.issues.some((issue) => issue.id === combinedMatch.id) && combined.data.issues.every((issue) => issue.status === "REOPENED" && issue.severity === "HIGH"), "Scenario B combined bug filters failed.");

  const severitySorted = await api("/api/issues?sort=severity&pageSize=50", testerCookie);
  assertRanked(severitySorted.data.issues, "severity", severityRank, "Bug severity sorting");
  const newest = await api("/api/issues?sort=newest&pageSize=50", testerCookie);
  const oldest = await api("/api/issues?sort=oldest&pageSize=50", testerCookie);
  assert(new Date(newest.data.issues[0].created_at) >= new Date(newest.data.issues.at(-1).created_at), "Scenario C newest ordering failed.");
  assert(new Date(oldest.data.issues[0].created_at) <= new Date(oldest.data.issues.at(-1).created_at), "Scenario C oldest ordering failed.");

  const bugPageOne = await api("/api/issues?sort=oldest&pageSize=10&page=1", testerCookie);
  const bugPageTwo = await api("/api/issues?sort=oldest&pageSize=10&page=2", testerCookie);
  const firstIds = new Set(bugPageOne.data.issues.map((issue) => issue.id));
  assert(bugPageOne.data.pagination.total > 10 && bugPageTwo.data.issues.length > 0, "Scenario D did not produce two bug pages.");
  assert(bugPageTwo.data.issues.every((issue) => !firstIds.has(issue.id)), "Scenario D bug pages contain duplicates.");

  const testFiltered = await api(`/api/test-cases?status=FAILED&priority=CRITICAL&module=${encodeURIComponent("Checkout Smoke")}&pageSize=50`, testerCookie);
  assert(testFiltered.data.testCases.length > 0 && testFiltered.data.testCases.every((testCase) => testCase.status === "FAILED" && testCase.priority === "CRITICAL" && testCase.feature_module === "Checkout Smoke"), "Scenario E test search/filter failed.");
  const testSearch = await api(`/api/test-cases?q=${encodeURIComponent(`Needle checkout test ${stamp}`)}`, testerCookie);
  assert(testSearch.data.pagination.total === 1, "Scenario E test search failed.");

  const prioritySorted = await api("/api/test-cases?sort=priority&pageSize=50", testerCookie);
  assertRanked(prioritySorted.data.testCases, "priority", priorityRank, "Test priority sorting");
  const testPageOne = await api("/api/test-cases?sort=oldest&pageSize=10&page=1", testerCookie);
  const testPageTwo = await api("/api/test-cases?sort=oldest&pageSize=10&page=2", testerCookie);
  const firstTestIds = new Set(testPageOne.data.testCases.map((testCase) => testCase.id));
  assert(testPageOne.data.pagination.total > 10 && testPageTwo.data.testCases.every((testCase) => !firstTestIds.has(testCase.id)), "Scenario F test pagination failed.");

  const stateUrl = `/dashboard/issues?q=${encodeURIComponent(combinedMatch.title)}&status=REOPENED&severity=HIGH&assignee=${developerB.id}&linked=none&sort=severity&pageSize=25`;
  const statePage = await fetch(`${baseUrl}${stateUrl}`, { headers: { Cookie: testerCookie } });
  const stateHtml = await statePage.text();
  const filteredIssueApi = await api(`${stateUrl.replace("/dashboard", "/api")}`, testerCookie);
  assert(statePage.ok && filteredIssueApi.response.ok && filteredIssueApi.data.pagination.total === 1 && stateHtml.includes(combinedMatch.title), "Scenario G filtered Bug Report results were not restored.");
  assertFormState(stateHtml, { q: combinedMatch.title, status: "REOPENED", severity: "HIGH", assignee: developerB.id, linked: "none", sort: "severity", pageSize: 25 }, "Scenario G filtered Bug Report");
  assert(stateHtml.includes('href="/dashboard/issues"') && stateHtml.includes("Reset all") && stateHtml.includes("Reset filters"), "Scenario G Bug Report reset links are incorrect.");

  const clearIssueSearchUrl = `/dashboard/issues?status=REOPENED&severity=HIGH&assignee=${developerB.id}&linked=none&sort=severity&pageSize=25`;
  const clearIssueSearchPage = await fetch(`${baseUrl}${clearIssueSearchUrl}`, { headers: { Cookie: testerCookie } });
  const clearIssueSearchHtml = await clearIssueSearchPage.text();
  assertFormState(clearIssueSearchHtml, { q: "", status: "REOPENED", severity: "HIGH", assignee: developerB.id, linked: "none", sort: "severity", pageSize: 25 }, "Scenario G cleared Bug Report search");

  const resetIssuePage = await fetch(`${baseUrl}/dashboard/issues`, { headers: { Cookie: testerCookie } });
  const resetIssueHtml = await resetIssuePage.text();
  const resetIssueApi = await api("/api/issues", testerCookie);
  assert(resetIssuePage.url === `${baseUrl}/dashboard/issues` && resetIssueApi.data.pagination.total === resetIssueApi.data.pagination.visibleTotal, "Scenario G Bug Report reset did not restore unfiltered results.");
  assertFormState(resetIssueHtml, { q: "", status: "", severity: "", assignee: "", linked: "", sort: "updated", pageSize: 10 }, "Scenario G reset Bug Report");

  const testStateUrl = `/dashboard/test-cases?q=${encodeURIComponent(`Needle checkout test ${stamp}`)}&status=FAILED&priority=CRITICAL&module=${encodeURIComponent("Checkout Smoke")}&linked=linked&sort=priority&pageSize=25`;
  const testStatePage = await fetch(`${baseUrl}${testStateUrl}`, { headers: { Cookie: testerCookie } });
  const testStateHtml = await testStatePage.text();
  const filteredTestApi = await api(`${testStateUrl.replace("/dashboard", "/api")}`, testerCookie);
  assert(testStatePage.ok && filteredTestApi.response.ok && filteredTestApi.data.pagination.total === 1 && testStateHtml.includes(`Needle checkout test ${stamp}`), "Scenario G filtered Test Case results were not restored.");
  assertFormState(testStateHtml, { q: `Needle checkout test ${stamp}`, status: "FAILED", priority: "CRITICAL", module: "Checkout Smoke", linked: "linked", sort: "priority", pageSize: 25 }, "Scenario G filtered Test Case");
  assert(testStateHtml.includes('href="/dashboard/test-cases"') && testStateHtml.includes("Reset all") && testStateHtml.includes("Reset filters"), "Scenario G Test Case reset links are incorrect.");

  const resetTestPage = await fetch(`${baseUrl}/dashboard/test-cases`, { headers: { Cookie: testerCookie } });
  const resetTestHtml = await resetTestPage.text();
  const resetTestApi = await api("/api/test-cases", testerCookie);
  assert(resetTestPage.url === `${baseUrl}/dashboard/test-cases` && resetTestApi.data.pagination.total === resetTestApi.data.pagination.visibleTotal, "Scenario G Test Case reset did not restore unfiltered results.");
  assertFormState(resetTestHtml, { q: "", status: "", priority: "", module: "", linked: "", sort: "updated", pageSize: 10 }, "Scenario G reset Test Case");

  const [adminAll, testerAll, developerAll] = await Promise.all([
    api("/api/issues?pageSize=50", adminCookie), api("/api/issues?pageSize=50", testerCookie), api("/api/issues?pageSize=50", developerCookie)
  ]);
  const expectedDeveloperTotal = await prisma.issue.count({ where: { OR: [{ assigned_to: developerA.id }, { assigned_to: null }] } });
  assert(adminAll.data.pagination.total === testerAll.data.pagination.total, "Scenario H Admin and Tester organization totals differ.");
  assert(developerAll.data.pagination.total === expectedDeveloperTotal && !developerAll.data.issues.some((issue) => issue.id === hiddenIssue.id), "Scenario H Developer scope is incorrect.");
  const manipulated = await api(`/api/issues?assignee=${developerB.id}&q=${encodeURIComponent(hiddenIssue.title)}&pageSize=50`, developerCookie);
  assert(manipulated.data.pagination.total === 0 && manipulated.data.pagination.visibleTotal === expectedDeveloperTotal, "Scenario H query manipulation exposed or leaked hidden bugs.");
  const hiddenTest = await api(`/api/test-cases?q=${encodeURIComponent(hiddenTestCase.title)}`, developerCookie);
  assert(hiddenTest.data.pagination.total === 0, "Scenario H exposed a hidden linked test case.");

  const noMatch = await api(`/api/issues?q=${encodeURIComponent(`No-match-${stamp}`)}`, testerCookie);
  const noMatchPage = await fetch(`${baseUrl}/dashboard/issues?q=${encodeURIComponent(`No-match-${stamp}`)}`, { headers: { Cookie: testerCookie } });
  const noMatchHtml = await noMatchPage.text();
  assert(noMatch.data.pagination.total === 0 && noMatchHtml.includes("No bug reports match your current search and filters.") && noMatchHtml.includes("Clear search and filters"), "Scenario I filtered empty state failed.");

  const failedTestId = createdTestCaseIds[0];
  const createdBug = await api("/api/issues", testerCookie, { method: "POST", body: JSON.stringify({ title: `Bug from failed smoke test ${stamp}`, description: "Regression workflow bug.", environment: "Chrome smoke", steps_to_reproduce: "Run the failed test.", expected_result: "Test passes.", actual_result: "Test fails.", severity: "HIGH", status: "OPEN", assigned_to: developerA.id, linked_test_case_id: failedTestId }) });
  assert(createdBug.response.status === 201 && createdBug.data.issue.linked_test_case_id === failedTestId, "Scenario J Failed Test to Bug Report failed.");
  createdIssueIds.push(createdBug.data.issue.id);
  const comment = await api(`/api/issues/${visibleOpenIssue.id}/comments`, testerCookie, { method: "POST", body: JSON.stringify({ content: `Productivity regression comment ${stamp}` }) });
  const transition = await api(`/api/issues/${visibleOpenIssue.id}`, developerCookie, { method: "PATCH", body: JSON.stringify({ status: "IN_PROGRESS" }) });
  const activity = await api(`/api/issues/${visibleOpenIssue.id}/activity`, adminCookie);
  const analytics = await api("/api/analytics", testerCookie);
  const actualBugTotal = await prisma.issue.count();
  assert(comment.response.status === 201 && transition.response.ok && activity.data.activity.some((entry) => entry.action_type === "COMMENT_ADDED") && activity.data.activity.some((entry) => entry.action_type === "STATUS_CHANGED"), "Scenario J comments/activity/lifecycle regression failed.");
  assert(analytics.response.ok && analytics.data.analytics.summary.totalBugReports === actualBugTotal, "Scenario J analytics regression failed.");

  console.log(JSON.stringify({
    scenarioA: "passed", scenarioB: "passed", scenarioC: "passed", scenarioD: "passed", scenarioE: "passed",
    scenarioF: "passed", scenarioG: "passed", scenarioH: "passed", scenarioI: "passed", scenarioJ: "passed",
    bugTotal: testerAll.data.pagination.total, developerVisibleTotal: developerAll.data.pagination.total,
    testTotal: testPageOne.data.pagination.total
  }, null, 2));
} finally {
  server?.kill();
  if (createdIssueIds.length) {
    await prisma.issue.updateMany({ where: { id: { in: createdIssueIds } }, data: { linked_test_case_id: null } });
    await prisma.testCase.updateMany({ where: { linked_issue_id: { in: createdIssueIds } }, data: { linked_issue_id: null } });
    await prisma.attachment.deleteMany({ where: { issue_id: { in: createdIssueIds } } });
    await prisma.issueComment.deleteMany({ where: { issue_id: { in: createdIssueIds } } });
    await prisma.issueActivity.deleteMany({ where: { issue_id: { in: createdIssueIds } } });
  }
  if (createdTestCaseIds.length) await prisma.testCase.deleteMany({ where: { id: { in: createdTestCaseIds } } });
  if (createdIssueIds.length) await prisma.issue.deleteMany({ where: { id: { in: createdIssueIds } } });
  if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
}
