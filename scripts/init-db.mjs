import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.ISSUEFLOW_DB_PATH
  ? resolve(process.env.ISSUEFLOW_DB_PATH)
  : join(__dirname, "..", "prisma", "dev.db");
const uploadsPath = join(__dirname, "..", "uploads", "issues");

mkdirSync(dirname(dbPath), { recursive: true });
mkdirSync(uploadsPath, { recursive: true });

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
    origin_execution_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (linked_test_case_id) REFERENCES test_cases(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (origin_execution_id) REFERENCES test_executions(id) ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

if (!columnExists("issues", "environment")) {
  db.exec("ALTER TABLE issues ADD COLUMN environment TEXT NOT NULL DEFAULT 'Not specified';");
}

if (!columnExists("issues", "linked_test_case_id")) {
  db.exec("ALTER TABLE issues ADD COLUMN linked_test_case_id INTEGER;");
}

if (!columnExists("issues", "origin_execution_id")) {
  db.exec("ALTER TABLE issues ADD COLUMN origin_execution_id INTEGER;");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS issues_created_by_idx ON issues(created_by);
  CREATE INDEX IF NOT EXISTS issues_assigned_to_idx ON issues(assigned_to);
  CREATE INDEX IF NOT EXISTS issues_linked_test_case_id_idx ON issues(linked_test_case_id);
  CREATE UNIQUE INDEX IF NOT EXISTS issues_origin_execution_id_key ON issues(origin_execution_id);

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

  CREATE TABLE IF NOT EXISTS test_suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS test_suites_created_by_idx ON test_suites(created_by);

  CREATE TABLE IF NOT EXISTS test_suite_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL,
    test_case_id INTEGER NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (suite_id, test_case_id)
  );

  CREATE INDEX IF NOT EXISTS test_suite_cases_test_case_id_idx ON test_suite_cases(test_case_id);

  CREATE TABLE IF NOT EXISTS test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER,
    suite_name TEXT NOT NULL,
    release_label TEXT NOT NULL,
    environment TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    created_by INTEGER NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suite_id) REFERENCES test_suites(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS test_runs_suite_id_idx ON test_runs(suite_id);
  CREATE INDEX IF NOT EXISTS test_runs_created_by_idx ON test_runs(created_by);

  CREATE TABLE IF NOT EXISTS test_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    test_case_id INTEGER,
    test_case_reference TEXT NOT NULL,
    title_snapshot TEXT NOT NULL,
    description_snapshot TEXT NOT NULL,
    feature_module_snapshot TEXT NOT NULL,
    preconditions_snapshot TEXT NOT NULL,
    test_steps_snapshot TEXT NOT NULL,
    expected_result_snapshot TEXT NOT NULL,
    priority_snapshot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NOT_RUN',
    actual_result TEXT NOT NULL DEFAULT '',
    executed_by INTEGER,
    executed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE (run_id, test_case_id)
  );

  CREATE INDEX IF NOT EXISTS test_executions_test_case_id_idx ON test_executions(test_case_id);
  CREATE INDEX IF NOT EXISTS test_executions_executed_by_idx ON test_executions(executed_by);
  CREATE INDEX IF NOT EXISTS test_executions_status_idx ON test_executions(status);

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filepath TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    filesize INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    issue_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS attachments_uploaded_by_idx ON attachments(uploaded_by);
  CREATE INDEX IF NOT EXISTS attachments_issue_id_idx ON attachments(issue_id);

  CREATE TABLE IF NOT EXISTS issue_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    issue_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS issue_comments_issue_id_idx ON issue_comments(issue_id);
  CREATE INDEX IF NOT EXISTS issue_comments_author_id_idx ON issue_comments(author_id);

  CREATE TABLE IF NOT EXISTS issue_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    actor_id INTEGER,
    action_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE INDEX IF NOT EXISTS issue_activities_issue_id_idx ON issue_activities(issue_id);
  CREATE INDEX IF NOT EXISTS issue_activities_actor_id_idx ON issue_activities(actor_id);
`);

db.close();
console.log(`IssueFlow SQLite database ready at ${dbPath}`);
console.log(`IssueFlow uploads folder ready at ${uploadsPath}`);
