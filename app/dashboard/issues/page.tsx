import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ActiveFilterBar } from "@/components/productivity/ActiveFilterBar";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel, issueSeverities, issueStatuses } from "@/lib/issueOptions";
import { canCreateIssue, canEditIssue, isDeveloper } from "@/lib/permissions";
import { hasIssueListState, issueQueryParams, listIssues, pageSizeOptions, parseIssueListQuery } from "@/lib/productivity";
import { prisma } from "@/lib/prisma";

type IssuesPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const sortOptions = [
  ["updated", "Recently updated"], ["newest", "Newest first"], ["oldest", "Oldest first"],
  ["severity", "Severity: critical first"], ["status", "Status: attention first"]
] as const;

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsedQuery = parseIssueListQuery(await searchParams);
  const [result, developers] = await Promise.all([
    listIssues(user, parsedQuery),
    isDeveloper(user) ? Promise.resolve([]) : prisma.user.findMany({ where: { role: "DEVELOPER" }, orderBy: { username: "asc" }, select: { id: true, username: true } })
  ]);
  const { issues, pagination, query } = result;

  if (parsedQuery.page !== query.page) {
    const canonical = issueQueryParams(query).toString();
    redirect(canonical ? `/dashboard/issues?${canonical}` : "/dashboard/issues");
  }

  const params = issueQueryParams(query).toString();
  const currentListPath = params ? `/dashboard/issues?${params}` : "/dashboard/issues";
  const activeItems = [
    query.q ? `Search: ${query.q}` : "",
    query.status ? `Status: ${formatEnumLabel(query.status)}` : "",
    query.severity ? `Severity: ${formatEnumLabel(query.severity)}` : "",
    query.assignee === "unassigned" ? "Assignee: Unassigned" : query.assignee ? `Assignee: ${developers.find((developer) => developer.id === Number(query.assignee))?.username ?? "Developer"}` : "",
    query.linked === "failed" ? "Linked failed test" : query.linked === "none" ? "No failed test link" : "",
    query.sort !== "updated" ? `Sort: ${sortOptions.find(([value]) => value === query.sort)?.[1]}` : "",
    query.pageSize !== 10 ? `${query.pageSize} per page` : ""
  ].filter(Boolean);
  const hasState = hasIssueListState(query);
  const clearSearchParams = issueQueryParams(query, { q: "", page: 1 }).toString();

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow="Issues" title="Bug Reports" description={isDeveloper(user) ? "Search assigned and unassigned defects, update status, and inspect QA evidence." : "Search and organize defects discovered during testing without losing the QA context."} />
          {canCreateIssue(user) && <Link href="/dashboard/issues/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">Create Bug Report</Link>}
        </div>

        <form key={currentListPath} method="get" className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Search bug reports</span><input className="field" type="search" name="q" defaultValue={query.q} placeholder="IF-0004, title, summary, environment, assignee" /></label>
            <label><span className="mb-2 block text-sm font-semibold text-beige">Status</span><select className="field" name="status" defaultValue={query.status}><option value="">All statuses</option>{issueStatuses.map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}</select></label>
            <label><span className="mb-2 block text-sm font-semibold text-beige">Severity</span><select className="field" name="severity" defaultValue={query.severity}><option value="">All severities</option>{issueSeverities.map((severity) => <option key={severity} value={severity}>{formatEnumLabel(severity)}</option>)}</select></label>
            {!isDeveloper(user) && <label><span className="mb-2 block text-sm font-semibold text-beige">Assignee</span><select className="field" name="assignee" defaultValue={query.assignee}><option value="">All assignees</option><option value="unassigned">Unassigned</option>{developers.map((developer) => <option key={developer.id} value={developer.id}>{developer.username}</option>)}</select></label>}
            <label><span className="mb-2 block text-sm font-semibold text-beige">Failed test link</span><select className="field" name="linked" defaultValue={query.linked}><option value="">All bug reports</option><option value="failed">Linked to failed test</option><option value="none">Not linked</option></select></label>
            <label><span className="mb-2 block text-sm font-semibold text-beige">Sort</span><select className="field" name="sort" defaultValue={query.sort}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="mb-2 block text-sm font-semibold text-beige">Rows per page</span><select className="field" name="pageSize" defaultValue={String(query.pageSize)}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">Apply view</button>
            {query.q && <Link href={clearSearchParams ? `/dashboard/issues?${clearSearchParams}` : "/dashboard/issues"} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">Clear search</Link>}
            {hasState && <Link href="/dashboard/issues" className="text-sm font-semibold text-amber transition hover:text-coral">Reset all</Link>}
          </div>
        </form>

        <ActiveFilterBar items={activeItems} resetHref="/dashboard/issues" />

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5"><h2 className="font-display text-xl font-semibold">Defect Queue</h2><p className="mt-1 text-sm text-beige">{pagination.total} {pagination.total === 1 ? "bug report matches" : "bug reports match"} this view.</p></div>
          {issues.length === 0 ? (
            <div className="border-b border-bronze/70 px-5 py-10 text-center">
              <p className="font-semibold text-ivory">{pagination.visibleTotal === 0 ? "No bug reports yet." : "No bug reports match your current search and filters."}</p>
              {pagination.visibleTotal > 0 && <Link href="/dashboard/issues" className="mt-3 inline-flex font-semibold text-amber transition hover:text-coral">Clear search and filters</Link>}
            </div>
          ) : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige"><tr><th className="px-5 py-4">Bug Report</th><th className="px-5 py-4">Severity</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Assignee</th><th className="px-5 py-4">Environment</th><th className="px-5 py-4">Failed Test</th><th className="px-5 py-4">Actions</th></tr></thead>
            <tbody>{issues.map((issue) => {
              const detailHref = `/dashboard/issues/${issue.id}?from=${encodeURIComponent(currentListPath)}`;
              return <tr key={issue.id} className={issue.status === "REOPENED" ? "border-t border-ember/60 bg-ember/5" : "border-t border-bronze/70"}>
                <td className="px-5 py-4"><Link href={detailHref} className="font-semibold text-ivory transition hover:text-coral">IF-{issue.id.toString().padStart(4, "0")}</Link><Link href={detailHref} className="mt-1 block max-w-md text-beige transition hover:text-ivory">{issue.title}</Link></td>
                <td className="px-5 py-4"><Badge label={issue.severity} /></td><td className="px-5 py-4"><Badge label={issue.status} /></td><td className="px-5 py-4 text-beige">{issue.assignee?.username ?? "Unassigned"}</td><td className="px-5 py-4 text-beige">{issue.environment}</td><td className="px-5 py-4 text-beige">{issue.linkedTestCase ? `TC-${issue.linkedTestCase.id.toString().padStart(4, "0")}` : "None"}</td>
                <td className="px-5 py-4"><div className="flex gap-3"><Link className="font-semibold text-amber transition hover:text-coral" href={detailHref}>View</Link>{(canEditIssue(user, issue) || isDeveloper(user)) && <Link className="font-semibold text-beige transition hover:text-ivory" href={`/dashboard/issues/${issue.id}/edit`}>Edit</Link>}</div></td>
              </tr>;
            })}</tbody>
          </table></div>}
          <ListPagination {...pagination} hrefForPage={(page) => { const value = issueQueryParams(query, { page }).toString(); return value ? `/dashboard/issues?${value}` : "/dashboard/issues"; }} />
        </div>
      </section>
    </main>
  );
}
