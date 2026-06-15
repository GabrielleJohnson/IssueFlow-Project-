import Link from "next/link";
import { Badge } from "@/components/Badge";
import { SectionHeader } from "@/components/SectionHeader";
import { formatEnumLabel } from "@/lib/issueOptions";
import type { IssueRecord, IssueStats, IssueUser } from "@/lib/issueTypes";

type IssueDashboardProps = {
  issues: IssueRecord[];
  stats: IssueStats;
  user: IssueUser;
};

const statCards = [
  { key: "open", label: "Open Bugs", detail: "Awaiting triage" },
  { key: "inProgress", label: "In Progress", detail: "Actively owned" },
  { key: "resolved", label: "Resolved", detail: "Ready to close" },
  { key: "critical", label: "Critical Issues", detail: "Release risk" }
] as const;

export function IssueDashboard({ issues, stats, user }: IssueDashboardProps) {
  return (
    <div className="pt-24">
      <section id="dashboard" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Dashboard"
            title="Fast triage for every defect that matters."
            description="IssueFlow now tracks real issues from your local database while keeping the focused QA workflow intact."
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
          <p className="text-sm text-beige">{stats.total} total issues in your local IssueFlow database.</p>
          <Link href="/dashboard/issues/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
            Create Issue
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.key} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <p className="text-sm text-beige">{card.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="font-display text-4xl text-ivory">{stats[card.key]}</strong>
                <span className="text-right text-xs font-semibold text-amber">{card.detail}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold">Recent Issues</h3>
              <p className="mt-1 text-sm text-beige">Database-backed defects ordered by most recent update.</p>
            </div>
            <span className="text-sm font-semibold text-coral">Live issue board</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">Issue</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Creator</th>
                  <th className="px-5 py-4">Assigned</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr className="border-t border-bronze/70">
                    <td className="px-5 py-8 text-beige" colSpan={7}>No issues yet. Create your first QA issue to populate the dashboard.</td>
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
                      <td className="px-5 py-4 text-beige">{issue.creator.username}</td>
                      <td className="px-5 py-4 text-beige">{issue.assignee?.username ?? "Unassigned"}</td>
                      <td className="px-5 py-4 text-beige">{new Date(issue.updated_at).toLocaleDateString()}</td>
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
      </section>

      <section id="analytics" className="bg-[#18120f] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Analytics"
            title="Readable QA signals without a reporting maze."
            description="The analytics cards now reflect real issue status and severity counts from SQLite."
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
              <h3 className="font-display text-xl font-semibold">Status Mix</h3>
              <div className="mt-6 space-y-3">
                {["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"].map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-lg border border-bronze bg-espresso/60 p-3">
                    <span className="font-semibold text-ivory">{formatEnumLabel(status)}</span>
                    <span className="text-sm font-semibold text-amber">{issues.filter((issue) => issue.status === status).length}</span>
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
