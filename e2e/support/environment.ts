import path from "node:path";

export const E2E_PORT = 3318;
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const E2E_DATABASE_PATH = path.join(process.cwd(), "prisma", "e2e.db");
// Prisma resolves relative SQLite URLs from the schema directory.
export const E2E_DATABASE_URL = "file:./e2e.db";
export const E2E_AUTH_SECRET = "issueflow-e2e-local-only-secret";
export const E2E_PASSWORD = "IssueFlow-E2E-Only-2026!";

export const E2E_USERS = {
  admin: {
    username: "E2E-Admin",
    email: "e2e-admin@e2e.issueflow.local",
    role: "ADMIN"
  },
  tester: {
    username: "E2E-Tester",
    email: "e2e-tester@e2e.issueflow.local",
    role: "TESTER"
  },
  developer: {
    username: "E2E-Developer",
    email: "e2e-developer@e2e.issueflow.local",
    role: "DEVELOPER"
  },
  roleTarget: {
    username: "E2E-RoleTarget",
    email: "e2e-role-target@e2e.issueflow.local",
    role: "TESTER"
  },
  longIdentity: {
    username: "E2E-Developer-With-An-Intentionally-Long-Responsive-Username",
    email: "e2e-developer-with-an-intentionally-long-responsive-email@e2e.issueflow.local",
    role: "DEVELOPER"
  }
} as const;

export type E2ERole = "admin" | "tester" | "developer" | "roleTarget" | "longIdentity";
