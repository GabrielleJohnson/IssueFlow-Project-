import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadDatabaseEnvironment } from "./lib/database-url.mjs";

loadDatabaseEnvironment();
mkdirSync(join(process.cwd(), "uploads", "issues"), { recursive: true });

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

console.log("IssueFlow PostgreSQL migrations applied.");
console.log("IssueFlow uploads folder ready.");
