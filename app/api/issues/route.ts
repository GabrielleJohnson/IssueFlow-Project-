import { NextRequest, NextResponse } from "next/server";
import { logIssueActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { isIssueSeverity, isIssueStatus } from "@/lib/issueOptions";
import { canCreateIssue } from "@/lib/permissions";
import { listIssues, parseIssueListQuery } from "@/lib/productivity";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view bug reports." }, { status: 401 });
  }

  const result = await listIssues(user, parseIssueListQuery(request.nextUrl.searchParams));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to create bug reports." }, { status: 401 });
  }

  if (!canCreateIssue(user)) {
    return NextResponse.json({ error: "You do not have permission to create bug reports." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const environment = String(body?.environment ?? "").trim();
  const steps_to_reproduce = String(body?.steps_to_reproduce ?? "").trim();
  const expected_result = String(body?.expected_result ?? "").trim();
  const actual_result = String(body?.actual_result ?? "").trim();
  const severity = String(body?.severity ?? "MEDIUM");
  const status = String(body?.status ?? "OPEN");
  const assigned_to = body?.assigned_to ? Number(body.assigned_to) : null;
  const linked_test_case_id = body?.linked_test_case_id ? Number(body.linked_test_case_id) : null;
  const origin_execution_id = body?.origin_execution_id ? Number(body.origin_execution_id) : null;

  if (!title || !description || !environment || !steps_to_reproduce || !expected_result || !actual_result) {
    return NextResponse.json({ error: "Bug title, summary, environment, reproduction steps, expected result, and actual result are required." }, { status: 400 });
  }

  if (!isIssueSeverity(severity) || !isIssueStatus(status)) {
    return NextResponse.json({ error: "Invalid severity or status value." }, { status: 400 });
  }

  if (status !== "OPEN") {
    return NextResponse.json({ error: "New bug reports must start as OPEN." }, { status: 400 });
  }

  if (assigned_to) {
    const assignee = await prisma.user.findUnique({ where: { id: assigned_to } });

    if (!assignee || assignee.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Bug reports can only be assigned to developer users." }, { status: 400 });
    }
  }

  if (linked_test_case_id) {
    const linkedTestCase = await prisma.testCase.findUnique({ where: { id: linked_test_case_id } });

    if (!linkedTestCase) {
      return NextResponse.json({ error: "Linked failed test case was not found." }, { status: 400 });
    }
  }

  if (origin_execution_id) {
    const execution = await prisma.testExecution.findUnique({ where: { id: origin_execution_id }, include: { bugReport: true } });
    if (!execution || execution.status !== "FAILED") return NextResponse.json({ error: "Failed execution was not found." }, { status: 400 });
    if (execution.bugReport) return NextResponse.json({ error: "A bug report already exists for this execution.", issueId: execution.bugReport.id }, { status: 409 });
    if (execution.test_case_id && linked_test_case_id !== execution.test_case_id) return NextResponse.json({ error: "The linked test case must match the failed execution." }, { status: 400 });
  }

  const issue = await prisma.issue.create({
    data: {
      title,
      description,
      environment,
      steps_to_reproduce,
      expected_result,
      actual_result,
      severity,
      status,
      created_by: user.id,
      assigned_to,
      linked_test_case_id,
      origin_execution_id
    },
    select: issueSelect()
  });

  await logIssueActivity({ issueId: issue.id, actorId: user.id, actionType: "ISSUE_CREATED", message: `${user.username} created this bug report.` });

  if (assigned_to && issue.assignee) {
    await logIssueActivity({ issueId: issue.id, actorId: user.id, actionType: "ASSIGNEE_CHANGED", fieldName: "assigned_to", oldValue: null, newValue: String(assigned_to), message: `Assigned to ${issue.assignee.username}.` });
  }

  if (linked_test_case_id) {
    await logIssueActivity({ issueId: issue.id, actorId: user.id, actionType: "BUG_CREATED_FROM_FAILED_TEST", fieldName: "linked_test_case_id", oldValue: null, newValue: String(linked_test_case_id), message: `Bug report created from failed Test Case TC-${String(linked_test_case_id).padStart(4, "0")}.` });
  }


  if (origin_execution_id) {
    await logIssueActivity({ issueId: issue.id, actorId: user.id, actionType: "BUG_CREATED_FROM_EXECUTION", fieldName: "origin_execution_id", oldValue: null, newValue: String(origin_execution_id), message: `Bug report created from failed execution EX-${String(origin_execution_id).padStart(4, "0")}.` });
  }

  return NextResponse.json({ issue }, { status: 201 });
}
