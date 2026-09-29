import { NextRequest, NextResponse } from "next/server";
import { assignmentMessage, logIssueActivity, statusActivityType, statusChangeMessage } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { isIssueSeverity, isIssueStatus } from "@/lib/issueOptions";
import { canAssignIssue, canDeleteIssue, canEditIssue, canTransitionIssueStatus, canUpdateIssueStatus, canViewIssue, issueStatusOnlyPayload } from "@/lib/permissions";
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
    origin_execution_id: true,
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

async function validateAssignee(assignedTo: number | null) {
  if (!assignedTo) {
    return { ok: true as const, assignee: null };
  }

  const assignee = await prisma.user.findUnique({ where: { id: assignedTo }, select: { id: true, username: true, role: true } });

  if (!assignee || assignee.role !== "DEVELOPER") {
    return { ok: false as const, error: "Bug reports can only be assigned to developer users." };
  }

  return { ok: true as const, assignee };
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

  if (!canViewIssue(user, issue)) {
    return NextResponse.json({ error: "You do not have permission to view this bug report." }, { status: 403 });
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

  const existingIssue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      assignee: { select: { id: true, username: true } },
      linkedTestCase: { select: { id: true, title: true } }
    }
  });

  if (!existingIssue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = String(body?.status ?? existingIssue.status);
  const reopenReason = String(body?.reopen_reason ?? "").trim();

  if (!isIssueStatus(status)) {
    return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
  }

  if (status !== existingIssue.status && !canTransitionIssueStatus(user, existingIssue, status)) {
    return NextResponse.json({ error: `Invalid status transition from ${existingIssue.status} to ${status}.` }, { status: 403 });
  }

  if (issueStatusOnlyPayload(body)) {
    if (!canUpdateIssueStatus(user, existingIssue)) {
      return NextResponse.json({ error: "You do not have permission to update this bug report status." }, { status: 403 });
    }

    const issue = await prisma.issue.update({
      where: { id: issueId },
      data: { status },
      select: issueSelect()
    });

    if (status !== existingIssue.status) {
      await logIssueActivity({
        issueId,
        actorId: user.id,
        actionType: statusActivityType(status),
        fieldName: "status",
        oldValue: existingIssue.status,
        newValue: status,
        message: statusChangeMessage(user.username, existingIssue.status, status, reopenReason)
      });
    }

    return NextResponse.json({ issue });
  }

  if (!canEditIssue(user, existingIssue)) {
    return NextResponse.json({ error: "You do not have permission to edit this bug report." }, { status: 403 });
  }

  const severity = String(body?.severity ?? existingIssue.severity);
  const assigned_to = body?.assigned_to ? Number(body.assigned_to) : null;
  const linked_test_case_id = body?.linked_test_case_id ? Number(body.linked_test_case_id) : null;

  if (!isIssueSeverity(severity)) {
    return NextResponse.json({ error: "Invalid severity value." }, { status: 400 });
  }

  if (assigned_to !== existingIssue.assigned_to && !canAssignIssue(user, existingIssue)) {
    return NextResponse.json({ error: "You do not have permission to assign this bug report." }, { status: 403 });
  }

  const assigneeValidation = await validateAssignee(assigned_to);

  if (!assigneeValidation.ok) {
    return NextResponse.json({ error: assigneeValidation.error }, { status: 400 });
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

  if (status !== existingIssue.status) {
    await logIssueActivity({
      issueId,
      actorId: user.id,
      actionType: statusActivityType(status),
      fieldName: "status",
      oldValue: existingIssue.status,
      newValue: status,
      message: statusChangeMessage(user.username, existingIssue.status, status, reopenReason)
    });
  }

  if (assigned_to !== existingIssue.assigned_to) {
    await logIssueActivity({
      issueId,
      actorId: user.id,
      actionType: "ASSIGNEE_CHANGED",
      fieldName: "assigned_to",
      oldValue: existingIssue.assigned_to ? String(existingIssue.assigned_to) : null,
      newValue: assigned_to ? String(assigned_to) : null,
      message: assignmentMessage(existingIssue.assignee?.username ?? null, issue.assignee?.username ?? null)
    });
  }

  if (linked_test_case_id !== existingIssue.linked_test_case_id) {
    await logIssueActivity({
      issueId,
      actorId: user.id,
      actionType: linked_test_case_id ? "TEST_CASE_LINKED" : "TEST_CASE_UNLINKED",
      fieldName: "linked_test_case_id",
      oldValue: existingIssue.linked_test_case_id ? String(existingIssue.linked_test_case_id) : null,
      newValue: linked_test_case_id ? String(linked_test_case_id) : null,
      message: linked_test_case_id ? `Linked Test Case TC-${String(linked_test_case_id).padStart(4, "0")}.` : "Linked test case was removed."
    });
  }

  return NextResponse.json({ issue });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete bug reports." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const existingIssue = await prisma.issue.findUnique({ where: { id: issueId } });

  if (!existingIssue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  if (!canDeleteIssue(user, existingIssue)) {
    return NextResponse.json({ error: "Only admins can delete bug reports." }, { status: 403 });
  }

  await prisma.issue.delete({ where: { id: issueId } });

  return NextResponse.json({ ok: true });
}
