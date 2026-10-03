import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { clearE2EData, prisma, seedE2EUsers } from "./support/database";
import {
  E2E_AUTH_SECRET,
  E2E_DATABASE_PATH,
  E2E_DATABASE_URL
} from "./support/environment";

export default async function globalSetup() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  process.env.AUTH_SECRET = E2E_AUTH_SECRET;

  await prisma.$disconnect();
  await rm(E2E_DATABASE_PATH, { force: true });
  await rm(`${E2E_DATABASE_PATH}-journal`, { force: true });

  execFileSync(process.execPath, ["scripts/init-db.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: E2E_AUTH_SECRET,
      ISSUEFLOW_DB_PATH: E2E_DATABASE_PATH
    },
    stdio: "inherit"
  });

  await clearE2EData();
  await seedE2EUsers();
  await prisma.$disconnect();
}
