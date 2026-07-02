import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IssueDashboard } from "@/components/issues/IssueDashboard";
import { getCurrentUser } from "@/lib/auth";
import { canViewAnalytics, isAdmin, isDeveloper, issueWhereForUser } from "@/lib/permissions";
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
  linkedIssue: { select: { id: true, title: true, severity: true, status: true, created_by: true, assigned_to: true } }
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const visibleIssueWhere = issueWhereForUser(user);
  const visibleTestCaseWhere = isDeveloper(user) ? { linkedIssue: { is: { OR: [{ assigned_to: user.id }, { assigned_to: null }] } } } : {};
  const evidenceWhere = isAdmin(user) ? {} : isDeveloper(user) ? { issue: visibleIssueWhere } : { uploaded_by: user.id };

  const [issues, testCases, stats] = await Promise.all([
    prisma.issue.findMany({ where: visibleIssueWhere, orderBy: { updated_at: "desc" }, take: 12, select: issueSelect }),
    prisma.testCase.findMany({ where: visibleTestCaseWhere, orderBy: { updated_at: "desc" }, take: 6, select: testCaseSelect }),
    Promise.all([
      prisma.issue.count({ where: { ...visibleIssueWhere, status: "OPEN" } }),
      prisma.issue.count({ where: { ...visibleIssueWhere, status: "IN_PROGRESS" } }),
      prisma.issue.count({ where: { ...visibleIssueWhere, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.issue.count({ where: { ...visibleIssueWhere, severity: "CRITICAL" } }),
      prisma.issue.count({ where: visibleIssueWhere }),
      prisma.testCase.count({ where: visibleTestCaseWhere }),
      prisma.testCase.count({ where: { ...visibleTestCaseWhere, status: "PASSED" } }),
      prisma.testCase.count({ where: { ...visibleTestCaseWhere, status: "FAILED" } }),
      prisma.testCase.count({ where: { ...visibleTestCaseWhere, status: "BLOCKED" } }),
      canViewAnalytics(user) ? prisma.user.count() : Promise.resolve(0),
      prisma.attachment.count({ where: evidenceWhere })
    ])
  ]);

  const [open, inProgress, resolved, critical, total, totalTestCases, passedTests, failedTests, blockedTests, totalUsers, evidenceCount] = stats;

  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <DashboardNav user={user} />
      <IssueDashboard
        issues={issues}
        testCases={testCases}
        stats={{ open, inProgress, resolved, critical, total, totalTestCases, passedTests, failedTests, blockedTests, totalUsers, evidenceCount }}
        user={user}
      />
    </main>
  );
}
