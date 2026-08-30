import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewIssueActivity } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

async function getIssueId(params: Params["params"]) {
  const { id } = await params;
  const issueId = Number(id);
  return Number.isInteger(issueId) ? issueId : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view activity." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, created_by: true, assigned_to: true, status: true } });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  if (!canViewIssueActivity(user, issue)) {
    return NextResponse.json({ error: "You do not have permission to view activity for this bug report." }, { status: 403 });
  }

  const activity = await prisma.issueActivity.findMany({
    where: { issue_id: issueId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      action_type: true,
      field_name: true,
      old_value: true,
      new_value: true,
      message: true,
      created_at: true,
      actor: { select: { id: true, username: true, role: true } }
    }
  });

  return NextResponse.json({ activity });
}
