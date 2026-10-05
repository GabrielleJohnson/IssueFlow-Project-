import { clearE2EData, prisma, seedE2EUsers } from "./support/database";
import {
  E2E_AUTH_SECRET,
  E2E_DATABASE_SCHEMA,
  E2E_DATABASE_URL,
  E2E_DATABASE_URL_POOLED
} from "./support/environment";
import { resetTestDatabase } from "../scripts/lib/postgres-test-database.mjs";

export default async function globalSetup() {
  process.env.DATABASE_URL = E2E_DATABASE_URL;
  process.env.DATABASE_URL_POOLED = E2E_DATABASE_URL_POOLED;
  process.env.AUTH_SECRET = E2E_AUTH_SECRET;

  await prisma.$disconnect();
  await resetTestDatabase(E2E_DATABASE_SCHEMA);

  await clearE2EData();
  await seedE2EUsers();
  await prisma.$disconnect();
}
