const { execFileSync, spawn } = await import("node:child_process");
const { resetTestDatabase } = await import("./lib/postgres-test-database.mjs");
const { PNG_BYTES, uploadEvidence } = await import("./lib/evidence-upload.mjs");

process.env.AUTH_SECRET = "issueflow-local-development-secret";
process.env.EVIDENCE_STORAGE_DRIVER = "memory";
process.env.EVIDENCE_STORAGE_TEST_MODE = "true";
await resetTestDatabase("issueflow_smoke_v04");

const { PrismaClient } = await import("@prisma/client");
const bcrypt = await import("bcryptjs");

const prisma = new PrismaClient();
const baseUrl = "http://127.0.0.1:3210";
const stamp = Date.now();
let server;

try {
const users = {
  admin: { username: `SmokeAdmin${stamp}`, email: `smoke-admin-${stamp}@issueflow.local`, password: "SmokePass123!", role: "ADMIN" },
  tester: { username: `SmokeTester${stamp}`, email: `smoke-tester-${stamp}@issueflow.local`, password: "SmokePass123!", role: "TESTER" },
  developerA: { username: `SmokeDevA${stamp}`, email: `smoke-dev-a-${stamp}@issueflow.local`, password: "SmokePass123!", role: "DEVELOPER" },
  developerB: { username: `SmokeDevB${stamp}`, email: `smoke-dev-b-${stamp}@issueflow.local`, password: "SmokePass123!", role: "DEVELOPER" }
};

for (const user of Object.values(users)) {
  await prisma.user.upsert({
    where: { email: user.email },
    update: { role: user.role, password_hash: await bcrypt.hash(user.password, 12) },
    create: { username: user.username, email: user.email, role: user.role, password_hash: await bcrypt.hash(user.password, 12) }
  });
}

server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3210"], {
  cwd: process.cwd(),
  stdio: "pipe"
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not start. Output: ${serverOutput}`);
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function login(user) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  if (!response.ok) throw new Error(`Login failed for ${user.email}: ${response.status} ${await response.text()}`);
  return cookieFrom(response);
}

async function request(method, path, cookie, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await waitForServer();
const adminCookie = await login(users.admin);
const testerCookie = await login(users.tester);
const devACookie = await login(users.developerA);
const devBCookie = await login(users.developerB);
const devA = await prisma.user.findUniqueOrThrow({ where: { email: users.developerA.email } });
const devB = await prisma.user.findUniqueOrThrow({ where: { email: users.developerB.email } });

const createIssue = await request("POST", "/api/issues", testerCookie, {
  title: "Smoke lifecycle bug",
  description: "Checkout smoke defect for lifecycle testing.",
  environment: "Chrome smoke test",
  steps_to_reproduce: "1. Open checkout\n2. Apply smoke coupon",
  expected_result: "Total remains stable.",
  actual_result: "Total changes unexpectedly.",
  severity: "HIGH",
  status: "OPEN",
  assigned_to: devA.id
});
assert(createIssue.response.status === 201, `Tester create bug failed: ${createIssue.response.status} ${JSON.stringify(createIssue.data)}`);
const issueId = createIssue.data.issue.id;
assert(createIssue.data.issue.status === "OPEN", "New bug did not start OPEN.");
assert(createIssue.data.issue.assigned_to === devA.id, "Bug was not assigned to Developer A.");

let invalid = await request("PATCH", `/api/issues/${issueId}`, devACookie, { status: "RESOLVED" });
assert(invalid.response.status === 403, `Invalid OPEN -> RESOLVED was not rejected: ${invalid.response.status}`);

for (const nextStatus of ["IN_PROGRESS", "IN_REVIEW", "RESOLVED"]) {
  const result = await request("PATCH", `/api/issues/${issueId}`, devACookie, { status: nextStatus });
  assert(result.response.ok, `Developer transition to ${nextStatus} failed: ${result.response.status} ${JSON.stringify(result.data)}`);
}

let reopen = await request("PATCH", `/api/issues/${issueId}`, testerCookie, { status: "REOPENED", reopen_reason: "Smoke retest still failed." });
assert(reopen.response.ok && reopen.data.issue.status === "REOPENED", "Tester could not reopen resolved bug.");

let reopenedProgress = await request("PATCH", `/api/issues/${issueId}`, devACookie, { status: "IN_PROGRESS" });
assert(reopenedProgress.response.ok && reopenedProgress.data.issue.status === "IN_PROGRESS", "Developer could not move REOPENED -> IN_PROGRESS.");

for (const nextStatus of ["IN_REVIEW", "RESOLVED"]) {
  const result = await request("PATCH", `/api/issues/${issueId}`, devACookie, { status: nextStatus });
  assert(result.response.ok, `Developer second transition to ${nextStatus} failed: ${result.response.status}`);
}

let close = await request("PATCH", `/api/issues/${issueId}`, testerCookie, { status: "CLOSED" });
assert(close.response.ok && close.data.issue.status === "CLOSED", "Tester could not verify and close resolved bug.");

let testerComment = await request("POST", `/api/issues/${issueId}/comments`, testerCookie, { content: "Tester smoke comment." });
assert(testerComment.response.status === 201, "Tester comment failed.");
let devComment = await request("POST", `/api/issues/${issueId}/comments`, devACookie, { content: "Developer smoke reply." });
assert(devComment.response.status === 201, "Developer comment failed.");
let comments = await request("GET", `/api/issues/${issueId}/comments`, devACookie);
assert(comments.response.ok && comments.data.comments.length >= 2, "Comments did not load for developer.");

let assignB = await request("PATCH", `/api/issues/${issueId}`, adminCookie, { status: "REOPENED" });
assert(assignB.response.ok, "Admin could not reopen closed bug for assignment test.");
assignB = await request("PATCH", `/api/issues/${issueId}`, adminCookie, {
  title: "Smoke lifecycle bug",
  description: "Checkout smoke defect for lifecycle testing.",
  environment: "Chrome smoke test",
  steps_to_reproduce: "1. Open checkout\n2. Apply smoke coupon",
  expected_result: "Total remains stable.",
  actual_result: "Total changes unexpectedly.",
  severity: "HIGH",
  status: "REOPENED",
  assigned_to: devB.id
});
assert(assignB.response.ok && assignB.data.issue.assigned_to === devB.id, "Admin reassign to Developer B failed.");
let assignedPage = await fetch(`${baseUrl}/dashboard/issues/assigned`, { headers: { Cookie: devBCookie } });
assert(assignedPage.ok, "Developer B could not access My Assigned Bugs page.");
let devAForbidden = await request("DELETE", `/api/issues/${issueId}`, devACookie);
assert(devAForbidden.response.status === 403, "Developer delete bug was not forbidden.");
let testerUsers = await fetch(`${baseUrl}/dashboard/users`, { headers: { Cookie: testerCookie }, redirect: "manual" });
assert([303, 307, 308].includes(testerUsers.status) || testerUsers.url.endsWith("/dashboard"), "Tester was not redirected away from admin users page.");
let developerAssign = await request("PATCH", `/api/issues/${issueId}`, devBCookie, {
  title: "Smoke lifecycle bug",
  description: "Checkout smoke defect for lifecycle testing.",
  environment: "Chrome smoke test",
  steps_to_reproduce: "1. Open checkout\n2. Apply smoke coupon",
  expected_result: "Total remains stable.",
  actual_result: "Total changes unexpectedly.",
  severity: "HIGH",
  status: "REOPENED",
  assigned_to: devA.id
});
assert(developerAssign.response.status === 403, "Developer assignment change was not forbidden.");

const uploaded = await uploadEvidence({ baseUrl, issueId, cookie: testerCookie, name: `smoke-${stamp}.png`, type: "image/png", bytes: PNG_BYTES });
const uploadResponse = uploaded.response;
const uploadData = uploaded.data;
assert(uploadResponse.status === 201, `Evidence upload failed: ${uploadResponse.status} ${JSON.stringify(uploadData)}`);
const attachmentId = uploadData.attachments[0].id;
const deleteEvidence = await fetch(`${baseUrl}/api/attachments/${attachmentId}`, { method: "DELETE", headers: { Cookie: testerCookie } });
assert(deleteEvidence.ok, "Tester could not delete own evidence.");

const activity = await request("GET", `/api/issues/${issueId}/activity`, adminCookie);
assert(activity.response.ok, "Activity did not load.");
const messages = activity.data.activity.map((item) => `${item.action_type}: ${item.message}`).join("\n");
for (const action of ["ISSUE_CREATED", "STATUS_CHANGED", "ISSUE_REOPENED", "ASSIGNEE_CHANGED", "EVIDENCE_UPLOADED", "EVIDENCE_DELETED", "COMMENT_ADDED", "ISSUE_RESOLVED", "ISSUE_CLOSED"]) {
  assert(messages.includes(action), `Missing activity action ${action}. Activity:\n${messages}`);
}

console.log(JSON.stringify({
  issueId,
  scenarioA: "passed",
  scenarioB: "passed",
  scenarioC: "passed",
  scenarioD: "passed",
  scenarioE: "passed",
  scenarioF: "passed",
  activityCount: activity.data.activity.length,
  commentsCount: comments.data.comments.length
}, null, 2));
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        server.kill();
      }
    } else {
      server.kill();
    }
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  }

  await prisma.$disconnect();
  await resetTestDatabase("issueflow_smoke_v04");
}

