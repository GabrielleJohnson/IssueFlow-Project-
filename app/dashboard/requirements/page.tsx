import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ActiveFilterBar } from "@/components/productivity/ActiveFilterBar";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import {
  coverageStates,
  formatEnumLabel,
  requirementStatuses,
  testCasePriorities,
  type CoverageState,
} from "@/lib/issueOptions";
import { canViewRequirements } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  coverageLabels,
  coverageState,
  requirementReference,
} from "@/lib/requirements";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? (input[0] ?? "") : (input ?? "");
}

export default async function RequirementsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewRequirements(user)) redirect("/dashboard");
  const raw = await searchParams;
  const q = value(raw.q).trim().slice(0, 120);
  const status = requirementStatuses.includes(value(raw.status) as never)
    ? value(raw.status)
    : "";
  const priority = testCasePriorities.includes(value(raw.priority) as never)
    ? value(raw.priority)
    : "";
  const featureModule = value(raw.module).trim().slice(0, 100);
  const coverage = coverageStates.includes(value(raw.coverage) as never)
    ? (value(raw.coverage) as CoverageState)
    : "";
  const sort = ["updated", "newest", "oldest", "priority", "status"].includes(
    value(raw.sort),
  )
    ? value(raw.sort)
    : "updated";
  const pageSize = [10, 25, 50].includes(Number(value(raw.pageSize)))
    ? Number(value(raw.pageSize))
    : 10;
  const requestedPage = Math.max(Number(value(raw.page)) || 1, 1);
  const referenceMatch = q.match(/^REQ-?0*(\d+)$/i);
  const referenceId = referenceMatch ? Number(referenceMatch[1]) : null;
  const where = {
    AND: [
      q
        ? {
            OR: [
              ...(referenceId ? [{ id: referenceId }] : []),
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { feature_module: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      status ? { status } : {},
      priority ? { priority } : {},
      featureModule ? { feature_module: featureModule } : {},
    ],
  };
  const all = await prisma.requirement.findMany({
    where,
    include: {
      creator: { select: { username: true } },
      testCaseLinks: {
        include: {
          testCase: {
            include: {
              executions: {
                orderBy: [
                  { executed_at: "desc" },
                  { updated_at: "desc" },
                  { id: "desc" },
                ],
              },
            },
          },
        },
      },
      _count: { select: { releaseLinks: true } },
    },
  });
  const priorityRank = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const statusRank = ["BLOCKED", "READY", "DRAFT", "VERIFIED"];
  const enriched = all
    .map((item) => ({
      ...item,
      coverage: coverageState(item.testCaseLinks.map((link) => link.testCase)),
    }))
    .filter((item) => !coverage || item.coverage === coverage)
    .toSorted((a, b) => {
      if (sort === "priority")
        return (
          priorityRank.indexOf(a.priority) - priorityRank.indexOf(b.priority) ||
          b.id - a.id
        );
      if (sort === "status")
        return (
          statusRank.indexOf(a.status) - statusRank.indexOf(b.status) ||
          b.id - a.id
        );
      if (sort === "oldest")
        return a.created_at.getTime() - b.created_at.getTime() || a.id - b.id;
      if (sort === "newest")
        return b.created_at.getTime() - a.created_at.getTime() || b.id - a.id;
      return b.updated_at.getTime() - a.updated_at.getTime() || b.id - a.id;
    });
  const total = enriched.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const requirements = enriched.slice((page - 1) * pageSize, page * pageSize);
  const modules = await prisma.requirement.findMany({
    distinct: ["feature_module"],
    select: { feature_module: true },
    orderBy: { feature_module: "asc" },
  });
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (featureModule) params.set("module", featureModule);
  if (coverage) params.set("coverage", coverage);
  if (sort !== "updated") params.set("sort", sort);
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  if (page > 1) params.set("page", String(page));
  const statePath = params.size
    ? `/dashboard/requirements?${params}`
    : "/dashboard/requirements";
  const active = [
    q && `Search: ${q}`,
    status && `Status: ${formatEnumLabel(status)}`,
    priority && `Priority: ${formatEnumLabel(priority)}`,
    featureModule && `Module: ${featureModule}`,
    coverage && `Coverage: ${coverageLabels[coverage]}`,
    sort !== "updated" && `Sort: ${formatEnumLabel(sort)}`,
    pageSize !== 10 && `Rows: ${pageSize}`,
  ].filter(Boolean) as string[];
  function pageHref(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    return next.size
      ? `/dashboard/requirements?${next}`
      : "/dashboard/requirements";
  }
  const clearSearch = new URLSearchParams(params);
  clearSearch.delete("q");
  clearSearch.delete("page");
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="QA Coverage"
            title="Requirements"
            description="Define what QA must verify and connect each requirement to executable Test Cases."
          />
          <Link
            href="/dashboard/requirements/new"
            className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso"
          >
            Create Requirement
          </Link>
        </div>
        <form
          key={statePath}
          method="get"
          className="mt-8 grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="xl:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-beige">
              Search requirements
            </span>
            <input
              className="field"
              name="q"
              defaultValue={q}
              placeholder="Reference, title, description, or module"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Status
            </span>
            <select className="field" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {requirementStatuses.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Priority
            </span>
            <select className="field" name="priority" defaultValue={priority}>
              <option value="">All priorities</option>
              {testCasePriorities.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Feature / module
            </span>
            <select
              className="field"
              name="module"
              defaultValue={featureModule}
            >
              <option value="">All modules</option>
              {modules.map((item) => (
                <option key={item.feature_module}>{item.feature_module}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Coverage
            </span>
            <select className="field" name="coverage" defaultValue={coverage}>
              <option value="">All coverage states</option>
              {coverageStates.map((item) => (
                <option key={item} value={item}>
                  {coverageLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Sort
            </span>
            <select className="field" name="sort" defaultValue={sort}>
              <option value="updated">Recently updated</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Rows per page
            </span>
            <select className="field" name="pageSize" defaultValue={pageSize}>
              {[10, 25, 50].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-3 xl:col-span-4">
            <button className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso">
              Apply
            </button>
            {q && (
              <Link
                href={
                  clearSearch.size
                    ? `/dashboard/requirements?${clearSearch}`
                    : "/dashboard/requirements"
                }
                className="pb-3 text-sm font-semibold text-amber"
              >
                Clear Search
              </Link>
            )}
            {active.length > 0 && (
              <Link
                href="/dashboard/requirements"
                className="pb-3 text-sm font-semibold text-beige"
              >
                Reset All
              </Link>
            )}
          </div>
        </form>
        <ActiveFilterBar items={active} resetHref="/dashboard/requirements" />
        <section className="mt-6 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          {requirements.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="font-display text-xl font-semibold">
                {all.length === 0 &&
                !q &&
                !status &&
                !priority &&
                !featureModule
                  ? "No Requirements yet"
                  : "No Requirements match this view"}
              </h2>
              <p className="mt-2 text-sm text-beige">
                {all.length === 0 &&
                !q &&
                !status &&
                !priority &&
                !featureModule
                  ? "Create the first QA requirement, then link Test Cases to establish coverage."
                  : "Adjust or reset the current filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bronze/70">
              {requirements.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/requirements/${item.id}?from=${encodeURIComponent(statePath)}`}
                  className="grid min-w-0 gap-4 p-5 transition hover:bg-espresso/30 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center sm:p-6"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
                      {requirementReference(item.id)} · {item.feature_module}
                    </p>
                    <h2 className="mt-2 font-display text-xl font-semibold [overflow-wrap:anywhere]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm text-beige">
                      {item.testCaseLinks.length} linked Test Case
                      {item.testCaseLinks.length === 1 ? "" : "s"} ·{" "}
                      {item._count.releaseLinks} release
                      {item._count.releaseLinks === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge label={item.coverage} />
                  <div className="flex gap-2">
                    <Badge label={item.status} />
                    <Badge label={item.priority} />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <ListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            from={total ? (page - 1) * pageSize + 1 : 0}
            to={Math.min(page * pageSize, total)}
            hrefForPage={pageHref}
          />
        </section>
      </section>
    </main>
  );
}
