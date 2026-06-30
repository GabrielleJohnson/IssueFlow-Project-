import Link from "next/link";
import { Badge } from "@/components/Badge";
import { SectionHeader } from "@/components/SectionHeader";
import { formatEnumLabel } from "@/lib/issueOptions";
import type { IssueRecord, IssueStats, IssueUser, TestCaseRecord } from "@/lib/issueTypes";

type IssueDashboardProps = {
  issues: IssueRecord[];
  testCases: TestCaseRecord[];
  stats: IssueStats;
  user: IssueUser;
};

const issueStatCards = [
  { key: "open", label: "Open Bugs", detail: "Awaiting triage" },
  { key: "inProgress", label: "In Progress", detail: "Actively owned" },
  { key: "resolved", label: "Resolved", detail: "Ready to close" },
  { key: "critical", label: "Critical Issues", detail: "Release risk" }
] as const;

const testStatCards = [
  { key: "totalTestCases", label: "Total Test Cases", detail: "QA coverage" },
  { key: "passedTests", label: "Passed Tests", detail: "Verified" },
  { key: "failedTests", label: "Failed Tests", detail: "Needs defect review" },
  { key: "blockedTests", label: "Blocked Tests", detail: "Waiting on access" }
] as const;

export function IssueDashboard({ issues, testCases, stats, user }: IssueDashboardProps) {
  return (
    <div className="pt-24">
      <section id="dashboard" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Dashboard"
            title="Fast triage for every defect that matters."
            description="IssueFlow now tracks real issues and test cases from your local database while keeping the focused QA workflow intact."
          />
          <div className="rounded-lg border border-bronze bg-clay p-4 shadow-card lg:min-w-72">
            <p className="text-sm text-beige">Signed in as</p>
            <p className="mt-1 font-semibold text-ivory">{user.username}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-beige">{user.email}</p>
              <Badge label={user.role} />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-beige">{stats.total} issues and {stats.totalTestCases} test cases in your local IssueFlow database.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/test-cases/new" className="rounded-full border border-bronze px-5 py-3 text-center text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">
              Create Test Case
            </Link>
            <Link href="/dashboard/issues/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
              Create Bug Report
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {issueStatCards.map((card) => (
            <article key={card.key} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <p className="text-sm text-beige">{card.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="font-display text-4xl text-ivory">{stats[card.key]}</strong>
                <span className="text-right text-xs font-semibold text-amber">{card.detail}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testStatCards.map((card) => (
            <article key={card.key} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <p className="text-sm text-beige">{card.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="font-display text-4xl text-ivory">{stats[card.key]}</strong>
                <span className="text-right text-xs font-semibold text-amber">{card.detail}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">Recent Bug Reports</h3>
                <p className="mt-1 text-sm text-beige">Bug reports for defects discovered during testing, ordered by most recent update.</p>
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
                      <td className="px-5 py-8 text-beige" colSpan={5}>No bug reports yet. Create one when a test case fails or a defect is discovered.</td>
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
                            <Link className="font-semibold text-beige transition hover:text-ivory" href={`/dashboard/issues/${issue.id}/edit`}>Edit</Link>
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
              <Link href="/dashboard/test-cases" className="text-sm font-semibold text-coral transition hover:text-amber">View test cases</Link>
            </div>
            <div className="divide-y divide-bronze/70">
              {testCases.length === 0 ? (
                <p className="p-5 text-sm text-beige">No test cases yet. Add one to begin tracking QA coverage.</p>
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

      <section id="analytics" className="bg-[#18120f] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Analytics"
            title="Readable QA signals without a reporting maze."
            description="The analytics cards now reflect real issue status, severity counts, and test case outcomes from SQLite."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Bugs by Severity</h3>
              <div className="mt-6 space-y-4">
                {[["Critical", stats.critical, "#E63946"], ["High", issues.filter((issue) => issue.severity === "HIGH").length, "#FF6B4A"], ["Medium", issues.filter((issue) => issue.severity === "MEDIUM").length, "#F7B267"], ["Low", issues.filter((issue) => issue.severity === "LOW").length, "#8DB596"]].map(([label, value, color]) => (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-sm text-beige">
                      <span>{label}</span>
                      <span>{value} bugs</span>
                    </div>
                    <div className="h-3 rounded-full bg-espresso">
                      <div className="h-3 rounded-full" style={{ width: `${Math.min(Number(value) * 12, 100)}%`, backgroundColor: String(color) }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Resolution Progress</h3>
              <div className="mt-8 flex items-center justify-center">
                <div className="grid h-44 w-44 place-items-center rounded-full border-[18px] border-sage bg-espresso shadow-glow">
                  <div className="text-center">
                    <p className="font-display text-4xl font-bold text-ivory">{stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-beige">Resolved</p>
                  </div>
                </div>
              </div>
            </article>
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Test Outcomes</h3>
              <div className="mt-6 space-y-3">
                {[
                  ["PASSED", stats.passedTests],
                  ["FAILED", stats.failedTests],
                  ["BLOCKED", stats.blockedTests],
                  ["NOT_RUN", Math.max(stats.totalTestCases - stats.passedTests - stats.failedTests - stats.blockedTests, 0)]
                ].map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-bronze bg-espresso/60 p-3">
                    <span className="font-semibold text-ivory">{formatEnumLabel(String(status))}</span>
                    <span className="text-sm font-semibold text-amber">{count}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

