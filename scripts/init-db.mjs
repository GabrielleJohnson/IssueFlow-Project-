import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "prisma", "dev.db");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((field) => field.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'TESTER',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

if (!columnExists("users", "role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'TESTER';");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'Not specified',
    steps_to_reproduce TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_by INTEGER NOT NULL,
    assigned_to INTEGER,
    linked_test_case_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (linked_test_case_id) REFERENCES test_cases(id) ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

if (!columnExists("issues", "environment")) {
  db.exec("ALTER TABLE issues ADD COLUMN environment TEXT NOT NULL DEFAULT 'Not specified';");
}

if (!columnExists("issues", "linked_test_case_id")) {
  db.exec("ALTER TABLE issues ADD COLUMN linked_test_case_id INTEGER;");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS issues_created_by_idx ON issues(created_by);
  CREATE INDEX IF NOT EXISTS issues_assigned_to_idx ON issues(assigned_to);
  CREATE INDEX IF NOT EXISTS issues_linked_test_case_id_idx ON issues(linked_test_case_id);

  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    feature_module TEXT NOT NULL DEFAULT 'General',
    preconditions TEXT NOT NULL,
    test_steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    actual_result TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NOT_RUN',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    created_by INTEGER NOT NULL,
    linked_issue_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (linked_issue_id) REFERENCES issues(id) ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

if (!columnExists("test_cases", "feature_module")) {
  db.exec("ALTER TABLE test_cases ADD COLUMN feature_module TEXT NOT NULL DEFAULT 'General';");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS test_cases_created_by_idx ON test_cases(created_by);
  CREATE INDEX IF NOT EXISTS test_cases_linked_issue_id_idx ON test_cases(linked_issue_id);
`);

db.close();
console.log(`IssueFlow SQLite database ready at ${dbPath}`);
