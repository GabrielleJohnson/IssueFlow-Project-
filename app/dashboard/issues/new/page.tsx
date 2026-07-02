import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IssueForm } from "@/components/issues/IssueForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type NewIssuePageProps = {
  searchParams: Promise<{ fromTestCase?: string }>;
};

export default async function NewIssuePage({ searchParams }: NewIssuePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canCreateIssue(user)) {
    redirect("/dashboard/issues");
  }

  const { fromTestCase } = await searchParams;
  const failedTestCaseId = fromTestCase ? Number(fromTestCase) : null;

  const [users, testCases, failedTestCase] = await Promise.all([
    prisma.user.findMany({
      orderBy: { username: "asc" },
      select: { id: true, username: true, email: true, role: true }
    }),
    prisma.testCase.findMany({
      orderBy: { updated_at: "desc" },
      where: { status: "FAILED" },
      select: { id: true, title: true, status: true, priority: true }
    }),
    failedTestCaseId
      ? prisma.testCase.findUnique({
          where: { id: failedTestCaseId },
          select: {
            id: true,
            title: true,
            description: true,
            feature_module: true,
            test_steps: true,
            expected_result: true,
            actual_result: true,
            status: true,
            priority: true
          }
        })
      : null
  ]);

  const prefill = failedTestCase
    ? {
        title: `Bug from failed test: ${failedTestCase.title}`,
        description: `Failed QA scenario in ${failedTestCase.feature_module}. ${failedTestCase.description}`,
        environment: "Add browser/device/environment observed during test run",
        steps_to_reproduce: failedTestCase.test_steps,
        expected_result: failedTestCase.expected_result,
        actual_result: failedTestCase.actual_result,
        linked_test_case_id: failedTestCase.id
      }
    : undefined;

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="Create Bug Report"
          title="Capture a defect discovered during testing."
          description="Bug reports describe what failed, where it failed, and how the team can reproduce it."
        />
        <div className="mt-10">
          <IssueForm mode="create" users={users} testCases={testCases} prefill={prefill} />
        </div>
      </section>
    </main>
  );
}
