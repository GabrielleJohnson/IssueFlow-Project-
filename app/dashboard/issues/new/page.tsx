import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { IssueForm } from "@/components/issues/IssueForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type NewIssuePageProps = {
  searchParams: Promise<{ fromTestCase?: string; fromExecution?: string }>;
};

export default async function NewIssuePage({ searchParams }: NewIssuePageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canCreateIssue(user)) {
    redirect("/dashboard/issues");
  }

  const { fromTestCase, fromExecution } = await searchParams;
  const failedTestCaseId = fromTestCase ? Number(fromTestCase) : null;
  const executionId = fromExecution ? Number(fromExecution) : null;

  const [users, testCases, failedTestCase, execution] = await Promise.all([
    prisma.user.findMany({
      where: { role: "DEVELOPER" },
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
      : null,
    executionId
      ? prisma.testExecution.findUnique({ where: { id: executionId }, include: { run: true, bugReport: { select: { id: true } } } })
      : null
  ]);

  if (execution?.bugReport) redirect(`/dashboard/issues/${execution.bugReport.id}`);
  if (execution && execution.status !== "FAILED") redirect(`/dashboard/test-runs/${execution.run_id}`);

  const prefill = execution
    ? {
        title: `Bug from failed execution: ${execution.title_snapshot}`,
        description: `Failed during ${execution.run.suite_name} for ${execution.run.release_label}. ${execution.description_snapshot}`,
        environment: `${execution.run.environment} · ${execution.run.release_label}`,
        steps_to_reproduce: execution.test_steps_snapshot,
        expected_result: execution.expected_result_snapshot,
        actual_result: execution.actual_result,
        linked_test_case_id: execution.test_case_id,
        origin_execution_id: execution.id
      }
    : failedTestCase
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
          <IssueForm mode="create" users={users} testCases={testCases} prefill={prefill} statusOptions={["OPEN"]} />
        </div>
      </section>
    </main>
  );
}



