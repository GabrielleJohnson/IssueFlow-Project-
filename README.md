# IssueFlow

IssueFlow is a QA-focused issue tracking platform for testers and small development teams. It includes a polished landing page, protected dashboard, local authentication, SQLite user storage, issue CRUD, test case CRUD, local evidence uploads for bug reports, role-based access control, and GSAP-powered section reveals.

## Local setup

Install dependencies:

```powershell
npm.cmd install
```

Create or update your local SQLite database:

```powershell
npm.cmd run db:init
```

Generate the Prisma client after schema or dependency changes:

```powershell
npm.cmd run db:generate
```

Run the app:

```powershell
npm.cmd run dev
```

Open http://localhost:3000.

## Auth routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Passwords are hashed with bcrypt before saving. Sessions are stored in an httpOnly JWT cookie named `issueflow_session`.

## Issue routes

- `GET /api/issues`
- `POST /api/issues`
- `GET /api/issues/:id`
- `PATCH /api/issues/:id`
- `DELETE /api/issues/:id`

Issue creation uses the logged-in user as `created_by`. Admins can edit/delete any bug report, testers can create and edit their own bug reports, and developers can view assigned/unassigned bug reports and update status only.

## Test case routes

- `GET /api/test-cases`
- `POST /api/test-cases`
- `GET /api/test-cases/:id`
- `PATCH /api/test-cases/:id`
- `DELETE /api/test-cases/:id`

Test case creation uses the logged-in user as `created_by`. Admins and testers can create/edit test cases. Only admins can delete test cases. Developers can view test cases linked to bug reports they can access.

## v0.7.0 Test Management & Execution

Reusable Test Cases can now be organized into Test Suites and executed in historical Test Runs.

- A Test Case may belong to multiple suites. Removing or deleting a suite never deletes its Test Cases.
- Starting a run snapshots the suite membership and the execution-critical Test Case fields. Later suite or Test Case edits do not rewrite that run.
- Each execution records `NOT_RUN`, `PASSED`, `FAILED`, or `BLOCKED`, plus actual-result notes, executor, and timestamp.
- A new run is the regression/rerun workflow. Previous executions are never reset or overwritten.
- Runs include a lightweight release/build label and environment; no release-planning system is introduced.
- A failed execution can create one traced Bug Report. Duplicate bugs for the same execution are rejected.

For backward compatibility, recording a run execution also updates the reusable Test Case's existing status and actual-result fields to its latest result. Historical truth remains in immutable execution records, and execution analytics use only v0.7 run data rather than interpreting older Test Case status values as history.

Test management API routes:

- `GET /api/test-suites`
- `POST /api/test-suites`
- `GET /api/test-suites/:id`
- `PATCH /api/test-suites/:id`
- `DELETE /api/test-suites/:id`
- `POST /api/test-suites/:id/cases`
- `DELETE /api/test-suites/:id/cases`
- `GET /api/test-runs`
- `POST /api/test-runs`
- `GET /api/test-runs/:id`
- `PATCH /api/test-runs/:id`
- `DELETE /api/test-runs/:id` (Admin only)
- `PATCH /api/test-executions/:id`

Testers can manage their own suites, start runs, record results, and create bugs from failed executions. Admins can manage all suites and runs, including run deletion. Developers cannot browse or mutate QA management endpoints; they see execution context only through Bug Reports already permitted by their existing issue scope.

Run the self-cleaning v0.7 execution and regression smoke suite after building:

```powershell
npm.cmd run smoke:execution
```


## Evidence uploads

Bug reports support local evidence files so testers can attach screenshots, GIFs, PDFs, and other reproduction context for developers.

Supported file types:

- `.png`
- `.jpg`
- `.jpeg`
- `.gif`
- `.pdf`

Limits and storage:

- Maximum file size is 10MB per file.
- Files are stored locally under `uploads/issues/{issue_id}/`.
- The `uploads/` folder is ignored by git so local evidence files are not committed.
- Evidence can be uploaded while creating/editing a bug report or from the bug report detail page.
- Admins can upload, view, and delete any evidence. Testers can upload evidence and delete files they uploaded. Developers can view evidence on assigned or unassigned bug reports.

Evidence API routes:

- `GET /api/issues/:id/attachments`
- `POST /api/issues/:id/attachments`
- `GET /api/attachments/:id`
- `DELETE /api/attachments/:id`


## Roles and permissions

IssueFlow supports three roles:

- `ADMIN`: can view/create/edit/delete all bug reports and test cases, upload/view/delete any evidence, manage user roles, and view organization-wide analytics.
- `TESTER`: can view bug reports, create bug reports, edit bug reports they created, upload evidence, delete evidence they uploaded, create/edit/view test cases, update test case run status, create bug reports from failed tests, and view QA-wide analytics.
- `DEVELOPER`: can view assigned and unassigned bug reports, update bug report status, view linked test cases and evidence, and view analytics scoped to those visible bugs. Developers cannot delete bug reports, delete test cases, upload evidence, or manage users.

Normal registration creates `TESTER` users. Users cannot self-select `ADMIN` during registration.

## First admin setup

Create or promote the first local admin with environment variables, then run the seed command:

```powershell
$env:ISSUEFLOW_ADMIN_USERNAME="Gabrielle"
$env:ISSUEFLOW_ADMIN_EMAIL="you@example.com"
$env:ISSUEFLOW_ADMIN_PASSWORD="change-this-password"
npm.cmd run db:seed-admin
```

The seed script only uses values from your local environment. It does not hardcode admin credentials in the app.


## v0.4.0 Collaboration & Defect Lifecycle

IssueFlow now supports collaborative defect work directly on bug reports:

- Bug comments/discussion on each bug report.
- Automatic activity history for important backend actions.
- Developer-only assignment targets.
- Developer-focused `/dashboard/issues/assigned` page.
- `REOPENED` as a real bug lifecycle status.

Lifecycle statuses:

```text
OPEN -> IN_PROGRESS -> IN_REVIEW -> RESOLVED -> CLOSED
```

Failed verification path:

```text
RESOLVED -> REOPENED -> IN_PROGRESS -> IN_REVIEW -> RESOLVED
```

Role lifecycle permissions:

- `ADMIN`: can perform all legitimate lifecycle transitions and can assign, reassign, or unassign any bug report.
- `TESTER`: can verify resolved bugs with `RESOLVED -> CLOSED`, reopen failed verification with `RESOLVED -> REOPENED`, and reopen regressions with `CLOSED -> REOPENED`.
- `DEVELOPER`: can move visible assigned/unassigned bugs through `OPEN -> IN_PROGRESS`, `IN_PROGRESS -> IN_REVIEW`, `IN_REVIEW -> RESOLVED`, and `REOPENED -> IN_PROGRESS`.

Assignment workflow:

- Bug reports can be assigned only to users with the `DEVELOPER` role.
- Admins can assign, reassign, and unassign any bug.
- Testers can assign bugs to developers while creating or editing bugs they can manage.
- Developers cannot assign bugs to other developers.

Activity is created automatically for:

- Bug creation
- Status changes, including reopened/resolved/closed transitions
- Assignment changes
- Evidence upload/delete
- Comment added
- Failed test case origin or test case link changes

Comments:

- `GET /api/issues/:id/comments`
- `POST /api/issues/:id/comments`
- `PATCH /api/comments/:id`
- `DELETE /api/comments/:id`

Activity:

- `GET /api/issues/:id/activity`

## v0.5.0 Analytics Dashboard

The protected `/dashboard/analytics` page and `GET /api/analytics` endpoint report directly from the IssueFlow SQLite database. The page includes:

- Total, active/open, Critical, Reopened, Resolved, Closed, In Progress, and unassigned bug metrics.
- Bug Reports by status and severity charts.
- Test Case Results with Passed, Failed, Blocked, and Not Run counts.
- Current Reopened bugs, recorded reopen events, and an activity-history-based reopen rate.
- Developer workload for admins and a developer's own active workload for developer accounts.
- Ten recent meaningful activity records.
- Problem Areas based only on structured `feature_module` test case data and linked bug relationships.

Analytics definitions:

- **Active/open bugs** are bugs currently in `OPEN`, `IN_PROGRESS`, `IN_REVIEW`, or `REOPENED`. `RESOLVED` and `CLOSED` are excluded.
- **Test Pass Rate** is `PASSED / (PASSED + FAILED + BLOCKED) * 100`. `NOT_RUN` test cases are excluded. The rate is `0%` when no tests have been executed.
- **Recorded Reopen Rate** is the number of unique bugs with both `ISSUE_RESOLVED` and `ISSUE_REOPENED` activity divided by the number of unique bugs with recorded `ISSUE_RESOLVED` activity. It covers activity recorded from v0.4.0 onward and does not reconstruct older history.
- **Developer workload** counts assigned bugs in active/open statuses only.

Role-specific analytics:

- `ADMIN` receives organization-wide analytics and workload for every developer.
- `TESTER` receives QA-wide bug and test case analytics.
- `DEVELOPER` receives analytics for bugs assigned to them or currently unassigned, linked test context, and only their own assigned workload.

No chart dependency was added. The responsive charts are lightweight server-rendered React components using the existing IssueFlow palette.

Run the self-cleaning analytics accuracy and RBAC smoke test after building:

```powershell
npm.cmd run smoke:analytics
```

## v0.6.0 Search, Filters & Productivity

Bug Reports and Test Cases now use server-side search, filtering, logical sorting, and pagination over the complete role-authorized dataset.

Bug Report search covers:

- Exact references such as `IF-0004`
- Title and summary
- Environment/browser/device
- Assignee username

Bug Report filters:

- Status and severity
- Assignee, including Unassigned, for Admin and Tester views
- Linked failed test or no failed-test link

Test Case search covers:

- Exact references such as `TC-0004`
- Title
- Structured feature/module
- Description and preconditions

Test Case filters:

- Status and priority
- Existing structured feature/module values
- Linked or unlinked bug report

Sorting and pagination:

- Bug Reports: Recently Updated, Newest, Oldest, Severity, and Status
- Test Cases: Recently Updated, Newest, Oldest, Priority, and Status
- Severity and priority use `CRITICAL > HIGH > MEDIUM > LOW`, not alphabetical order.
- Status sorts prioritize records needing attention and use creation time plus ID for stable ties.
- Pages support 10, 25, or 50 rows and show the matching result range and total.

List state is persisted in query parameters such as `q`, `status`, `severity`, `priority`, `assignee`, `module`, `linked`, `sort`, `page`, and `pageSize`. Applying a new search or filter returns to page 1. Detail-page return links preserve the originating list URL after validating it as a local IssueFlow list path.

RBAC is always applied before list filters. Admins and Testers search their existing organization/QA scope. Developers remain limited to assigned and unassigned visible bugs and linked visible test cases; query parameters cannot expand that scope or leak hidden totals. The dedicated Assigned Bugs page remains unchanged.

Empty states distinguish between a database with no visible records and a filtered view with no matches. Search and filter states provide Clear Search, Reset All, and active-view labels only when relevant.

Run the v0.6.0 smoke suite after building:

```powershell
npm.cmd run smoke:productivity
```

## QA coverage and release readiness (v0.9.0)

Requirements are lightweight QA verification targets rather than backlog items. Admins and Testers can create them, assign status and priority, and link multiple Test Cases. A Test Case can verify multiple Requirements through the `requirement_test_cases` join table.

Coverage is derived, never typed manually:

- **Not Covered:** no linked Test Cases.
- **Covered / Not Executed:** coverage exists, but at least one linked Test Case has no relevant execution or is Not Run.
- **Passing:** the latest relevant execution for every linked Test Case passed.
- **Failing:** at least one latest relevant execution failed and none are blocked.
- **Blocked:** at least one latest relevant execution is blocked; this is the highest-precedence state.

Global Requirement coverage uses the latest execution for each linked Test Case. Release coverage only considers executions from Test Runs associated with that Release. Latest means `executed_at`, then update/create time and ID for a stable tie-break. Requirement links are current traceability and never rewrite immutable Test Run snapshots.

QA Releases combine an explicit Requirement scope with existing Test Runs. The Release lifecycle (`Planning`, `In Testing`, `Ready`, or `Released`) is separate from the computed readiness assessment:

- **Not Ready:** no scoped Requirements or runs, incomplete/non-passing Requirement coverage, failed/blocked/not-run execution, or an unresolved Critical defect.
- **At Risk:** hard blockers are clear, but unresolved non-critical defects remain.
- **Ready:** all scoped Requirements pass, all executions pass, and no unresolved defects remain.

CSV reports are available from Release detail pages. They include release/readiness, Requirement, feature/module, coverage, Test Case, latest release result, and linked defect data. Release defect relevance includes defects from associated release executions and defects linked through Test Cases in the current Requirement scope; closed defects remain traceable but do not count as open readiness risks. Each Test Case row lists relevant defects in ascending Issue ID order, with multiple references, severities, and statuses aligned using `; ` separators. A defect from an associated release execution that is outside the current Requirement scope is retained as a defect-only row rather than silently omitted. Values are quoted and escaped, and cells beginning with spreadsheet formula characters are prefixed safely. Reports are authorized for Admin and Tester accounts.

Developers do not gain Requirements or Releases workspace access. Bug Reports they can already view show the necessary current Requirement/release context as read-only text.

The Playwright suite covers Requirement creation/linking, URL-backed filters and reset behavior, coverage transitions, Release creation/run association, readiness changes, CSV security, Developer RBAC, and 390px/320px long-name overflow using only `prisma/e2e.db`.

## Dashboard pages

- `/dashboard`
- `/dashboard/issues`
- `/dashboard/issues/new`
- `/dashboard/issues/[id]`
- `/dashboard/issues/[id]/edit`
- `/dashboard/issues/assigned` developer focused
- `/dashboard/analytics`
- `/dashboard/test-cases`
- `/dashboard/test-cases/new`
- `/dashboard/test-cases/[id]`
- `/dashboard/test-cases/[id]/edit`
- `/dashboard/test-suites`
- `/dashboard/test-suites/new`
- `/dashboard/test-suites/[id]`
- `/dashboard/test-suites/[id]/edit`
- `/dashboard/test-runs`
- `/dashboard/test-runs/new`
- `/dashboard/test-runs/[id]`
- `/dashboard/requirements`
- `/dashboard/requirements/new`
- `/dashboard/requirements/[id]`
- `/dashboard/requirements/[id]/edit`
- `/dashboard/releases`
- `/dashboard/releases/new`
- `/dashboard/releases/[id]`
- `/dashboard/releases/[id]/edit`
- `/dashboard/users` admin only

All dashboard routes are protected and redirect unauthenticated users to `/login`.

## Database

The Prisma schema is in `prisma/schema.prisma` and defines:

Users:

- `id`
- `username`
- `email`
- `password_hash`
- `role` with `ADMIN`, `TESTER`, or `DEVELOPER` values; default local role is `TESTER`
- `created_at`

Issues:

- `id`
- `title`
- `description`
- `steps_to_reproduce`
- `expected_result`
- `actual_result`
- `severity` with `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `status` with `OPEN`, `IN_PROGRESS`, `IN_REVIEW`, `RESOLVED`, `REOPENED`, `CLOSED`
- `created_by`
- `assigned_to`
- `created_at`
- `updated_at`

Test cases:

- `id`
- `title`
- `description`
- `preconditions`
- `test_steps`
- `expected_result`
- `actual_result`
- `status` with `NOT_RUN`, `PASSED`, `FAILED`, `BLOCKED`
- `priority` with `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `created_by`
- `linked_issue_id`
- `created_at`
- `updated_at`

Test management:

- `test_suites` stores reusable suite metadata and creator ownership.
- `test_suite_cases` is the many-to-many suite membership table with a uniqueness constraint per suite/Test Case pair.
- `test_runs` stores the suite name, release/build, environment, notes, lifecycle, creator, and timestamps.
- `test_executions` stores immutable Test Case definition snapshots plus per-run status, actual result, executor, and execution time.
- `issues.origin_execution_id` is unique, providing a one-to-one failed execution to Bug Report origin link.


Attachments:

- `id`
- `filename`
- `original_name`
- `filepath`
- `mimetype`
- `filesize`
- `uploaded_by`
- `issue_id`
- `created_at`

Issue comments:

- `id`
- `content`
- `issue_id`
- `author_id`
- `created_at`
- `updated_at`

Issue activities:

- `id`
- `issue_id`
- `actor_id`
- `action_type`
- `field_name`
- `old_value`
- `new_value`
- `message`
- `created_at`
This project uses SQLite for local development. The generated database file `prisma/dev.db` is ignored by git.

## Prisma notes

Standard Prisma scripts are available:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:studio
npm.cmd run db:seed-admin
```

If Prisma migration commands fail on your Windows setup because of the schema engine, use:

```powershell
npm.cmd run db:init
```

That command creates or upgrades the local SQLite tables expected by the Prisma client.

## Playwright end-to-end tests

The Playwright suite adds browser-level Chromium coverage for authentication, role boundaries, Admin role confirmation, Bug Report and Test Case productivity controls, the failed-execution-to-Bug lifecycle, immutable Test Run history, responsive account identity, and shared footer placement.

Install dependencies and the required browser once:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Run the suite:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:headed
npm.cmd run test:e2e:ui
npm.cmd run test:e2e:report
```

Playwright automatically starts IssueFlow on `http://127.0.0.1:3318`. It uses the existing SQLite initializer with an explicit E2E-only path to create the dedicated ignored database `prisma/e2e.db`, recreates recognizable `E2E-` users before a run, and removes synthetic records during global teardown. It never resets or deletes `prisma/dev.db` or normal development data.

Failure screenshots and traces are written under `test-results/`; the HTML report is written to `playwright-report/`. Both locations are ignored by git. The initial browser scope is Chromium, while the Playwright project structure can accept additional browsers later.

The existing `smoke:*` scripts remain API and integration regression checks. Playwright complements them by driving the rendered UI and asserting user-visible navigation, controls, layout, and workflow outcomes.




