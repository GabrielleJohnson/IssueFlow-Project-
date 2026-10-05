import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { databaseUrlForSchema, loadDatabaseEnvironment } from "./database-url.mjs";

const baseUrls = loadDatabaseEnvironment();

function assertTestSchema(schema) {
  if (!/^issueflow_(e2e|smoke_[a-z0-9_]+)$/.test(schema)) {
    throw new Error(`Refusing to reset non-test PostgreSQL schema: ${schema}`);
  }
}

export function configureTestDatabase(schema) {
  assertTestSchema(schema);
  const directUrl = databaseUrlForSchema(baseUrls.directUrl, schema);
  const pooledUrl = databaseUrlForSchema(baseUrls.pooledUrl, schema);
  process.env.DATABASE_URL = directUrl;
  process.env.DATABASE_URL_POOLED = pooledUrl;
  return { directUrl, pooledUrl };
}

export async function resetTestDatabase(schema) {
  assertTestSchema(schema);
  const admin = new PrismaClient({ datasourceUrl: databaseUrlForSchema(baseUrls.directUrl, "public") });

  try {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await admin.$disconnect();
  }

  configureTestDatabase(schema);
  const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
}
