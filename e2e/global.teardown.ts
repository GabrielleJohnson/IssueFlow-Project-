import { existsSync } from "node:fs";
import { clearE2EData, prisma } from "./support/database";
import { E2E_DATABASE_PATH, E2E_DATABASE_URL } from "./support/environment";

export default async function globalTeardown() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;

  if (existsSync(E2E_DATABASE_PATH)) {
    await clearE2EData();
  }
  await prisma.$disconnect();
}
