import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createRoleChangeState, roleChangeReducer } from "../lib/roleChangeState.ts";
import { resetTestDatabase } from "./lib/postgres-test-database.mjs";

const baseUrl = "http://127.0.0.1:3214";
const authSecret = "issueflow-rbac-smoke-secret";
const password = "RoleSafety123!";
let prisma;
let server;

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("RBAC smoke server did not start.");
}

async function login(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200, `Login failed for ${email}.`);
  return cookieFrom(response);
}

async function changeRole(cookie, userId, role) {
  const response = await fetch(`${baseUrl}/api/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ role })
  });
  const data = await response.json();
  return { response, data };
}

try {
  await resetTestDatabase("issueflow_smoke_rbac");
  prisma = new PrismaClient();

  let state = createRoleChangeState("ADMIN");
  state = roleChangeReducer(state, { type: "select", role: "DEVELOPER" });
  assert.equal(state.savedRole, "ADMIN", "Selecting a role changed the saved role before confirmation.");
  assert.equal(state.pendingRole, "DEVELOPER", "Selecting a role did not stage confirmation.");
  state = roleChangeReducer(state, { type: "cancel" });
  assert.deepEqual(state, createRoleChangeState("ADMIN"), "Cancel did not restore the saved role.");

  state = roleChangeReducer(state, { type: "select", role: "DEVELOPER" });
  state = roleChangeReducer(state, { type: "saveFailed", error: "At least one admin must remain." });
  assert.equal(state.selectedRole, "ADMIN", "A rejected role change left stale selector state.");
  assert.equal(state.error, "At least one admin must remain.");

  const passwordHash = await hash(password, 12);
  const adminA = await prisma.user.create({ data: { username: "RoleAdminA", email: "role-admin-a@issueflow.local", password_hash: passwordHash, role: "ADMIN" } });
  const adminB = await prisma.user.create({ data: { username: "RoleAdminB", email: "role-admin-b@issueflow.local", password_hash: passwordHash, role: "ADMIN" } });
  const developer = await prisma.user.create({ data: { username: "RoleDeveloper", email: "role-developer@issueflow.local", password_hash: passwordHash, role: "DEVELOPER" } });
  const adminAId = adminA.id;
  const adminBId = adminB.id;
  const developerId = developer.id;

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3214"], {
    cwd: process.cwd(),
    env: { ...process.env, AUTH_SECRET: authSecret },
    stdio: "ignore"
  });
  await waitForServer();

  const [adminACookie, adminBCookie] = await Promise.all([
    login("role-admin-a@issueflow.local"),
    login("role-admin-b@issueflow.local")
  ]);

  const otherUserChange = await changeRole(adminACookie, developerId, "TESTER");
  assert.equal(otherUserChange.response.status, 200, "Confirmed role change for another user failed.");
  assert.equal(otherUserChange.data.user.role, "TESTER");

  const selfDemotion = await changeRole(adminACookie, adminAId, "DEVELOPER");
  assert.equal(selfDemotion.response.status, 200, "Self-demotion was rejected while another admin remained.");
  assert.equal(selfDemotion.data.user.role, "DEVELOPER");

  const restoreAdminA = await changeRole(adminBCookie, adminAId, "ADMIN");
  assert.equal(restoreAdminA.response.status, 200, "Synthetic admin restoration failed.");
  const demoteAdminB = await changeRole(adminACookie, adminBId, "TESTER");
  assert.equal(demoteAdminB.response.status, 200, "Could not establish the single-admin fixture.");

  const unsafeDemotion = await changeRole(adminACookie, adminAId, "DEVELOPER");
  assert.equal(unsafeDemotion.response.status, 400, "The final admin was allowed to demote themselves.");
  assert.equal(unsafeDemotion.data.error, "At least one admin must remain.");

  const remainingAdmin = await prisma.user.findUniqueOrThrow({ where: { id: adminAId } });
  assert.equal(remainingAdmin.role, "ADMIN", "Rejected final-admin demotion changed the database.");

  console.log(JSON.stringify({
    stagedConfirmation: "passed",
    cancelRestoresRole: "passed",
    failureRestoresRole: "passed",
    otherUserRoleChange: "passed",
    selfDemotionWithAnotherAdmin: "passed",
    lastAdminProtection: "passed"
  }, null, 2));
} finally {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit").catch(() => null);
  }
  await prisma?.$disconnect();
  await resetTestDatabase("issueflow_smoke_rbac");
}
