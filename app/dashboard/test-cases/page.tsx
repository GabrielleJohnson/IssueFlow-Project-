import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ActiveFilterBar } from "@/components/productivity/ActiveFilterBar";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import {
  formatEnumLabel,
  testCasePriorities,
  testCaseStatuses,
} from "@/lib/issueOptions";
import {
  canCreateTestCase,
  canEditTestCase,
  isDeveloper,
} from "@/lib/permissions";
import {
  hasTestCaseListState,
  listTestCases,
  pageSizeOptions,
  parseTestCaseListQuery,
  testCaseQueryParams,
  testCaseWhereForUser,
} from "@/lib/productivity";
import { prisma } from "@/lib/prisma";

type TestCasesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sortOptions = [
  ["updated", "Recently updated"],
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["priority", "Priority: critical first"],
  ["status", "Status: action first"],
] as const;

export default async function TestCasesPage({
  searchParams,
}: TestCasesPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsedQuery = parseTestCaseListQuery(await searchParams);
  const [result, moduleRows] = await Promise.all([
    listTestCases(user, parsedQuery),
    prisma.testCase.findMany({
      where: testCaseWhereForUser(user),
      distinct: ["feature_module"],
      orderBy: { feature_module: "asc" },
      select: { feature_module: true },
    }),
  ]);
  const { testCases, pagination, query } = result;
  const modules = moduleRows.map((row) => row.feature_module).filter(Boolean);

  if (parsedQuery.page !== query.page) {
    const canonical = testCaseQueryParams(query).toString();
    redirect(
      canonical
        ? `/dashboard/test-cases?${canonical}`
        : "/dashboard/test-cases",
    );
  }

  const params = testCaseQueryParams(query).toString();
  const currentListPath = params
    ? `/dashboard/test-cases?${params}`
    : "/dashboard/test-cases";
  const activeItems = [
    query.q ? `Search: ${query.q}` : "",
    query.status ? `Status: ${formatEnumLabel(query.status)}` : "",
    query.priority ? `Priority: ${formatEnumLabel(query.priority)}` : "",
    query.module ? `Module: ${query.module}` : "",
    query.linked === "linked"
      ? "Linked bug"
      : query.linked === "none"
        ? "No linked bug"
        : "",
    query.sort !== "updated"
      ? `Sort: ${sortOptions.find(([value]) => value === query.sort)?.[1]}`
      : "",
    query.pageSize !== 10 ? `${query.pageSize} per page` : "",
  ].filter(Boolean);
  const hasState = hasTestCaseListState(query);
  const clearSearchParams = testCaseQueryParams(query, {
    q: "",
    page: 1,
  }).toString();

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Test Cases"
            title="QA Verification Scenarios"
            description={
              isDeveloper(user)
                ? "Search test cases linked to bug reports visible to you for focused reproduction context."
                : "Search and organize the QA scenarios used to verify expected behavior."
            }
          />
          {canCreateTestCase(user) && (
            <Link
              href="/dashboard/test-cases/new"
              className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
            >
              Create Test Case
            </Link>
          )}
        </div>

        <form
          key={currentListPath}
          method="get"
          className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card"
        >
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-beige">
                Search test cases
              </span>
              <input
                className="field"
                type="search"
                name="q"
                defaultValue={query.q}
                placeholder="TC-0004, title, module, description, preconditions"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">
                Status
              </span>
              <select
                className="field"
                name="status"
                defaultValue={query.status}
              >
                <option value="">All statuses</option>
                {testCaseStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">
                Priority
              </span>
              <select
                className="field"
                name="priority"
                defaultValue={query.priority}
              >
                <option value="">All priorities</option>
                {testCasePriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatEnumLabel(priority)}
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
                defaultValue={query.module}
              >
                <option value="">All modules</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">
                Linked bug
              </span>
              <select
                className="field"
                name="linked"
                defaultValue={query.linked}
              >
                <option value="">All test cases</option>
                <option value="linked">Linked</option>
                <option value="none">Not linked</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">
                Sort
              </span>
              <select className="field" name="sort" defaultValue={query.sort}>
                {sortOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">
                Rows per page
              </span>
              <select
                className="field"
                name="pageSize"
                defaultValue={String(query.pageSize)}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
            >
              Apply view
            </button>
            {query.q && (
              <Link
                href={
                  clearSearchParams
                    ? `/dashboard/test-cases?${clearSearchParams}`
                    : "/dashboard/test-cases"
                }
                className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
              >
                Clear search
              </Link>
            )}
            {hasState && (
              <Link
                href="/dashboard/test-cases"
                className="text-sm font-semibold text-amber transition hover:text-coral"
              >
                Reset all
              </Link>
            )}
          </div>
        </form>

        <ActiveFilterBar
          items={activeItems}
          resetHref="/dashboard/test-cases"
        />

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Scenario Library
              </h2>
              <p className="mt-1 text-sm text-beige">
                {pagination.total}{" "}
                {pagination.total === 1
                  ? "test case matches"
                  : "test cases match"}{" "}
                this view.
              </p>
            </div>
            <span className="text-sm font-semibold text-coral">
              QA coverage
            </span>
          </div>
          {testCases.length === 0 ? (
            <div className="border-b border-bronze/70 px-5 py-10 text-center">
              <p className="font-semibold text-ivory">
                {pagination.visibleTotal === 0
                  ? "No test cases yet."
                  : "No test cases match your current search and filters."}
              </p>
              {pagination.visibleTotal > 0 && (
                <Link
                  href="/dashboard/test-cases"
                  className="mt-3 inline-flex font-semibold text-amber transition hover:text-coral"
                >
                  Clear search and filters
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                  <tr>
                    <th className="px-5 py-4">Test Case</th>
                    <th className="px-5 py-4">Feature / Module</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Linked Bug Report</th>
                    <th className="px-5 py-4">Creator</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((testCase) => {
                    const detailHref = `/dashboard/test-cases/${testCase.id}?from=${encodeURIComponent(currentListPath)}`;
                    return (
                      <tr
                        key={testCase.id}
                        className={
                          testCase.status === "FAILED"
                            ? "border-t border-ember/60 bg-ember/5"
                            : "border-t border-bronze/70"
                        }
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={detailHref}
                            className="font-semibold text-ivory transition hover:text-coral"
                          >
                            TC-{testCase.id.toString().padStart(4, "0")}
                          </Link>
                          <Link
                            href={detailHref}
                            className="mt-1 block max-w-md text-beige transition hover:text-ivory"
                          >
                            {testCase.title}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-beige">
                          {testCase.feature_module}
                        </td>
                        <td className="px-5 py-4">
                          <Badge label={testCase.status} />
                        </td>
                        <td className="px-5 py-4">
                          <Badge label={testCase.priority} />
                        </td>
                        <td className="px-5 py-4 text-beige">
                          {testCase.linkedIssue
                            ? `IF-${testCase.linkedIssue.id.toString().padStart(4, "0")}`
                            : "None"}
                        </td>
                        <td className="px-5 py-4 text-beige">
                          {testCase.creator.username}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-3">
                            <Link
                              className="font-semibold text-amber transition hover:text-coral"
                              href={detailHref}
                            >
                              View
                            </Link>
                            {canEditTestCase(user, testCase) && (
                              <Link
                                className="font-semibold text-beige transition hover:text-ivory"
                                href={`/dashboard/test-cases/${testCase.id}/edit`}
                              >
                                Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ListPagination
            {...pagination}
            hrefForPage={(page) => {
              const value = testCaseQueryParams(query, { page }).toString();
              return value
                ? `/dashboard/test-cases?${value}`
                : "/dashboard/test-cases";
            }}
          />
        </div>
      </section>
    </main>
  );
}
