import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { getAnalyticsData } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/issueOptions";
import { canViewAnalytics, isAdmin, isDeveloper } from "@/lib/permissions";

function MetricCard({ label, value, detail, accent = "text-ivory" }: { label: string; value: string | number; detail: string; accent?: string }) {
  return (
    <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
      <p className="text-sm text-beige">{label}</p>
      <p className={`mt-3 font-display text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-beige">{detail}</p>
    </article>
  );
}

function analyticsScopeCopy(scope: "all" | "qa" | "developer") {
  if (scope === "all") return "Organization-wide QA data, developer workload, and recorded defect activity.";
  if (scope === "developer") return "Scoped to bug reports assigned to you or currently unassigned, plus their linked test context.";
  return "QA-wide bug reports and test case outcomes available to tester accounts.";
}

const activityDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewAnalytics(user)) redirect("/dashboard");

  const analytics = await getAnalyticsData(user);
  const { summary, reopenMetrics } = analytics;

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={`${formatEnumLabel(user.role)} Analytics`} title="QA health, without the reporting maze." description="Read the current defect queue, test performance, verification failures, and recent team activity from live IssueFlow data." />
          <div className="max-w-md rounded-lg border border-bronze bg-clay p-4 shadow-card">
            <div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-amber">Data scope</span><Badge label={user.role} /></div>
            <p className="mt-2 text-sm leading-6 text-beige">{analyticsScopeCopy(analytics.scope)}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Bug Reports" value={summary.totalBugReports} detail="All bug reports in your visible scope." />
          <MetricCard label="Active / Open Bugs" value={summary.openBugs} detail="Open, In Progress, In Review, or Reopened." accent="text-coral" />
          <MetricCard label="Critical Bugs" value={summary.criticalBugs} detail="Bug reports currently marked Critical." accent="text-[#ff9aa2]" />
          <MetricCard label="Reopened Bugs" value={summary.reopenedBugs} detail="Defects currently awaiting another fix cycle." accent="text-[#ff9aa2]" />
          <MetricCard label="Total Test Cases" value={summary.totalTestCases} detail="Structured QA scenarios visible to your role." />
          <MetricCard label="Failed Test Cases" value={summary.failedTestCases} detail="Failed runs that may require bug reports." accent="text-[#ff9aa2]" />
          <MetricCard label="Test Pass Rate" value={`${summary.testPassRate}%`} detail={summary.executedTestCases ? `${summary.executedTestCases} executed tests; Not Run excluded.` : "No test cases have been executed yet."} accent="text-sage" />
          <MetricCard label="Unassigned Bugs" value={summary.unassignedBugs} detail="Active bug reports without a developer." accent="text-amber" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="In Progress" value={summary.inProgressBugs} detail="Defects currently being worked." />
          <MetricCard label="Resolved" value={summary.resolvedBugs} detail="Awaiting verification or closure." />
          <MetricCard label="Closed" value={summary.closedBugs} detail="Verified and completed defects." />
        </div>

        <div className="mt-8"><AnalyticsCharts analytics={analytics} /></div>

        <section className="mt-8 rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">v0.7 Execution History</p><h2 className="mt-2 font-display text-2xl font-semibold">Test Run Results</h2><p className="mt-1 text-sm text-beige">Calculated only from Test Run execution records; legacy Test Case status data is not backfilled or reinterpreted.</p></div>
          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6"><MetricCard label="Historical Executions" value={analytics.executionAnalytics.totalExecutions} detail="All execution snapshots in your visible scope."/><MetricCard label="Executed Results" value={analytics.executionAnalytics.executed} detail="Passed, Failed, or Blocked; Not Run excluded."/><MetricCard label="Execution Pass Rate" value={`${analytics.executionAnalytics.passRate}%`} detail="Passed / (Passed + Failed + Blocked)." accent="text-sage"/></div>
          <div className="grid gap-6 border-t border-bronze p-5 lg:grid-cols-2 sm:p-6"><div><h3 className="font-display text-lg font-semibold">Results by Release / Build</h3>{analytics.executionAnalytics.releaseResults.length===0?<p className="mt-3 text-sm text-beige">No execution-backed release data yet.</p>:<div className="mt-4 space-y-3">{analytics.executionAnalytics.releaseResults.map(item=><div key={item.release} className="rounded-lg border border-bronze bg-espresso/45 p-4"><p className="font-semibold">{item.release}</p><p className="mt-1 text-sm text-beige">{item.passed} passed · {item.failed} failed · {item.blocked} blocked</p></div>)}</div>}</div><div><h3 className="font-display text-lg font-semibold">Frequently Failing Test Cases</h3>{analytics.executionAnalytics.frequentFailures.length===0?<p className="mt-3 text-sm text-beige">No failed run executions yet.</p>:<div className="mt-4 space-y-3">{analytics.executionAnalytics.frequentFailures.map(item=><div key={item.reference} className="flex items-center justify-between gap-4 rounded-lg border border-bronze bg-espresso/45 p-4"><div><p className="text-xs font-bold text-amber">{item.reference}</p><p className="font-semibold">{item.title}</p></div><span className="font-bold text-[#ff9aa2]">{item.failures} failed</span></div>)}</div>}</div></div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-lg border border-ember/35 bg-clay p-5 shadow-card sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">Verification Quality</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Reopened Defects</h2>
            <p className="mt-2 text-sm leading-6 text-beige">Recorded history shows how often resolved bugs return after failed verification.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="rounded-lg border border-bronze bg-espresso/55 p-4"><p className="text-xs text-beige">Current Reopened</p><p className="mt-2 font-display text-3xl font-bold text-[#ff9aa2]">{reopenMetrics.currentReopenedBugs}</p></div>
              <div className="rounded-lg border border-bronze bg-espresso/55 p-4"><p className="text-xs text-beige">Reopen Events</p><p className="mt-2 font-display text-3xl font-bold text-coral">{reopenMetrics.recordedReopenEvents}</p></div>
              <div className="rounded-lg border border-bronze bg-espresso/55 p-4"><p className="text-xs text-beige">Recorded Rate</p><p className="mt-2 font-display text-3xl font-bold text-amber">{reopenMetrics.recordedReopenRate === null ? "N/A" : `${reopenMetrics.recordedReopenRate}%`}</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-beige">Rate = unique bugs with both recorded Resolved and Reopened activity / unique bugs with recorded Resolved activity. Activity before v0.4.0 is not reconstructed.</p>
          </article>

          <article className="overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="border-b border-bronze p-5 sm:p-6"><h2 className="font-display text-2xl font-semibold">Problem Areas</h2><p className="mt-1 text-sm text-beige">Structured feature/module data ranked by failed tests and linked bug reports.</p></div>
            {analytics.problemAreas.length === 0 ? <p className="p-6 text-sm text-beige">No failed tests or linked bug reports are available to identify a problem area yet.</p> : (
              <div className="divide-y divide-bronze/70">
                {analytics.problemAreas.map((area) => (
                  <div key={area.module} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-6">
                    <p className="font-semibold text-ivory">{area.module}</p>
                    <span className="text-sm text-beige"><strong className="text-[#ff9aa2]">{area.failedTests}</strong> failed tests</span>
                    <span className="text-sm text-beige"><strong className="text-coral">{area.linkedBugReports}</strong> linked bugs</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        {(isAdmin(user) || isDeveloper(user)) && (
          <section className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
            <div className="border-b border-bronze p-5 sm:p-6"><h2 className="font-display text-2xl font-semibold">{isDeveloper(user) ? "My Active Workload" : "Developer Workload"}</h2><p className="mt-1 text-sm text-beige">Only active assigned bugs are counted; Closed and Resolved defects are excluded.</p></div>
            {analytics.developerWorkload.length === 0 ? <p className="p-6 text-sm text-beige">No developer accounts are available for workload reporting.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-espresso/45 text-xs uppercase tracking-[0.14em] text-beige"><tr><th className="px-5 py-4">Developer</th><th className="px-5 py-4">Open</th><th className="px-5 py-4">In Progress</th><th className="px-5 py-4">In Review</th><th className="px-5 py-4">Reopened</th><th className="px-5 py-4">Total Active</th></tr></thead>
                <tbody>{analytics.developerWorkload.map((developer) => <tr key={developer.id} className="border-t border-bronze/70"><td className="px-5 py-4 font-semibold text-ivory">{developer.username}</td><td className="px-5 py-4 tabular-nums text-beige">{developer.counts.OPEN}</td><td className="px-5 py-4 tabular-nums text-beige">{developer.counts.IN_PROGRESS}</td><td className="px-5 py-4 tabular-nums text-beige">{developer.counts.IN_REVIEW}</td><td className="px-5 py-4 tabular-nums text-[#ff9aa2]">{developer.counts.REOPENED}</td><td className="px-5 py-4 font-bold tabular-nums text-amber">{developer.totalActive}</td></tr>)}</tbody>
              </table></div>
            )}
          </section>
        )}

        <section className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="font-display text-2xl font-semibold">Recent Activity</h2><p className="mt-1 text-sm text-beige">The latest meaningful defect actions visible in your analytics scope.</p></div><Link href="/dashboard/issues" className="text-sm font-semibold text-coral transition hover:text-amber">View bug reports</Link></div>
          {analytics.recentActivity.length === 0 ? <p className="p-6 text-sm text-beige">No tracked bug activity is available yet.</p> : (
            <div className="divide-y divide-bronze/70">{analytics.recentActivity.map((activity) => (
              <div key={activity.id} className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                <div className="h-2.5 w-2.5 rounded-full bg-coral shadow-glow" aria-hidden="true" />
                <div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.14em] text-amber">{formatEnumLabel(activity.actionType)}</span><Link href={`/dashboard/issues/${activity.issue.id}`} className="font-semibold text-ivory transition hover:text-coral">IF-{String(activity.issue.id).padStart(4, "0")} · {activity.issue.title}</Link></div><p className="mt-1 text-sm text-beige">{activity.message} {activity.actor ? `Actor: ${activity.actor.username}.` : "System activity."}</p></div>
                <time className="text-xs text-beige" dateTime={activity.createdAt.toISOString()}>{activityDateFormatter.format(activity.createdAt)}</time>
              </div>
            ))}</div>
          )}
        </section>
      </section>
    </main>
  );
}
