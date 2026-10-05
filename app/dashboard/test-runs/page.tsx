import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel, testRunStatuses } from "@/lib/issueOptions";
import { canViewTestManagement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { runProgress, testRunReference } from "@/lib/testManagement";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function TestRunsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewTestManagement(user)) redirect("/dashboard");

  const raw = await searchParams;
  const q = first(raw.q).trim().slice(0, 120);
  const requestedStatus = first(raw.status);
  const status = testRunStatuses.includes(
    requestedStatus as (typeof testRunStatuses)[number],
  )
    ? requestedStatus
    : "";
  const sort = first(raw.sort) === "oldest" ? "oldest" : "newest";
  const requestedPage = Math.max(Number(first(raw.page)) || 1, 1);
  const requestedPageSize = Number(first(raw.pageSize));
  const pageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const filters: Prisma.TestRunWhereInput[] = [];

  if (q)
    filters.push({
      OR: [
        { suite_name: { contains: q } },
        { release_label: { contains: q } },
        { environment: { contains: q } },
      ],
    });
  if (status) filters.push({ status });

  const where: Prisma.TestRunWhereInput = filters.length
    ? { AND: filters }
    : {};
  const total = await prisma.testRun.count({ where });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const direction = sort === "oldest" ? "asc" : "desc";
  const runs = await prisma.testRun.findMany({
    where,
    orderBy: [{ started_at: direction }, { id: direction }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      creator: { select: { username: true } },
      executions: { select: { status: true } },
    },
  });

  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (status) base.set("status", status);
  if (sort !== "newest") base.set("sort", sort);
  if (pageSize !== 10) base.set("pageSize", String(pageSize));
  if (page > 1) base.set("page", String(page));
  const statePath = base.size
    ? `/dashboard/test-runs?${base}`
    : "/dashboard/test-runs";
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(base);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    return next.size ? `/dashboard/test-runs?${next}` : "/dashboard/test-runs";
  };

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Execution History"
            title="Test Runs"
            description="Execute suite snapshots by build and environment without overwriting prior results."
          />
          <Link
            href="/dashboard/test-runs/new"
            className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso"
          >
            Start Test Run
          </Link>
        </div>
        <form
          key={statePath}
          method="get"
          className="mt-8 grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card lg:grid-cols-[1fr_220px_200px_auto]"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Search runs
            </span>
            <input
              className="field"
              name="q"
              defaultValue={q}
              placeholder="Suite, release, or environment"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Status
            </span>
            <select className="field" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {testRunStatuses.map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Sort
            </span>
            <select className="field" name="sort" defaultValue={sort}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso">
              Apply
            </button>
            {base.size > 0 && (
              <Link
                href="/dashboard/test-runs"
                className="pb-3 text-sm font-semibold text-amber"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5">
            <h2 className="font-display text-xl font-semibold">
              Execution Sessions
            </h2>
            <p className="mt-1 text-sm text-beige">{total} matching runs</p>
          </div>
          {runs.length === 0 ? (
            <p className="p-6 text-sm text-beige">
              No test runs match this view.
            </p>
          ) : (
            <div className="divide-y divide-bronze/70">
              {runs.map((run) => {
                const progress = runProgress(run.executions);
                return (
                  <Link
                    key={run.id}
                    href={`/dashboard/test-runs/${run.id}`}
                    className="grid gap-3 p-5 transition hover:bg-espresso/35 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber">
                        {testRunReference(run.id)} · {run.release_label}
                      </p>
                      <h3 className="mt-1 font-semibold">{run.suite_name}</h3>
                      <p className="mt-1 text-sm text-beige">
                        {run.environment} · {run.creator.username}
                      </p>
                    </div>
                    <div className="text-sm text-beige">
                      <strong className="text-ivory">
                        {progress.executed}/{progress.total}
                      </strong>{" "}
                      executed · {progress.percent}%
                    </div>
                    <Badge label={run.status} />
                  </Link>
                );
              })}
            </div>
          )}
          <ListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            from={total ? (page - 1) * pageSize + 1 : 0}
            to={total ? Math.min(page * pageSize, total) : 0}
            hrefForPage={pageHref}
          />
        </div>
      </section>
    </main>
  );
}
