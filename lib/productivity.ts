import type { Prisma } from "@prisma/client";
import { issueSeverities, issueStatuses, testCasePriorities, testCaseStatuses } from "@/lib/issueOptions";
import { isDeveloper, issueWhereForUser, type PermissionUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

export const issueSortOptions = ["updated", "newest", "oldest", "severity", "status"] as const;
export const testCaseSortOptions = ["updated", "newest", "oldest", "priority", "status"] as const;
export const pageSizeOptions = [10, 25, 50] as const;

export type IssueSort = (typeof issueSortOptions)[number];
export type TestCaseSort = (typeof testCaseSortOptions)[number];

export type IssueListQuery = {
  q: string;
  status: string;
  severity: string;
  assignee: string;
  linked: string;
  sort: IssueSort;
  page: number;
  pageSize: number;
};

export type TestCaseListQuery = {
  q: string;
  status: string;
  priority: string;
  module: string;
  linked: string;
  sort: TestCaseSort;
  page: number;
  pageSize: number;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  visibleTotal: number;
};

export const issueListSelect = {
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
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  assignee: { select: { id: true, username: true, email: true, role: true } },
  linkedTestCase: { select: { id: true, title: true, status: true, priority: true } }
} as const;

export const testCaseListSelect = {
  id: true,
  title: true,
  description: true,
  feature_module: true,
  preconditions: true,
  test_steps: true,
  expected_result: true,
  actual_result: true,
  status: true,
  priority: true,
  created_by: true,
  linked_issue_id: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  linkedIssue: { select: { id: true, title: true, severity: true, status: true, created_by: true, assigned_to: true } }
} as const;

function readParam(input: SearchParamsInput, key: string) {
  const value = input instanceof URLSearchParams ? input.get(key) : input[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function validPageSize(value: string) {
  const parsed = Number(value);
  return pageSizeOptions.includes(parsed as (typeof pageSizeOptions)[number]) ? parsed : 10;
}

function cleanSearch(value: string) {
  return value.trim().slice(0, 120);
}

export function parseIssueListQuery(input: SearchParamsInput): IssueListQuery {
  const status = readParam(input, "status");
  const severity = readParam(input, "severity");
  const sort = readParam(input, "sort");
  const assignee = readParam(input, "assignee");
  const linked = readParam(input, "linked");

  return {
    q: cleanSearch(readParam(input, "q")),
    status: issueStatuses.includes(status as (typeof issueStatuses)[number]) ? status : "",
    severity: issueSeverities.includes(severity as (typeof issueSeverities)[number]) ? severity : "",
    assignee: assignee === "unassigned" || /^\d+$/.test(assignee) ? assignee : "",
    linked: linked === "failed" || linked === "none" ? linked : "",
    sort: issueSortOptions.includes(sort as IssueSort) ? (sort as IssueSort) : "updated",
    page: positiveInteger(readParam(input, "page"), 1),
    pageSize: validPageSize(readParam(input, "pageSize"))
  };
}

export function parseTestCaseListQuery(input: SearchParamsInput): TestCaseListQuery {
  const status = readParam(input, "status");
  const priority = readParam(input, "priority");
  const sort = readParam(input, "sort");
  const linked = readParam(input, "linked");

  return {
    q: cleanSearch(readParam(input, "q")),
    status: testCaseStatuses.includes(status as (typeof testCaseStatuses)[number]) ? status : "",
    priority: testCasePriorities.includes(priority as (typeof testCasePriorities)[number]) ? priority : "",
    module: readParam(input, "module").trim().slice(0, 100),
    linked: linked === "linked" || linked === "none" ? linked : "",
    sort: testCaseSortOptions.includes(sort as TestCaseSort) ? (sort as TestCaseSort) : "updated",
    page: positiveInteger(readParam(input, "page"), 1),
    pageSize: validPageSize(readParam(input, "pageSize"))
  };
}

function issueReferenceId(search: string) {
  const match = search.match(/^IF-?0*(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function testCaseReferenceId(search: string) {
  const match = search.match(/^TC-?0*(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export function issueWhereForList(user: PermissionUser, query: IssueListQuery): Prisma.IssueWhereInput {
  const filters: Prisma.IssueWhereInput[] = [issueWhereForUser(user)];
  const referenceId = issueReferenceId(query.q);

  if (query.q) {
    filters.push(referenceId
      ? { id: referenceId }
      : {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { environment: { contains: query.q, mode: "insensitive" } },
            { assignee: { is: { username: { contains: query.q, mode: "insensitive" } } } }
          ]
        });
  }

  if (query.status) filters.push({ status: query.status });
  if (query.severity) filters.push({ severity: query.severity });
  if (query.assignee === "unassigned") filters.push({ assigned_to: null });
  if (/^\d+$/.test(query.assignee)) filters.push({ assigned_to: Number(query.assignee), assignee: { is: { role: "DEVELOPER" } } });
  if (query.linked === "failed") filters.push({ linkedTestCase: { is: { status: "FAILED" } } });
  if (query.linked === "none") filters.push({ linked_test_case_id: null });

  return { AND: filters };
}

export function testCaseWhereForUser(user: PermissionUser): Prisma.TestCaseWhereInput {
  return isDeveloper(user)
    ? { linkedIssue: { is: { OR: [{ assigned_to: user.id }, { assigned_to: null }] } } }
    : {};
}

export function testCaseWhereForList(user: PermissionUser, query: TestCaseListQuery): Prisma.TestCaseWhereInput {
  const filters: Prisma.TestCaseWhereInput[] = [testCaseWhereForUser(user)];
  const referenceId = testCaseReferenceId(query.q);

  if (query.q) {
    filters.push(referenceId
      ? { id: referenceId }
      : {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { feature_module: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { preconditions: { contains: query.q, mode: "insensitive" } }
          ]
        });
  }

  if (query.status) filters.push({ status: query.status });
  if (query.priority) filters.push({ priority: query.priority });
  if (query.module) filters.push({ feature_module: query.module });
  if (query.linked === "linked") filters.push({ linked_issue_id: { not: null } });
  if (query.linked === "none") filters.push({ linked_issue_id: null });

  return { AND: filters };
}

function paginationMeta(total: number, visibleTotal: number, requestedPage: number, pageSize: number): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  return {
    page,
    pageSize,
    total,
    totalPages,
    from: total ? (page - 1) * pageSize + 1 : 0,
    to: total ? Math.min(page * pageSize, total) : 0,
    visibleTotal
  };
}

const issueSeverityRank = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const issueStatusRank = ["REOPENED", "OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"];
const testPriorityRank = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const testStatusRank = ["FAILED", "BLOCKED", "NOT_RUN", "PASSED"];

async function rankedIssuePage(where: Prisma.IssueWhereInput, field: "severity" | "status", rank: string[], skip: number, take: number) {
  const counts = field === "severity"
    ? new Map((await prisma.issue.groupBy({ by: ["severity"], where, _count: { _all: true } })).map((group) => [group.severity, group._count._all]))
    : new Map((await prisma.issue.groupBy({ by: ["status"], where, _count: { _all: true } })).map((group) => [group.status, group._count._all]));
  const segments: Array<{ value: string; skip: number; take: number }> = [];
  let remainingSkip = skip;
  let remainingTake = take;

  for (const value of rank) {
    const count = counts.get(value) ?? 0;
    if (remainingSkip >= count) {
      remainingSkip -= count;
      continue;
    }
    const segmentTake = Math.min(count - remainingSkip, remainingTake);
    if (segmentTake > 0) segments.push({ value, skip: remainingSkip, take: segmentTake });
    remainingTake -= segmentTake;
    remainingSkip = 0;
    if (remainingTake === 0) break;
  }

  const chunks = await Promise.all(segments.map((segment) => prisma.issue.findMany({
    where: { AND: [where, { [field]: segment.value }] },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: segment.skip,
    take: segment.take,
    select: issueListSelect
  })));
  return chunks.flat();
}

async function rankedTestCasePage(where: Prisma.TestCaseWhereInput, field: "priority" | "status", rank: string[], skip: number, take: number) {
  const counts = field === "priority"
    ? new Map((await prisma.testCase.groupBy({ by: ["priority"], where, _count: { _all: true } })).map((group) => [group.priority, group._count._all]))
    : new Map((await prisma.testCase.groupBy({ by: ["status"], where, _count: { _all: true } })).map((group) => [group.status, group._count._all]));
  const segments: Array<{ value: string; skip: number; take: number }> = [];
  let remainingSkip = skip;
  let remainingTake = take;

  for (const value of rank) {
    const count = counts.get(value) ?? 0;
    if (remainingSkip >= count) {
      remainingSkip -= count;
      continue;
    }
    const segmentTake = Math.min(count - remainingSkip, remainingTake);
    if (segmentTake > 0) segments.push({ value, skip: remainingSkip, take: segmentTake });
    remainingTake -= segmentTake;
    remainingSkip = 0;
    if (remainingTake === 0) break;
  }

  const chunks = await Promise.all(segments.map((segment) => prisma.testCase.findMany({
    where: { AND: [where, { [field]: segment.value }] },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: segment.skip,
    take: segment.take,
    select: testCaseListSelect
  })));
  return chunks.flat();
}

function issueOrderBy(sort: IssueSort): Prisma.IssueOrderByWithRelationInput[] {
  if (sort === "newest") return [{ created_at: "desc" }, { id: "desc" }];
  if (sort === "oldest") return [{ created_at: "asc" }, { id: "asc" }];
  return [{ updated_at: "desc" }, { id: "desc" }];
}

function testCaseOrderBy(sort: TestCaseSort): Prisma.TestCaseOrderByWithRelationInput[] {
  if (sort === "newest") return [{ created_at: "desc" }, { id: "desc" }];
  if (sort === "oldest") return [{ created_at: "asc" }, { id: "asc" }];
  return [{ updated_at: "desc" }, { id: "desc" }];
}

export async function listIssues(user: PermissionUser, query: IssueListQuery) {
  const scope = issueWhereForUser(user);
  const where = issueWhereForList(user, query);
  const [total, visibleTotal] = await Promise.all([prisma.issue.count({ where }), prisma.issue.count({ where: scope })]);
  const pagination = paginationMeta(total, visibleTotal, query.page, query.pageSize);
  const skip = (pagination.page - 1) * query.pageSize;
  const issues = query.sort === "severity"
    ? await rankedIssuePage(where, "severity", issueSeverityRank, skip, query.pageSize)
    : query.sort === "status"
      ? await rankedIssuePage(where, "status", issueStatusRank, skip, query.pageSize)
      : await prisma.issue.findMany({ where, orderBy: issueOrderBy(query.sort), skip, take: query.pageSize, select: issueListSelect });

  return { issues, pagination, query: { ...query, page: pagination.page } };
}

export async function listTestCases(user: PermissionUser, query: TestCaseListQuery) {
  const scope = testCaseWhereForUser(user);
  const where = testCaseWhereForList(user, query);
  const [total, visibleTotal] = await Promise.all([prisma.testCase.count({ where }), prisma.testCase.count({ where: scope })]);
  const pagination = paginationMeta(total, visibleTotal, query.page, query.pageSize);
  const skip = (pagination.page - 1) * query.pageSize;
  const testCases = query.sort === "priority"
    ? await rankedTestCasePage(where, "priority", testPriorityRank, skip, query.pageSize)
    : query.sort === "status"
      ? await rankedTestCasePage(where, "status", testStatusRank, skip, query.pageSize)
      : await prisma.testCase.findMany({ where, orderBy: testCaseOrderBy(query.sort), skip, take: query.pageSize, select: testCaseListSelect });

  return { testCases, pagination, query: { ...query, page: pagination.page } };
}

export function issueQueryParams(query: IssueListQuery, overrides: Partial<IssueListQuery> = {}) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.severity) params.set("severity", next.severity);
  if (next.assignee) params.set("assignee", next.assignee);
  if (next.linked) params.set("linked", next.linked);
  if (next.sort !== "updated") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  return params;
}

export function testCaseQueryParams(query: TestCaseListQuery, overrides: Partial<TestCaseListQuery> = {}) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.priority) params.set("priority", next.priority);
  if (next.module) params.set("module", next.module);
  if (next.linked) params.set("linked", next.linked);
  if (next.sort !== "updated") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  return params;
}

export function hasIssueListState(query: IssueListQuery) {
  return Boolean(query.q || query.status || query.severity || query.assignee || query.linked || query.sort !== "updated" || query.pageSize !== 10);
}

export function hasTestCaseListState(query: TestCaseListQuery) {
  return Boolean(query.q || query.status || query.priority || query.module || query.linked || query.sort !== "updated" || query.pageSize !== 10);
}

export function safeListReturnPath(value: string | undefined, basePath: "/dashboard/issues" | "/dashboard/test-cases") {
  return value === basePath || value?.startsWith(`${basePath}?`) ? value : basePath;
}
