# IssueFlow

IssueFlow is a full-stack QA workspace for testers and small development teams. It brings defect reporting, test management, execution history, requirements coverage, and release readiness into one focused application.

## Problem & Solution

QA work often gets split across issue trackers, spreadsheets, screenshots, and disconnected test records. That makes it difficult to understand how a failed test became a defect or whether a release is ready for review.

IssueFlow keeps that context connected. Testers can document expected behavior, run tests, attach evidence, create traced Bug Reports from failures, and review coverage and release risk without the overhead of a general project-management platform.

## Key Features

- **Bug Reports:** Record reproduction details, assignment, severity, comments, and lifecycle changes.
- **Evidence uploads:** Attach private screenshots, images, GIFs, and PDFs to defects through secure direct uploads.
- **Test Cases and Test Suites:** Maintain reusable QA scenarios and organize them into regression suites.
- **Test Runs:** Execute suite snapshots while preserving historical results when Test Cases change later.
- **Failure traceability:** Create a Bug Report from a failed execution and follow its origin back to the test and run.
- **Requirements and coverage:** Connect Requirements to Test Cases and see whether expected behavior is covered and passing.
- **QA Releases:** Combine scoped Requirements, Test Runs, and open defects into a release-readiness assessment.
- **Role-based access:** Provide focused Admin, Tester, and Developer workflows.
- **Analytics:** Review defect, execution, coverage, and workload signals based on each role's visibility.
- **Productivity tools:** Search, filter, sort, paginate, and preserve list state in the URL.
- **Regression testing:** Protect core workflows with browser, smoke, and integration tests.

## Tech Stack

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS
- Prisma with PostgreSQL on Neon
- Neon Object Storage for private defect evidence
- bcryptjs and jose for local authentication
- GSAP for landing-page animations
- Playwright for end-to-end testing
- GitHub Actions for automated validation
- Vercel as the deployment target

## How IssueFlow Works

```text
Requirement
    |
    v
Test Case ---> Test Suite
                   |
                   v
               Test Run ---> Execution
                                 |
                          failure creates
                                 v
                            Bug Report
                                 |
                                 v
                          Developer Fix
                                 |
                                 v
                        Tester Verification
                                 |
                                 v
                         Release Readiness
```

IssueFlow connects planned coverage to execution evidence and defect follow-up. Test Run snapshots remain historical records, while current Requirements and Releases show the latest QA picture.

## Roles

| Role | Main workflow |
|---|---|
| Admin | Oversees QA records, analytics, users, and role assignments. |
| Tester | Creates and runs tests, reports defects, uploads evidence, and verifies fixes. |
| Developer | Works assigned or unassigned defects, reviews QA context, and updates development statuses. |

Permissions are enforced by the application APIs as well as reflected in the interface.

## Testing & QA

IssueFlow uses Playwright end-to-end tests for rendered workflows and smoke/integration scripts for lifecycle, permissions, analytics, filtering, and test execution. Automated tests use isolated PostgreSQL schemas, while GitHub Actions provisions a disposable PostgreSQL service so development data is never replaced.

Manual QA was also part of development, especially for responsive layouts, keyboard behavior, role boundaries, traceability, CSV reports, and historical Test Run behavior.

## Quick Start

Requirements: Node.js 22.13 or newer, npm, PostgreSQL, and a private S3-compatible evidence bucket. Set `DATABASE_URL` to the direct connection URL and `DATABASE_URL_POOLED` to the pooled application URL. Neon Object Storage uses its native `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` variables; IssueFlow additionally requires `EVIDENCE_STORAGE_BUCKET`.

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:generate
npm.cmd run db:init
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). Registering through the application creates a Tester account. Local Admin setup is available through the documented `db:seed-admin` script and environment variables in `.env.example`.

Run the main validation checks with:

```powershell
npm.cmd run check
npm.cmd run test:e2e
```

## What I Learned

Building IssueFlow helped me understand how the different parts of a QA workflow connect instead of treating bugs, test cases, and test runs as separate features. I learned a lot about role-based permissions, preserving historical test results, tracing failed tests back to defects, and keeping business rules consistent between the UI and API.

One of my biggest takeaways was that passing automated tests does not always mean the application works perfectly for the user. Manual testing helped me catch issues with navigation, filters, responsive layouts, and reporting that automated checks initially missed. That experience influenced how I approached regression testing as the project grew.

## Project Status

IssueFlow v1.0.0 is a portfolio application being prepared for deployment to Vercel.
