import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { testRunStatuses } from "@/lib/issueOptions";
import { canCreateTestRun, canViewTestManagement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to view test runs." },
      { status: 401 },
    );
  if (!canViewTestManagement(user))
    return NextResponse.json(
      { error: "You do not have permission to view test runs." },
      { status: 403 },
    );
  const q = cleanText(request.nextUrl.searchParams.get("q"), 120);
  const requestedStatus = String(
    request.nextUrl.searchParams.get("status") ?? "",
  );
  const status = testRunStatuses.includes(
    requestedStatus as (typeof testRunStatuses)[number],
  )
    ? requestedStatus
    : "";
  const sort =
    request.nextUrl.searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const requestedSize = Number(request.nextUrl.searchParams.get("pageSize"));
  const pageSize = [10, 25, 50].includes(requestedSize) ? requestedSize : 10;
  const requestedPage = Math.max(
    Number(request.nextUrl.searchParams.get("page")) || 1,
    1,
  );
  const filters: Prisma.TestRunWhereInput[] = [];
  if (q)
    filters.push({
      OR: [
        { suite_name: { contains: q, mode: "insensitive" } },
        { release_label: { contains: q, mode: "insensitive" } },
        { environment: { contains: q, mode: "insensitive" } },
      ],
    });
  if (status) filters.push({ status });
  const where = filters.length ? { AND: filters } : {};
  const total = await prisma.testRun.count({ where });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const runs = await prisma.testRun.findMany({
    where,
    orderBy: [{ started_at: sort }, { id: sort }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      creator: { select: { id: true, username: true } },
      executions: { select: { status: true } },
    },
  });
  return NextResponse.json({
    runs,
    pagination: { total, page, pageSize, totalPages },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to start test runs." },
      { status: 401 },
    );
  if (!canCreateTestRun(user))
    return NextResponse.json(
      { error: "You do not have permission to start test runs." },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  const suiteId = Number(body?.suite_id);
  const releaseLabel = cleanText(body?.release_label, 120);
  const environment = cleanText(body?.environment, 240);
  const notes = cleanText(body?.notes, 2000);
  if (!Number.isInteger(suiteId) || !releaseLabel || !environment)
    return NextResponse.json(
      { error: "Test suite, release/build, and environment are required." },
      { status: 400 },
    );
  const suite = await prisma.testSuite.findUnique({
    where: { id: suiteId },
    include: {
      memberships: {
        orderBy: { added_at: "asc" },
        include: { testCase: true },
      },
    },
  });
  if (!suite)
    return NextResponse.json(
      { error: "Test suite not found." },
      { status: 404 },
    );
  if (suite.memberships.length === 0)
    return NextResponse.json(
      { error: "Add at least one test case before starting a run." },
      { status: 400 },
    );
  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.testRun.create({
      data: {
        suite_id: suite.id,
        suite_name: suite.name,
        release_label: releaseLabel,
        environment,
        notes,
        status: "IN_PROGRESS",
        created_by: user.id,
      },
    });
    await tx.testExecution.createMany({
      data: suite.memberships.map(({ testCase }) => ({
        run_id: created.id,
        test_case_id: testCase.id,
        test_case_reference: `TC-${String(testCase.id).padStart(4, "0")}`,
        title_snapshot: testCase.title,
        description_snapshot: testCase.description,
        feature_module_snapshot: testCase.feature_module,
        preconditions_snapshot: testCase.preconditions,
        test_steps_snapshot: testCase.test_steps,
        expected_result_snapshot: testCase.expected_result,
        priority_snapshot: testCase.priority,
      })),
    });
    return tx.testRun.findUniqueOrThrow({
      where: { id: created.id },
      include: { executions: { orderBy: { id: "asc" } } },
    });
  });
  return NextResponse.json({ run }, { status: 201 });
}
