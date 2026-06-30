import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canDeleteTestCase, isTestCasePriority, isTestCaseStatus } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

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

async function getTestCaseId(params: Params["params"]) {
  const { id } = await params;
  const testCaseId = Number(id);
  return Number.isInteger(testCaseId) ? testCaseId : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view this test case." }, { status: 401 });
  }

  const testCaseId = await getTestCaseId(params);

  if (!testCaseId) {
    return NextResponse.json({ error: "Invalid test case id." }, { status: 400 });
  }

  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId }, select: testCaseSelect() });

  if (!testCase) {
    return NextResponse.json({ error: "Test case not found." }, { status: 404 });
  }

  return NextResponse.json({ testCase });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to update test cases." }, { status: 401 });
  }

  const testCaseId = await getTestCaseId(params);

  if (!testCaseId) {
    return NextResponse.json({ error: "Invalid test case id." }, { status: 400 });
  }

  const existingTestCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });

  if (!existingTestCase) {
    return NextResponse.json({ error: "Test case not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? existingTestCase.status);
  const priority = String(body?.priority ?? existingTestCase.priority);
  const linked_issue_id = body?.linked_issue_id ? Number(body.linked_issue_id) : null;

  if (!isTestCaseStatus(status) || !isTestCasePriority(priority)) {
    return NextResponse.json({ error: "Invalid status or priority value." }, { status: 400 });
  }

  if (linked_issue_id) {
    const linkedIssue = await prisma.issue.findUnique({ where: { id: linked_issue_id } });

    if (!linkedIssue) {
      return NextResponse.json({ error: "Linked bug report was not found." }, { status: 400 });
    }
  }

  const data = {
    title: String(body?.title ?? existingTestCase.title).trim(),
    description: String(body?.description ?? existingTestCase.description).trim(),
    feature_module: String(body?.feature_module ?? existingTestCase.feature_module).trim(),
    preconditions: String(body?.preconditions ?? existingTestCase.preconditions).trim(),
    test_steps: String(body?.test_steps ?? existingTestCase.test_steps).trim(),
    expected_result: String(body?.expected_result ?? existingTestCase.expected_result).trim(),
    actual_result: String(body?.actual_result ?? existingTestCase.actual_result).trim(),
    status,
    priority,
    linked_issue_id
  };

  if (!data.title || !data.description || !data.feature_module || !data.preconditions || !data.test_steps || !data.expected_result || !data.actual_result) {
    return NextResponse.json({ error: "Test case title, feature/module, preconditions, steps, expected result, and actual result are required." }, { status: 400 });
  }

  const testCase = await prisma.testCase.update({
    where: { id: testCaseId },
    data,
    select: testCaseSelect()
  });

  return NextResponse.json({ testCase });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete test cases." }, { status: 401 });
  }

  if (!canDeleteTestCase(user.role)) {
    return NextResponse.json({ error: "You do not have permission to delete test cases." }, { status: 403 });
  }

  const testCaseId = await getTestCaseId(params);

  if (!testCaseId) {
    return NextResponse.json({ error: "Invalid test case id." }, { status: 400 });
  }

  const existingTestCase = await prisma.testCase.findUnique({ where: { id: testCaseId } });

  if (!existingTestCase) {
    return NextResponse.json({ error: "Test case not found." }, { status: 404 });
  }

  await prisma.testCase.delete({ where: { id: testCaseId } });

  return NextResponse.json({ ok: true });
}
