import { notFound, redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IssueForm } from "@/components/issues/IssueForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canEditIssue, canUpdateIssueStatus, canViewIssue, isDeveloper } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function EditIssuePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    notFound();
  }

  const [issue, users, testCases] = await Promise.all([
    prisma.issue.findUnique({ where: { id: issueId }, select: issueSelect }),
    prisma.user.findMany({ orderBy: { username: "asc" }, select: { id: true, username: true, email: true, role: true } }),
    prisma.testCase.findMany({ orderBy: { updated_at: "desc" }, where: { status: "FAILED" }, select: { id: true, title: true, status: true, priority: true } })
  ]);

  if (!issue || !canViewIssue(user, issue)) {
    notFound();
  }

  if (!canEditIssue(user, issue) && !canUpdateIssueStatus(user, issue)) {
    redirect(`/dashboard/issues/${issue.id}`);
  }

  const statusOnly = isDeveloper(user) && !canEditIssue(user, issue);

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow={statusOnly ? `Update IF-${issue.id.toString().padStart(4, "0")}` : `Edit IF-${issue.id.toString().padStart(4, "0")}`}
          title={statusOnly ? "Update bug report status." : "Update bug report details."}
          description={statusOnly ? "Developers can move visible bug reports through the workflow without changing QA-owned report details." : "Bug reports capture defects found while running QA scenarios."}
        />
        <div className="mt-10">
          <IssueForm mode="edit" issue={issue} users={users} testCases={testCases} statusOnly={statusOnly} />
        </div>
      </section>
    </main>
  );
}
