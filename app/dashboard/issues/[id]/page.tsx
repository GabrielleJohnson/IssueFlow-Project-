import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ActivityTimeline } from "@/components/issues/ActivityTimeline";
import { CommentsSection } from "@/components/issues/CommentsSection";
import { DeleteIssueButton } from "@/components/issues/DeleteIssueButton";
import { EvidenceSection } from "@/components/issues/EvidenceSection";
import { IssueLifecycleActions } from "@/components/issues/IssueLifecycleActions";
import { IssueLifecycleIndicator } from "@/components/issues/IssueLifecycleIndicator";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/issueOptions";
import {
  canCreateTestCase,
  canDeleteIssue,
  canEditIssue,
  canTransitionIssueStatus,
  canUploadEvidence,
  canViewIssue,
  isDeveloper,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { safeListReturnPath } from "@/lib/productivity";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
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
  origin_execution_id: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  assignee: { select: { id: true, username: true, email: true, role: true } },
  linkedTestCase: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      requirementLinks: {
        include: {
          requirement: {
            select: {
              id: true,
              title: true,
              feature_module: true,
              releaseLinks: {
                include: { release: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  },
  originExecution: {
    select: {
      id: true,
      status: true,
      actual_result: true,
      test_case_reference: true,
      title_snapshot: true,
      run: {
        select: {
          id: true,
          suite_name: true,
          release_label: true,
          environment: true,
        },
      },
    },
  },
  testCases: {
    orderBy: { updated_at: "desc" as const },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      updated_at: true,
    },
  },
};

export default async function IssueDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { from } = await searchParams;
  const returnPath = safeListReturnPath(from, "/dashboard/issues");
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    notFound();
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: issueSelect,
  });

  if (!issue || !canViewIssue(user, issue)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={`Bug Report IF-${issue.id.toString().padStart(4, "0")}`}
            title={issue.title}
            description={issue.description}
          />
          <div className="flex flex-wrap gap-3">
            {(canEditIssue(user, issue) || isDeveloper(user)) && (
              <Link
                href={`/dashboard/issues/${issue.id}/edit`}
                className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
              >
                {isDeveloper(user) && !canEditIssue(user, issue)
                  ? "Update Status"
                  : "Edit Bug Report"}
              </Link>
            )}
            <Link
              href={returnPath}
              className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
            >
              Back to Bug Reports
            </Link>
          </div>
        </div>

        {issue.linkedTestCase && (
          <div className="mt-8 rounded-lg border border-ember/40 bg-ember/15 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">
              Created from a failed test case
            </h2>
            <p className="mt-2 text-sm text-beige">
              This bug report is linked to the failed QA scenario that exposed
              the defect.
            </p>
            {isDeveloper(user) ? (
              <p className="mt-4 font-semibold text-amber">
                TC-{issue.linkedTestCase.id.toString().padStart(4, "0")} -{" "}
                {issue.linkedTestCase.title}
              </p>
            ) : (
              <Link
                href={`/dashboard/test-cases/${issue.linkedTestCase.id}`}
                className="mt-4 inline-flex font-semibold text-amber transition hover:text-coral"
              >
                TC-{issue.linkedTestCase.id.toString().padStart(4, "0")} -{" "}
                {issue.linkedTestCase.title}
              </Link>
            )}
          </div>
        )}

        {issue.originExecution && (
          <div className="mt-8 rounded-lg border border-coral/40 bg-coral/10 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">
              Originating failed execution
            </h2>
            <p className="mt-2 text-sm leading-6 text-beige">
              {issue.originExecution.test_case_reference} ·{" "}
              {issue.originExecution.title_snapshot} failed in{" "}
              {issue.originExecution.run.suite_name} for{" "}
              {issue.originExecution.run.release_label}.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-beige">
              <span>{issue.originExecution.run.environment}</span>
              <span>
                Execution EX-{String(issue.originExecution.id).padStart(4, "0")}
              </span>
            </div>
            {!isDeveloper(user) && (
              <Link
                href={`/dashboard/test-runs/${issue.originExecution.run.id}`}
                className="mt-4 inline-flex font-semibold text-amber transition hover:text-coral"
              >
                View test run context
              </Link>
            )}
          </div>
        )}

        {issue.linkedTestCase &&
          issue.linkedTestCase.requirementLinks.length > 0 && (
            <section className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold text-ivory">
                Requirement and release context
              </h2>
              <p className="mt-2 text-sm text-beige">
                Current QA traceability for the Test Case linked to this defect.
                Historical execution snapshots remain unchanged.
              </p>
              <div className="mt-4 space-y-3">
                {issue.linkedTestCase.requirementLinks.map(
                  ({ requirement }) => (
                    <div
                      key={requirement.id}
                      className="rounded-lg border border-bronze bg-espresso/45 p-4"
                    >
                      <p className="font-semibold text-ivory [overflow-wrap:anywhere]">
                        {isDeveloper(user) ? (
                          <span>
                            REQ-{String(requirement.id).padStart(4, "0")} ·{" "}
                            {requirement.title}
                          </span>
                        ) : (
                          <Link
                            href={`/dashboard/requirements/${requirement.id}`}
                            className="transition hover:text-coral"
                          >
                            REQ-{String(requirement.id).padStart(4, "0")} ·{" "}
                            {requirement.title}
                          </Link>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-beige">
                        {requirement.feature_module}
                        {requirement.releaseLinks.length
                          ? ` · Releases: ${requirement.releaseLinks.map((item) => item.release.name).join(", ")}`
                          : " · Not in a QA Release"}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Severity</p>
            <div className="mt-3">
              <Badge label={issue.severity} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Status</p>
            <div className="mt-3">
              <Badge label={issue.status} />
            </div>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Created by</p>
            <p className="mt-2 font-semibold text-ivory">
              {issue.creator.username}
            </p>
            <p className="text-sm text-beige">
              {formatEnumLabel(issue.creator.role)}
            </p>
          </article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <p className="text-sm text-beige">Assigned to</p>
            <p className="mt-2 font-semibold text-ivory">
              {issue.assignee?.username ?? "Unassigned"}
            </p>
          </article>
        </div>

        {isDeveloper(user) && (
          <div className="mt-8 rounded-lg border border-amber/40 bg-amber/10 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">
              Developer notes placeholder
            </h2>
            <p className="mt-2 text-sm leading-6 text-beige">
              Use discussion for implementation notes and status updates to
              communicate progress while reviewing QA evidence and linked test
              context.
            </p>
          </div>
        )}

        <IssueLifecycleIndicator status={issue.status} />

        {issue.linkedTestCase && issue.status === "RESOLVED" && (
          <div className="mt-8 rounded-lg border border-amber/40 bg-amber/10 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">
              Retest linked test case before closing
            </h2>
            <p className="mt-2 text-sm leading-6 text-beige">
              Fix marked resolved. Retest the linked Test Case before closing
              this bug report.
            </p>
          </div>
        )}

        <IssueLifecycleActions
          issueId={issue.id}
          status={issue.status}
          canClose={canTransitionIssueStatus(user, issue, "CLOSED")}
          canReopen={canTransitionIssueStatus(user, issue, "REOPENED")}
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            ["Environment / browser / device", issue.environment],
            ["Steps to reproduce", issue.steps_to_reproduce],
            ["Expected result", issue.expected_result],
            ["Actual result", issue.actual_result],
            [
              "Timeline",
              `Created ${new Date(issue.created_at).toLocaleString()}\nUpdated ${new Date(issue.updated_at).toLocaleString()}`,
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

        <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-ivory">
                Related Test Cases
              </h2>
              <p className="mt-1 text-sm text-beige">
                QA scenarios linked to this bug report.
              </p>
            </div>
            {canCreateTestCase(user) && (
              <Link
                href="/dashboard/test-cases/new"
                className="text-sm font-semibold text-coral transition hover:text-amber"
              >
                Create test case
              </Link>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {issue.testCases.length === 0 ? (
              <p className="text-sm text-beige">
                No test cases are linked to this bug report yet.
              </p>
            ) : (
              issue.testCases.map((testCase) => (
                <div
                  key={testCase.id}
                  className="flex flex-col gap-3 rounded-lg border border-bronze bg-espresso/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-amber">
                      TC-{testCase.id.toString().padStart(4, "0")}
                    </p>
                    <Link
                      href={`/dashboard/test-cases/${testCase.id}`}
                      className="font-semibold text-ivory transition hover:text-coral"
                    >
                      {testCase.title}
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Badge label={testCase.status} />
                    <Badge label={testCase.priority} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <EvidenceSection
          issueId={issue.id}
          currentUserId={user.id}
          currentUserRole={user.role}
          canUpload={canUploadEvidence(user, issue)}
        />
        <CommentsSection issueId={issue.id} />
        <ActivityTimeline issueId={issue.id} />

        {canDeleteIssue(user, issue) && (
          <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
            <p className="mb-4 text-sm text-beige">
              Admin-only destructive action.
            </p>
            <DeleteIssueButton issueId={issue.id} />
          </div>
        )}
      </section>
    </main>
  );
}
