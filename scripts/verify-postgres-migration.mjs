import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadDatabaseEnvironment } from "./lib/database-url.mjs";

const { directUrl } = loadDatabaseEnvironment();
const source = new DatabaseSync(join(process.cwd(), "prisma", "dev.db"), { readOnly: true });
const prisma = new PrismaClient({ datasourceUrl: directUrl });
const tables = [
  "users", "issues", "test_cases", "test_suites", "test_suite_cases", "test_runs",
  "test_executions", "attachments", "issue_comments", "issue_activities", "requirements",
  "requirement_test_cases", "releases", "release_requirements"
];
const dateFields = new Set([
  "created_at", "updated_at", "added_at", "linked_at", "started_at",
  "completed_at", "executed_at", "target_date"
]);

function normalizeValue(key, value) {
  if (value === null) return null;
  if (dateFields.has(key)) return new Date(value).toISOString();
  return value;
}

function canonicalRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.keys(row).sort().map((key) => [key, normalizeValue(key, row[key])])
  ));
}

function mismatchedFields(sourceRows, destinationRows) {
  const destinationById = new Map(destinationRows.map((row) => [row.id, row]));
  return sourceRows.flatMap((row) => {
    const destination = destinationById.get(row.id);
    if (!destination) return [`id=${row.id}:missing`];
    return Object.keys(row)
      .filter((key) => normalizeValue(key, row[key]) !== normalizeValue(key, destination[key]))
      .map((key) => `id=${row.id}:${key}`);
  });
}

try {
  const results = [];
  for (const table of tables) {
    const sqliteRows = source.prepare(`SELECT * FROM "${table}" ORDER BY id`).all();
    const postgresRows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY id`);
    const matches = JSON.stringify(canonicalRows(sqliteRows)) === JSON.stringify(canonicalRows(postgresRows));
    results.push({
      table,
      source: sqliteRows.length,
      destination: postgresRows.length,
      matches,
      mismatches: matches ? [] : mismatchedFields(sqliteRows, postgresRows)
    });
  }

  const failures = results.filter((result) => !result.matches);
  for (const result of results) {
    console.log(`${result.table}: source=${result.source}, destination=${result.destination}, data=${result.matches ? "MATCH" : "MISMATCH"}`);
    if (result.mismatches.length) console.log(`  differing fields: ${result.mismatches.join(", ")}`);
  }
  if (failures.length) {
    throw new Error(`PostgreSQL verification failed for: ${failures.map((result) => result.table).join(", ")}`);
  }
  console.log("All migrated rows, IDs, timestamps, metadata, and relationships match the SQLite source.");
} finally {
  source.close();
  await prisma.$disconnect();
}
