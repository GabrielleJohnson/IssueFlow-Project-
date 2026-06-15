# IssueFlow

IssueFlow is a QA-focused issue tracking platform for testers and small development teams. It includes a polished landing page, protected dashboard, local authentication, SQLite user storage, and GSAP-powered section reveals.

## Local setup

Install dependencies:

```powershell
npm.cmd install
```

Create your local SQLite database:

```powershell
npm.cmd run db:init
```

Generate the Prisma client after dependency changes:

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

## Database

The Prisma schema is in `prisma/schema.prisma` and defines a `users` table:

- `id`
- `username`
- `email`
- `password_hash`
- `created_at`

This project uses SQLite for local development. The generated database file `prisma/dev.db` is ignored by git.

## Notes

The project includes Prisma scripts for standard workflows:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:studio
```

If Prisma migration commands fail on your Windows setup because of the schema engine, use `npm.cmd run db:init`; it creates the local SQLite `users` table expected by the Prisma client.
