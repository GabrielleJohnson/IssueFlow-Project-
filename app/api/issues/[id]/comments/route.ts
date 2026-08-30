import { NextRequest, NextResponse } from "next/server";
import { logIssueActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { canCommentOnIssue, canViewIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

const commentSelect = {
  id: true,
  content: true,
  issue_id: true,
  author_id: true,
  created_at: true,
  updated_at: true,
  author: { select: { id: true, username: true, email: true, role: true } }
};

async function getIssueId(params: Params["params"]) {
  const { id } = await params;
  const issueId = Number(id);
  return Number.isInteger(issueId) ? issueId : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view comments." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, created_by: true, assigned_to: true, status: true } });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  if (!canViewIssue(user, issue)) {
    return NextResponse.json({ error: "You do not have permission to view comments on this bug report." }, { status: 403 });
  }

  const comments = await prisma.issueComment.findMany({
    where: { issue_id: issueId },
    orderBy: { created_at: "asc" },
    select: commentSelect
  });

  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to comment." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, created_by: true, assigned_to: true, status: true } });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  if (!canCommentOnIssue(user, issue)) {
    return NextResponse.json({ error: "You do not have permission to comment on this bug report." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Comment content is required." }, { status: 400 });
  }

  const comment = await prisma.issueComment.create({
    data: { content, issue_id: issueId, author_id: user.id },
    select: commentSelect
  });

  await logIssueActivity({ issueId, actorId: user.id, actionType: "COMMENT_ADDED", message: `${user.username} added a comment.` });

  return NextResponse.json({ comment }, { status: 201 });
}
