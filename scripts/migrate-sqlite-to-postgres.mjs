import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadDatabaseEnvironment } from "./lib/database-url.mjs";

const sourcePath = join(process.cwd(), "prisma", "dev.db");
if (!existsSync(sourcePath)) throw new Error(`SQLite source not found at ${sourcePath}`);

const { directUrl } = loadDatabaseEnvironment();
const source = new DatabaseSync(sourcePath, { readOnly: true });
const prisma = new PrismaClient({ datasourceUrl: directUrl });

const tables = [
  ["users", "user"],
  ["test_suites", "testSuite"],
  ["test_cases", "testCase"],
  ["requirements", "requirement"],
  ["releases", "release"],
  ["test_suite_cases", "testSuiteCase"],
  ["requirement_test_cases", "requirementTestCase"],
  ["release_requirements", "releaseRequirement"],
  ["test_runs", "testRun"],
  ["test_executions", "testExecution"],
  ["issues", "issue"],
  ["attachments", "attachment"],
  ["issue_comments", "issueComment"],
  ["issue_activities", "issueActivity"]
];
const dateFields = new Set([
  "created_at", "updated_at", "added_at", "linked_at", "started_at",
  "completed_at", "executed_at", "target_date"
]);

function sourceRows(table) {
  return source.prepare(`SELECT * FROM "${table}" ORDER BY id`).all();
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    dateFields.has(key) && value !== null ? new Date(value) : value
  ]));
}

const counts = Object.fromEntries(tables.map(([table]) => [table, sourceRows(table).length]));
console.log("SQLite rows prepared for PostgreSQL import:");
for (const [table, count] of Object.entries(counts)) console.log(`  ${table}: ${count}`);

try {
  const occupied = [];
  for (const [table, delegate] of tables) {
    const count = await prisma[delegate].count();
    if (count > 0) occupied.push(`${table}=${count}`);
  }
  if (occupied.length) {
    throw new Error(`PostgreSQL destination is not empty; import was not started (${occupied.join(", ")}).`);
  }

  await prisma.$transaction(async (tx) => {
    for (const [table, delegate] of tables) {
      const rows = sourceRows(table).map(normalizeRow);
      const importRows = table === "test_cases"
        ? rows.map((row) => ({ ...row, linked_issue_id: null }))
        : table === "attachments"
          ? rows.map(({ filepath, ...row }) => ({ ...row, object_key: filepath }))
          : rows;
      if (importRows.length) await tx[delegate].createMany({ data: importRows });
    }

    for (const row of sourceRows("test_cases")) {
      if (row.linked_issue_id !== null) {
        await tx.testCase.update({
          where: { id: row.id },
          data: {
            linked_issue_id: row.linked_issue_id,
            updated_at: new Date(row.updated_at)
          }
        });
      }
    }

    for (const [table] of tables) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`
      );
    }
  }, { maxWait: 20_000, timeout: 120_000 });

  console.log("SQLite data imported into PostgreSQL without changing the source database.");
} finally {
  source.close();
  await prisma.$disconnect();
}
