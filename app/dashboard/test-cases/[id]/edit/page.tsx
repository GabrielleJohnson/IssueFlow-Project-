import { notFound, redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { TestCaseForm } from "@/components/test-cases/TestCaseForm";
import { getCurrentUser } from "@/lib/auth";
import { canEditTestCase, canViewTestCase, issueWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
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

export default async function EditTestCasePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const testCaseId = Number(id);

  if (!Number.isInteger(testCaseId)) {
    notFound();
  }

  const [testCase, issues] = await Promise.all([
    prisma.testCase.findUnique({ where: { id: testCaseId }, select: testCaseSelect }),
    prisma.issue.findMany({ where: issueWhereForUser(user), orderBy: { updated_at: "desc" }, select: { id: true, title: true, severity: true, status: true } })
  ]);

  if (!testCase || !canViewTestCase(user, testCase)) {
    notFound();
  }

  if (!canEditTestCase(user, testCase)) {
    redirect(`/dashboard/test-cases/${testCase.id}`);
  }

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow={`Edit TC-${testCase.id.toString().padStart(4, "0")}`}
          title="Update QA scenario details."
          description="Test cases define verification steps. Link a bug report only when the scenario exposes a defect."
        />
        <div className="mt-10">
          <TestCaseForm mode="edit" testCase={testCase} issues={issues} />
        </div>
      </section>
    </main>
  );
}
