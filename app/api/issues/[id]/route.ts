import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canDeleteIssue, isIssueSeverity, isIssueStatus } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

function issueSelect() {
  return {
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
  };
}

async function getIssueId(params: Params["params"]) {
  const { id } = await params;
  const issueId = Number(id);
  return Number.isInteger(issueId) ? issueId : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view this bug report." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: issueSelect() });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  return NextResponse.json({ issue });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to update bug reports." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });

  if (!existingIssue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const severity = String(body?.severity ?? existingIssue.severity);
  const status = String(body?.status ?? existingIssue.status);
  const assigned_to = body?.assigned_to ? Number(body.assigned_to) : null;
  const linked_test_case_id = body?.linked_test_case_id ? Number(body.linked_test_case_id) : null;

  if (!isIssueSeverity(severity) || !isIssueStatus(status)) {
    return NextResponse.json({ error: "Invalid severity or status value." }, { status: 400 });
  }

  if (assigned_to) {
    const assignee = await prisma.user.findUnique({ where: { id: assigned_to } });

    if (!assignee) {
      return NextResponse.json({ error: "Assigned user was not found." }, { status: 400 });
    }
  }

  if (linked_test_case_id) {
    const linkedTestCase = await prisma.testCase.findUnique({ where: { id: linked_test_case_id } });

    if (!linkedTestCase) {
      return NextResponse.json({ error: "Linked failed test case was not found." }, { status: 400 });
    }
  }

  const data = {
    title: String(body?.title ?? existingIssue.title).trim(),
    description: String(body?.description ?? existingIssue.description).trim(),
    environment: String(body?.environment ?? existingIssue.environment).trim(),
    steps_to_reproduce: String(body?.steps_to_reproduce ?? existingIssue.steps_to_reproduce).trim(),
    expected_result: String(body?.expected_result ?? existingIssue.expected_result).trim(),
    actual_result: String(body?.actual_result ?? existingIssue.actual_result).trim(),
    severity,
    status,
    assigned_to,
    linked_test_case_id
  };

  if (!data.title || !data.description || !data.environment || !data.steps_to_reproduce || !data.expected_result || !data.actual_result) {
    return NextResponse.json({ error: "Bug title, summary, environment, reproduction steps, expected result, and actual result are required." }, { status: 400 });
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data,
    select: issueSelect()
  });

  return NextResponse.json({ issue });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete bug reports." }, { status: 401 });
  }

  if (!canDeleteIssue(user.role)) {
    return NextResponse.json({ error: "You do not have permission to delete bug reports." }, { status: 403 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });

  if (!existingIssue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  await prisma.issue.delete({ where: { id: issueId } });

  return NextResponse.json({ ok: true });
}
