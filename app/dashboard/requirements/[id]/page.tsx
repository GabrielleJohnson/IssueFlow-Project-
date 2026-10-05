import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { DeleteTestManagementButton } from "@/components/test-management/DeleteTestManagementButton";
import { getCurrentUser } from "@/lib/auth";
import {
  canDeleteRequirement,
  canEditRequirement,
  canViewRequirements,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  coverageLabels,
  coverageState,
  latestExecution,
  requirementReference,
} from "@/lib/requirements";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};
export default async function RequirementDetailPage({
  params,
  searchParams,
}: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewRequirements(user)) redirect("/dashboard");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      creator: { select: { username: true } },
      releaseLinks: {
        orderBy: { linked_at: "desc" },
        include: { release: true },
      },
      testCaseLinks: {
        orderBy: { linked_at: "asc" },
        include: {
          testCase: {
            include: {
              linkedIssue: {
                select: { id: true, title: true, severity: true, status: true },
              },
              createdBugReports: {
                select: { id: true, title: true, severity: true, status: true },
              },
              executions: {
                orderBy: [
                  { executed_at: "desc" },
                  { updated_at: "desc" },
                  { id: "desc" },
                ],
                include: {
                  run: {
                    select: { id: true, release_label: true, suite_name: true },
                  },
                  bugReport: {
                    select: {
                      id: true,
                      title: true,
                      severity: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!requirement) notFound();
  const { from } = await searchParams;
  const returnPath =
    from === "/dashboard/requirements" ||
    from?.startsWith("/dashboard/requirements?")
      ? from
      : "/dashboard/requirements";
  const testCases = requirement.testCaseLinks.map((item) => item.testCase);
  const coverage = coverageState(testCases);
  const defects = new Map<
    number,
    { id: number; title: string; severity: string; status: string }
  >();
  for (const testCase of testCases) {
    if (testCase.linkedIssue)
      defects.set(testCase.linkedIssue.id, testCase.linkedIssue);
    for (const issue of testCase.createdBugReports)
      defects.set(issue.id, issue);
    for (const execution of testCase.executions)
      if (execution.bugReport)
        defects.set(execution.bugReport.id, execution.bugReport);
  }
  const openDefects = [...defects.values()].filter(
    (item) => item.status !== "CLOSED",
  );
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={`${requirementReference(id)} · ${requirement.feature_module}`}
            title={requirement.title}
            description={
              requirement.description ||
              "No supporting description has been added."
            }
          />
          <div className="flex flex-wrap gap-3">
            {canEditRequirement(user, requirement) && (
              <Link
                href={`/dashboard/requirements/${id}/edit`}
                className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso"
              >
                Edit Requirement
              </Link>
            )}
            <Link
              href={returnPath}
              className="rounded-full border border-bronze px-5 py-3 text-sm font-bold"
            >
              Back to Requirements
            </Link>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-lg border border-bronze bg-clay p-4">
            <p className="text-sm text-beige">Coverage</p>
            <div className="mt-3">
              <Badge label={coverage} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4">
            <p className="text-sm text-beige">Requirement status</p>
            <div className="mt-3">
              <Badge label={requirement.status} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4">
            <p className="text-sm text-beige">Priority</p>
            <div className="mt-3">
              <Badge label={requirement.priority} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4">
            <p className="text-sm text-beige">Open linked defects</p>
            <p className="mt-2 font-display text-2xl font-bold text-coral">
              {openDefects.length}
            </p>
          </article>
        </div>
        <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">
            How coverage is calculated
          </h2>
          <p className="mt-2 text-sm leading-6 text-beige">
            Current coverage is{" "}
            <strong className="text-ivory">{coverageLabels[coverage]}</strong>.
            IssueFlow uses the latest recorded execution for each linked Test
            Case. Blocked takes precedence over failing, followed by tests that
            have not run; every linked test must pass for this requirement to be
            Passing.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="border-b border-bronze p-5">
              <h2 className="font-display text-xl font-semibold">
                Linked Test Cases
              </h2>
              <p className="mt-1 text-sm text-beige">
                Current traceability; historical run snapshots are not rewritten
                when these links change.
              </p>
            </div>
            {testCases.length === 0 ? (
              <p className="p-5 text-sm text-beige">
                No Test Cases are linked. Edit this requirement to establish
                coverage.
              </p>
            ) : (
              <div className="divide-y divide-bronze/70">
                {testCases.map((testCase) => {
                  const latest = latestExecution(testCase.executions);
                  return (
                    <div
                      key={testCase.id}
                      className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/test-cases/${testCase.id}`}
                          className="font-semibold text-ivory transition hover:text-coral [overflow-wrap:anywhere]"
                        >
                          TC-{String(testCase.id).padStart(4, "0")} ·{" "}
                          {testCase.title}
                        </Link>
                        <p className="mt-1 text-sm text-beige">
                          {testCase.feature_module}
                          {latest
                            ? ` · latest in ${latest.run.release_label}`
                            : " · never executed"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge label={testCase.status} />
                        <Badge label={latest?.status ?? "NOT_RUN"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="border-b border-bronze p-5">
              <h2 className="font-display text-xl font-semibold">
                Release Scope
              </h2>
            </div>
            {requirement.releaseLinks.length === 0 ? (
              <p className="p-5 text-sm text-beige">
                Not currently included in a QA Release.
              </p>
            ) : (
              <div className="divide-y divide-bronze/70">
                {requirement.releaseLinks.map(({ release }) => (
                  <Link
                    key={release.id}
                    href={`/dashboard/releases/${release.id}`}
                    className="block p-5 font-semibold text-amber transition hover:text-coral [overflow-wrap:anywhere]"
                  >
                    {release.name}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <section className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5">
            <h2 className="font-display text-xl font-semibold">
              Linked Open Defects
            </h2>
            <p className="mt-1 text-sm text-beige">
              Distinct unresolved Bug Reports connected through the linked Test
              Cases or their executions.
            </p>
          </div>
          {openDefects.length === 0 ? (
            <p className="p-5 text-sm text-beige">
              No open defects are linked to this requirement.
            </p>
          ) : (
            <div className="divide-y divide-bronze/70">
              {openDefects.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/dashboard/issues/${issue.id}`}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold [overflow-wrap:anywhere]">
                    IF-{String(issue.id).padStart(4, "0")} · {issue.title}
                  </span>
                  <span className="flex gap-2">
                    <Badge label={issue.severity} />
                    <Badge label={issue.status} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
        {canDeleteRequirement(user, requirement) && (
          <div className="mt-8 rounded-lg border border-ember/30 bg-clay p-5">
            <p className="mb-4 text-sm text-beige">
              Admin-only: deleting a Requirement removes current traceability
              links, not Test Cases or historical executions.
            </p>
            <DeleteTestManagementButton
              endpoint={`/api/requirements/${id}`}
              returnTo="/dashboard/requirements"
              label="Requirement"
            />
          </div>
        )}
      </section>
    </main>
  );
}
