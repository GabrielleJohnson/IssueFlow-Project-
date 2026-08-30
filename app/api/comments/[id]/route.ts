import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canDeleteComment, canEditComment, canViewIssue } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

async function getCommentId(params: Params["params"]) {
  const { id } = await params;
  const commentId = Number(id);
  return Number.isInteger(commentId) ? commentId : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to edit comments." }, { status: 401 });
  }

  const commentId = await getCommentId(params);

  if (!commentId) {
    return NextResponse.json({ error: "Invalid comment id." }, { status: 400 });
  }

  const existingComment = await prisma.issueComment.findUnique({
    where: { id: commentId },
    include: { issue: { select: { created_by: true, assigned_to: true, status: true } } }
  });

  if (!existingComment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (!canViewIssue(user, existingComment.issue) || !canEditComment(user, existingComment)) {
    return NextResponse.json({ error: "You do not have permission to edit this comment." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ error: "Comment content is required." }, { status: 400 });
  }

  const comment = await prisma.issueComment.update({
    where: { id: commentId },
    data: { content },
    select: {
      id: true,
      content: true,
      issue_id: true,
      author_id: true,
      created_at: true,
      updated_at: true,
      author: { select: { id: true, username: true, email: true, role: true } }
    }
  });

  return NextResponse.json({ comment });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete comments." }, { status: 401 });
  }

  const commentId = await getCommentId(params);

  if (!commentId) {
    return NextResponse.json({ error: "Invalid comment id." }, { status: 400 });
  }

  const existingComment = await prisma.issueComment.findUnique({
    where: { id: commentId },
    include: { issue: { select: { created_by: true, assigned_to: true, status: true } } }
  });

  if (!existingComment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  if (!canViewIssue(user, existingComment.issue) || !canDeleteComment(user, existingComment)) {
    return NextResponse.json({ error: "You do not have permission to delete this comment." }, { status: 403 });
  }

  await prisma.issueComment.delete({ where: { id: commentId } });

  return NextResponse.json({ ok: true });
}
