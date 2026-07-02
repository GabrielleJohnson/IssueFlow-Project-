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

- `ADMIN`: can view/create/edit/delete all bug reports and test cases, upload/view/delete any evidence, manage user roles, and view analytics.
- `TESTER`: can view bug reports, create bug reports, edit bug reports they created, upload evidence, delete evidence they uploaded, create/edit/view test cases, update test case run status, and create bug reports from failed tests.
- `DEVELOPER`: can view assigned and unassigned bug reports, update bug report status, view linked test cases, and view evidence. Developers cannot delete bug reports, delete test cases, upload evidence, or manage users.

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

## Dashboard pages

- `/dashboard`
- `/dashboard/issues`
- `/dashboard/issues/new`
- `/dashboard/issues/[id]`
- `/dashboard/issues/[id]/edit`
- `/dashboard/test-cases`
- `/dashboard/test-cases/new`
- `/dashboard/test-cases/[id]`
- `/dashboard/test-cases/[id]/edit`
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
- `status` with `OPEN`, `IN_PROGRESS`, `IN_REVIEW`, `RESOLVED`, `CLOSED`
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



