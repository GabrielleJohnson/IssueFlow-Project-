import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IssueDashboard } from "@/components/issues/IssueDashboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const issueSelect = {
  id: true,
  title: true,
  description: true,
  environment: true,
  steps_to_reproduce: true,
  expected_result: true,
  actual_result: true,
  severity: true,
  status: true,
  created_by: true,
  assigned_to: true,
  linked_test_case_id: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  assignee: { select: { id: true, username: true, email: true, role: true } },
  linkedTestCase: { select: { id: true, title: true, status: true, priority: true } }
};

const testCaseSelect = {
  id: true,
  title: true,
  description: true,
  feature_module: true,
  preconditions: true,
  test_steps: true,
  expected_result: true,
  actual_result: true,
  status: true,
  priority: true,
  created_by: true,
  linked_issue_id: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  linkedIssue: { select: { id: true, title: true, severity: true, status: true } }
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [issues, testCases, stats] = await Promise.all([
    prisma.issue.findMany({ orderBy: { updated_at: "desc" }, take: 12, select: issueSelect }),
    prisma.testCase.findMany({ orderBy: { updated_at: "desc" }, take: 6, select: testCaseSelect }),
    Promise.all([
      prisma.issue.count({ where: { status: "OPEN" } }),
      prisma.issue.count({ where: { status: "IN_PROGRESS" } }),
      prisma.issue.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.issue.count({ where: { severity: "CRITICAL" } }),
      prisma.issue.count(),
      prisma.testCase.count(),
      prisma.testCase.count({ where: { status: "PASSED" } }),
      prisma.testCase.count({ where: { status: "FAILED" } }),
      prisma.testCase.count({ where: { status: "BLOCKED" } })
    ])
  ]);

  const [open, inProgress, resolved, critical, total, totalTestCases, passedTests, failedTests, blockedTests] = stats;

  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-wide text-ivory">
            Issue<span className="text-coral">Flow</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-beige md:flex">
            <a href="#dashboard" className="transition hover:text-ivory">Dashboard</a>
            <Link href="/dashboard/issues" className="transition hover:text-ivory">Issues</Link>
            <Link href="/dashboard/test-cases" className="transition hover:text-ivory">Test Cases</Link>
            <a href="#analytics" className="transition hover:text-ivory">Analytics</a>
          </div>
          <LogoutButton />
        </nav>
      </header>
      <IssueDashboard
        issues={issues}
        testCases={testCases}
        stats={{ open, inProgress, resolved, critical, total, totalTestCases, passedTests, failedTests, blockedTests }}
        user={user}
      />
    </main>
  );
}
