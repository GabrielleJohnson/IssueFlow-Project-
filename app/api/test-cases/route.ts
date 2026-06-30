import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isTestCasePriority, isTestCaseStatus } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

function testCaseSelect() {
  return {
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
    linkedIssue: { select: { id: true, title: true, severity: true, status: true } }
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view test cases." }, { status: 401 });
  }

  const testCases = await prisma.testCase.findMany({
    orderBy: { updated_at: "desc" },
    select: testCaseSelect()
  });

  return NextResponse.json({ testCases });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to create test cases." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const feature_module = String(body?.feature_module ?? "").trim();
  const preconditions = String(body?.preconditions ?? "").trim();
  const test_steps = String(body?.test_steps ?? "").trim();
  const expected_result = String(body?.expected_result ?? "").trim();
  const actual_result = String(body?.actual_result ?? "").trim();
  const status = String(body?.status ?? "NOT_RUN");
  const priority = String(body?.priority ?? "MEDIUM");
  const linked_issue_id = body?.linked_issue_id ? Number(body.linked_issue_id) : null;

  if (!title || !description || !feature_module || !preconditions || !test_steps || !expected_result || !actual_result) {
    return NextResponse.json({ error: "Test case title, feature/module, preconditions, steps, expected result, and actual result are required." }, { status: 400 });
  }

  if (!isTestCaseStatus(status) || !isTestCasePriority(priority)) {
    return NextResponse.json({ error: "Invalid status or priority value." }, { status: 400 });
  }

  if (linked_issue_id) {
    const linkedIssue = await prisma.issue.findUnique({ where: { id: linked_issue_id } });

    if (!linkedIssue) {
      return NextResponse.json({ error: "Linked bug report was not found." }, { status: 400 });
    }
  }

  const testCase = await prisma.testCase.create({
    data: {
      title,
      description,
      feature_module,
      preconditions,
      test_steps,
      expected_result,
      actual_result,
      status,
      priority,
      created_by: user.id,
      linked_issue_id
    },
    select: testCaseSelect()
  });

  return NextResponse.json({ testCase }, { status: 201 });
}
