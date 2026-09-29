import Link from "next/link";
import { Badge } from "@/components/Badge";
import { roleDashboardDescription, roleDashboardTitle } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { canCreateIssue, canCreateTestCase, canEditIssue, canViewAnalytics, isAdmin, isDeveloper, isTester } from "@/lib/permissions";
import { formatEnumLabel } from "@/lib/issueOptions";
import type { IssueRecord, IssueStats, IssueUser, TestCaseRecord } from "@/lib/issueTypes";

type IssueDashboardProps = {
  issues: IssueRecord[];
  testCases: TestCaseRecord[];
  stats: IssueStats;
  user: IssueUser;
};

function statCardsForRole(user: IssueUser, stats: IssueStats) {
  if (isAdmin(user)) {
    return [
      { label: "Total Users", value: stats.totalUsers, detail: "Managed accounts" },
      { label: "Open Bugs", value: stats.open, detail: "Needs triage" },
      { label: "Failed Tests", value: stats.failedTests, detail: "Risk signals" },
      { label: "Evidence Files", value: stats.evidenceCount, detail: "Attached context" }
    ];
  }

  if (isDeveloper(user)) {
    return [
      { label: "Visible Bugs", value: stats.total, detail: "Assigned or open" },
      { label: "In Progress", value: stats.inProgress, detail: "Being fixed" },
      { label: "Open Bugs", value: stats.open, detail: "Ready to pick up" },
      { label: "Critical Issues", value: stats.critical, detail: "Release risk" }
    ];
  }

  return [
    { label: "Total Test Cases", value: stats.totalTestCases, detail: "QA coverage" },
    { label: "Failed Tests", value: stats.failedTests, detail: "Create bug reports" },
    { label: "Bug Reports", value: stats.total, detail: "Defects tracked" },
    { label: "Evidence Files", value: stats.evidenceCount, detail: "Uploaded by you" }
  ];
}

export function IssueDashboard({ issues, testCases, stats, user }: IssueDashboardProps) {
  const cards = statCardsForRole(user, stats);

  return (
    <div className="pt-24">
      <section id="dashboard" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <SectionHeader
              eyebrow={`${formatEnumLabel(user.role)} Dashboard`}
              title={roleDashboardTitle(user.role)}
              description={roleDashboardDescription(user.role)}
            />
          </div>
          <div className="w-full min-w-0 rounded-lg border border-bronze bg-clay p-4 shadow-card lg:w-80 lg:flex-none">
            <p className="text-sm text-beige">Signed in as</p>
            <p className="mt-1 max-w-full font-semibold text-ivory [overflow-wrap:anywhere]">{user.username}</p>
            <div className="mt-2 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between lg:flex-col xl:flex-row">
              <p className="min-w-0 max-w-full text-sm text-beige [overflow-wrap:anywhere]">{user.email}</p>
              <span className="shrink-0"><Badge label={user.role} /></span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-beige">
            {isDeveloper(user)
              ? `${stats.total} assigned or unassigned bug reports are visible to you.`
              : `${stats.total} bug reports and ${stats.totalTestCases} test cases are available in IssueFlow.`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {canCreateTestCase(user) && (
              <Link href="/dashboard/test-cases/new" className="rounded-full border border-bronze px-5 py-3 text-center text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">
                Create Test Case
              </Link>
            )}
            {canCreateIssue(user) && (
              <Link href="/dashboard/issues/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
                Create Bug Report
              </Link>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <p className="text-sm text-beige">{card.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="font-display text-4xl text-ivory">{card.value}</strong>
                <span className="text-right text-xs font-semibold text-amber">{card.detail}</span>
              </div>
            </article>
          ))}
        </div>

        {isDeveloper(user) && (
          <div className="mt-8 rounded-lg border border-amber/40 bg-amber/10 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">Developer workflow</h2>
            <p className="mt-2 text-sm leading-6 text-beige">Open a bug report to review reproduction details, linked test cases, and evidence. Use edit only to move the status through Open, In Progress, In Review, Resolved, or Closed.</p>
          </div>
        )}

        {isTester(user) && (
          <div className="mt-8 rounded-lg border border-sage/40 bg-sage/10 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">Tester workflow</h2>
            <p className="mt-2 text-sm leading-6 text-beige">Focus on test coverage, failed runs, and clean bug reports with evidence. Failed test cases can still open prefilled bug reports.</p>
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">Recent Bug Reports</h3>
                <p className="mt-1 text-sm text-beige">{isDeveloper(user) ? "Assigned and unassigned defects ready for engineering attention." : "Bug reports for defects discovered during testing."}</p>
              </div>
              <Link href="/dashboard/issues" className="text-sm font-semibold text-coral transition hover:text-amber">View bug reports</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                  <tr>
                    <th className="px-5 py-4">Bug Report</th>
                    <th className="px-5 py-4">Severity</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Assigned</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 ? (
                    <tr className="border-t border-bronze/70">
                      <td className="px-5 py-8 text-beige" colSpan={5}>No bug reports match your role view yet.</td>
                    </tr>
                  ) : (
                    issues.map((issue) => (
                      <tr key={issue.id} className="border-t border-bronze/70">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ivory">IF-{issue.id.toString().padStart(4, "0")}</p>
                          <p className="mt-1 max-w-md text-beige">{issue.title}</p>
                        </td>
                        <td className="px-5 py-4"><Badge label={issue.severity} /></td>
                        <td className="px-5 py-4"><Badge label={issue.status} /></td>
                        <td className="px-5 py-4 text-beige">{issue.assignee?.username ?? "Unassigned"}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-3">
                            <Link className="font-semibold text-amber transition hover:text-coral" href={`/dashboard/issues/${issue.id}`}>View</Link>
                            {(canEditIssue(user, issue) || isDeveloper(user)) && <Link className="font-semibold text-beige transition hover:text-ivory" href={`/dashboard/issues/${issue.id}/edit`}>Edit</Link>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">Recent Test Cases</h3>
                <p className="mt-1 text-sm text-beige">Latest QA coverage updates and failed-test signals.</p>
              </div>
              {!isDeveloper(user) && <Link href="/dashboard/test-cases" className="text-sm font-semibold text-coral transition hover:text-amber">View test cases</Link>}
            </div>
            <div className="divide-y divide-bronze/70">
              {testCases.length === 0 ? (
                <p className="p-5 text-sm text-beige">No test cases are visible for this role yet.</p>
              ) : (
                testCases.map((testCase) => (
                  <div key={testCase.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-amber">TC-{testCase.id.toString().padStart(4, "0")}</p>
                        <Link href={`/dashboard/test-cases/${testCase.id}`} className="mt-1 block font-semibold text-ivory transition hover:text-coral">{testCase.title}</Link>
                        <p className="mt-2 text-sm text-beige">{testCase.linkedIssue ? `Linked to IF-${testCase.linkedIssue.id.toString().padStart(4, "0")}` : "No linked issue"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge label={testCase.status} />
                        <Badge label={testCase.priority} />
                      </div>
                    </div>
                    {testCase.status === "FAILED" && (
                      <p className="mt-3 rounded-lg border border-ember/40 bg-ember/15 px-3 py-2 text-xs font-semibold text-[#ff9aa2]">
                        Failed test: review for bug report.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {canViewAnalytics(user) && (
        <section id="analytics" className="bg-[#18120f] px-5 py-20 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-bronze bg-clay p-6 shadow-card lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">Analytics</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Go deeper than the operational dashboard.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-beige">Explore live defect status, severity, test outcomes, reopen history, workload, problem areas, and recent activity for your role.</p>
            </div>
            <Link href="/dashboard/analytics" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
              View Analytics
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

