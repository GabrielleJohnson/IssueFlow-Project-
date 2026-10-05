import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import {
  formatEnumLabel,
  isReleaseStatus,
  releaseStatuses,
} from "@/lib/issueOptions";
import { canViewReleases } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getReleaseReadiness } from "@/lib/releaseReadiness";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const pageSizes = [10, 25, 50];

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? (input[0] ?? "") : (input ?? "");
}

export default async function ReleasesPage({ searchParams }: Props) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (!canViewReleases(user)) redirect("/dashboard");

  const raw = await searchParams;
  const q = value(raw.q).trim().slice(0, 120);
  const rawStatus = value(raw.status);
  const status = isReleaseStatus(rawStatus) ? rawStatus : "";
  const sort = value(raw.sort) === "oldest" ? "oldest" : "updated";
  const requestedPageSize = Number(value(raw.pageSize));
  const pageSize = pageSizes.includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const requestedPage = Math.max(Number(value(raw.page)) || 1, 1);

  const where: Prisma.ReleaseWhereInput = {
    AND: [
      q
        ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] }
        : {},
      status ? { status } : {},
    ],
  };
  const total = await prisma.release.count({ where });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const direction: Prisma.SortOrder = sort === "oldest" ? "asc" : "desc";
  const records = await prisma.release.findMany({
    where,
    orderBy: [{ updated_at: direction }, { id: direction }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { _count: { select: { runs: true, requirements: true } } },
  });
  const readiness = await Promise.all(
    records.map((item) => getReleaseReadiness(item.id)),
  );
  const releases = records.map((item, index) => ({
    ...item,
    assessment: readiness[index]?.readiness ?? "NOT_READY",
  }));

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (sort !== "updated") params.set("sort", sort);
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  if (page > 1) params.set("page", String(page));

  const statePath = params.size
    ? `/dashboard/releases?${params}`
    : "/dashboard/releases";

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    return next.size ? `/dashboard/releases?${next}` : "/dashboard/releases";
  }

  const databaseIsEmpty = total === 0 && !q && !status;

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Release Readiness"
            title="QA Releases"
            description="Combine scoped Requirements, Test Runs, executions, and open defects into a deterministic ship-readiness view."
          />
          <Link
            href="/dashboard/releases/new"
            className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso"
          >
            Create Release
          </Link>
        </div>

        <form
          key={statePath}
          className="mt-8 grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-[1fr_220px_200px_auto]"
        >
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Search releases
            </span>
            <input
              className="field"
              name="q"
              defaultValue={q}
              placeholder="Version or release description"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">
              Status
            </span>
            <select className="field" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {releaseStatuses.map((item) => (
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
              <option value="updated">Recently updated</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso">
              Apply
            </button>
            {params.size > 0 && (
              <Link
                href="/dashboard/releases"
                className="pb-3 text-sm font-semibold text-beige"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          {releases.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="font-display text-xl font-semibold">
                {databaseIsEmpty
                  ? "No QA Releases yet"
                  : "No Releases match this view"}
              </h2>
              <p className="mt-2 text-sm text-beige">
                {databaseIsEmpty
                  ? "Create a lightweight release record and associate Requirements and Test Runs."
                  : "Adjust or reset the current filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bronze/70">
              {releases.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/releases/${item.id}`}
                  className="grid min-w-0 gap-4 p-5 transition hover:bg-espresso/30 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center sm:p-6"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
                      Release RL-{String(item.id).padStart(4, "0")}
                    </p>
                    <h2 className="mt-2 font-display text-xl font-semibold [overflow-wrap:anywhere]">
                      {item.name}
                    </h2>
                    <p className="mt-2 text-sm text-beige">
                      {item._count.requirements} requirements ·{" "}
                      {item._count.runs} test runs
                      {item.target_date
                        ? ` · target ${item.target_date.toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <Badge label={item.assessment} />
                  <Badge label={item.status} />
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
