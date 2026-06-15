import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isIssueSeverity, isIssueStatus } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

function issueSelect() {
  return {
    id: true,
    title: true,
    description: true,
    steps_to_reproduce: true,
    expected_result: true,
    actual_result: true,
    severity: true,
    status: true,
    created_by: true,
    assigned_to: true,
    created_at: true,
    updated_at: true,
    creator: { select: { id: true, username: true, email: true, role: true } },
    assignee: { select: { id: true, username: true, email: true, role: true } }
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view issues." }, { status: 401 });
  }

  const issues = await prisma.issue.findMany({
    orderBy: { updated_at: "desc" },
    select: issueSelect()
  });

  return NextResponse.json({ issues });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to create issues." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const steps_to_reproduce = String(body?.steps_to_reproduce ?? "").trim();
  const expected_result = String(body?.expected_result ?? "").trim();
  const actual_result = String(body?.actual_result ?? "").trim();
  const severity = String(body?.severity ?? "MEDIUM");
  const status = String(body?.status ?? "OPEN");
  const assigned_to = body?.assigned_to ? Number(body.assigned_to) : null;

  if (!title || !description || !steps_to_reproduce || !expected_result || !actual_result) {
    return NextResponse.json({ error: "All issue detail fields are required." }, { status: 400 });
  }

  if (!isIssueSeverity(severity) || !isIssueStatus(status)) {
    return NextResponse.json({ error: "Invalid severity or status value." }, { status: 400 });
  }

  if (assigned_to) {
    const assignee = await prisma.user.findUnique({ where: { id: assigned_to } });

    if (!assignee) {
      return NextResponse.json({ error: "Assigned user was not found." }, { status: 400 });
    }
  }

  const issue = await prisma.issue.create({
    data: {
      title,
      description,
      steps_to_reproduce,
      expected_result,
      actual_result,
      severity,
      status,
      created_by: user.id,
      assigned_to
    },
    select: issueSelect()
  });

  return NextResponse.json({ issue }, { status: 201 });
}
