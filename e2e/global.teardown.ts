import { clearE2EData, prisma } from "./support/database";
import { E2E_DATABASE_URL, E2E_DATABASE_URL_POOLED } from "./support/environment";

export default async function globalTeardown() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  process.env.DATABASE_URL_POOLED = E2E_DATABASE_URL_POOLED;

  await clearE2EData();
  await prisma.$disconnect();
}
