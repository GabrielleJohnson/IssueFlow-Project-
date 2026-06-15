# IssueFlow

IssueFlow is a QA-focused issue tracking platform for testers and small development teams. It includes a polished landing page, protected dashboard, local authentication, SQLite user storage, issue CRUD, and GSAP-powered section reveals.

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

Issue creation uses the logged-in user as `created_by`. Delete is currently available to authenticated users, but the delete button and API helper are isolated so it can become ADMIN-only later.

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

This project uses SQLite for local development. The generated database file `prisma/dev.db` is ignored by git.

## Prisma notes

Standard Prisma scripts are available:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:studio
```

If Prisma migration commands fail on your Windows setup because of the schema engine, use:

```powershell
npm.cmd run db:init
```

That command creates or upgrades the local SQLite tables expected by the Prisma client.
