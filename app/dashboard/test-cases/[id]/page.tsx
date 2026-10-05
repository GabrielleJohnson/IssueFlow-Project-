import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { DeleteTestCaseButton } from "@/components/test-cases/DeleteTestCaseButton";
import { getCurrentUser } from "@/lib/auth";
import {
  canCreateIssue,
  canDeleteTestCase,
  canEditTestCase,
  canViewTestCase,
  canViewTestManagement,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { safeListReturnPath } from "@/lib/productivity";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
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
  linkedIssue: {
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      created_by: true,
      assigned_to: true,
    },
  },
  suiteMemberships: {
    include: { suite: { select: { id: true, name: true } } },
    orderBy: { added_at: "desc" as const },
  },
  executions: {
    take: 10,
    orderBy: { created_at: "desc" as const },
    include: {
      run: {
        select: {
          id: true,
          suite_name: true,
          release_label: true,
          environment: true,
        },
      },
      bugReport: { select: { id: true, title: true } },
    },
  },
  requirementLinks: {
    orderBy: { linked_at: "desc" as const },
    include: {
      requirement: {
        select: {
          id: true,
          title: true,
          feature_module: true,
          status: true,
          priority: true,
        },
      },
    },
  },
};

export default async function TestCaseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { from } = await searchParams;
  const returnPath = safeListReturnPath(from, "/dashboard/test-cases");
  const testCaseId = Number(id);

  if (!Number.isInteger(testCaseId)) {
    notFound();
  }

  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    select: testCaseSelect,
  });

  if (!testCase || !canViewTestCase(user, testCase)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={`TC-${testCase.id.toString().padStart(4, "0")}`}
            title={testCase.title}
            description={testCase.description}
          />
          <div className="flex flex-wrap gap-3">
            {canEditTestCase(user, testCase) && (
              <Link
                href={`/dashboard/test-cases/${testCase.id}/edit`}
                className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
              >
                Edit Test Case
              </Link>
            )}
            <Link
              href={returnPath}
              className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
            >
              Back to Test Cases
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Status</p>
            <div className="mt-3">
              <Badge label={testCase.status} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Priority</p>
            <div className="mt-3">
              <Badge label={testCase.priority} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Feature / module</p>
            <p className="mt-2 font-semibold text-ivory">
              {testCase.feature_module}
            </p>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Linked bug report</p>
            {testCase.linkedIssue ? (
              <Link
                className="mt-2 block font-semibold text-amber transition hover:text-coral"
                href={`/dashboard/issues/${testCase.linkedIssue.id}`}
              >
                IF-{testCase.linkedIssue.id.toString().padStart(4, "0")}
              </Link>
            ) : (
              <p className="mt-2 font-semibold text-ivory">None</p>
            )}
          </article>
        </div>

        {testCase.status === "FAILED" && canCreateIssue(user) && (
          <div className="mt-8 rounded-lg border border-ember/40 bg-ember/15 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">
              Failed test can become a bug report
            </h2>
            <p className="mt-2 text-sm leading-6 text-beige">
              This opens a bug report form prefilled from the failed QA
              scenario.
            </p>
            <Link
              href={`/dashboard/issues/new?fromTestCase=${testCase.id}`}
              className="mt-5 inline-flex rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber"
            >
              Create Bug Report from Failed Test
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            ["Preconditions", testCase.preconditions],
            ["Test steps", testCase.test_steps],
            ["Expected result", testCase.expected_result],
            ["Actual result", testCase.actual_result],
            [
              "Timeline",
              `Created ${new Date(testCase.created_at).toLocaleString()}\nUpdated ${new Date(testCase.updated_at).toLocaleString()}`,
            ],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-lg border border-bronze bg-clay p-5 shadow-card"
            >
              <h2 className="font-display text-xl font-semibold text-ivory">
                {label}
              </h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-beige">
                {value}
              </p>
            </article>
          ))}
        </div>

        {canViewTestManagement(user) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-bronze bg-clay shadow-card">
              <div className="border-b border-bronze p-5">
                <h2 className="font-display text-xl font-semibold">
                  Suite Membership
                </h2>
                <p className="mt-1 text-sm text-beige">
                  Reusable collections containing this definition.
                </p>
              </div>
              {testCase.suiteMemberships.length === 0 ? (
                <p className="p-5 text-sm text-beige">
                  This test case is not in a suite yet.
                </p>
              ) : (
                <div className="divide-y divide-bronze/70">
                  {testCase.suiteMemberships.map((item) => (
                    <Link
                      key={item.suite.id}
                      href={`/dashboard/test-suites/${item.suite.id}`}
                      className="block p-5 font-semibold text-amber transition hover:text-coral"
                    >
                      TS-{String(item.suite.id).padStart(4, "0")} ·{" "}
                      {item.suite.name}
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-lg border border-bronze bg-clay shadow-card">
              <div className="border-b border-bronze p-5">
                <h2 className="font-display text-xl font-semibold">
                  Recent Executions
                </h2>
                <p className="mt-1 text-sm text-beige">
                  Historical results are preserved per run.
                </p>
              </div>
              {testCase.executions.length === 0 ? (
                <p className="p-5 text-sm text-beige">
                  No run executions have recorded this test case yet.
                </p>
              ) : (
                <div className="divide-y divide-bronze/70">
                  {testCase.executions.map((execution) => (
                    <Link
                      key={execution.id}
                      href={`/dashboard/test-runs/${execution.run.id}`}
                      className="flex items-center justify-between gap-3 p-5"
                    >
                      <div>
                        <p className="font-semibold text-ivory">
                          {execution.run.suite_name} ·{" "}
                          {execution.run.release_label}
                        </p>
                        <p className="mt-1 text-sm text-beige">
                          {execution.run.environment}
                          {execution.bugReport
                            ? ` · IF-${String(execution.bugReport.id).padStart(4, "0")}`
                            : ""}
                        </p>
                      </div>
                      <Badge label={execution.status} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {canViewTestManagement(user) && (
          <section className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="border-b border-bronze p-5">
              <h2 className="font-display text-xl font-semibold">
                Linked Requirements
              </h2>
              <p className="mt-1 text-sm text-beige">
                Current QA coverage traced back to the behavior this Test Case
                verifies.
              </p>
            </div>
            {testCase.requirementLinks.length === 0 ? (
              <p className="p-5 text-sm text-beige">
                This Test Case is not linked to a Requirement yet.
              </p>
            ) : (
              <div className="divide-y divide-bronze/70">
                {testCase.requirementLinks.map(({ requirement }) => (
                  <Link
                    key={requirement.id}
                    href={`/dashboard/requirements/${requirement.id}`}
                    className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ivory [overflow-wrap:anywhere]">
                        REQ-{String(requirement.id).padStart(4, "0")} ·{" "}
                        {requirement.title}
                      </p>
                      <p className="mt-1 text-sm text-beige">
                        {requirement.feature_module}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge label={requirement.status} />
                      <Badge label={requirement.priority} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {canDeleteTestCase(user, testCase) && (
          <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
            <p className="mb-4 text-sm text-beige">
              Admin-only destructive action.
            </p>
            <DeleteTestCaseButton testCaseId={testCase.id} />
          </div>
        )}
      </section>
    </main>
  );
}
