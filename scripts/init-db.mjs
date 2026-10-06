import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadDatabaseEnvironment } from "./lib/database-url.mjs";

loadDatabaseEnvironment();
const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
});

console.log("IssueFlow PostgreSQL migrations applied.");
