import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createEvidenceDownloadUrl, deleteEvidenceObject, EvidenceStorageError } from "@/lib/evidenceStorage";
import { canDeleteEvidence, canViewEvidence } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function attachmentIdFrom(params: Params["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view evidence." }, { status: 401 });
  const attachmentId = await attachmentIdFrom(params);
  if (!attachmentId) return NextResponse.json({ error: "Invalid evidence id." }, { status: 400 });
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { issue: { select: { created_by: true, assigned_to: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "Evidence file not found." }, { status: 404 });
  if (!canViewEvidence(user, attachment.issue)) {
    return NextResponse.json({ error: "You do not have permission to view this evidence file." }, { status: 403 });
  }

  try {
    const url = await createEvidenceDownloadUrl(attachment.object_key, attachment.original_name, request.nextUrl.origin);
    return NextResponse.redirect(url, 307);
  } catch (error) {
    const unavailable = error instanceof EvidenceStorageError && error.code === "NOT_FOUND" ? 404 : 503;
    return NextResponse.json({ error: unavailable === 404 ? "Evidence file was not found in storage." : "Evidence storage is temporarily unavailable." }, { status: unavailable });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to delete evidence." }, { status: 401 });
  const attachmentId = await attachmentIdFrom(params);
  if (!attachmentId) return NextResponse.json({ error: "Invalid evidence id." }, { status: 400 });
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { issue: { select: { created_by: true, assigned_to: true } } },
  });
  if (!attachment) return NextResponse.json({ error: "Evidence file not found." }, { status: 404 });
  if (!canDeleteEvidence(user, attachment)) {
    return NextResponse.json({ error: "Only the uploader or an admin can delete this evidence." }, { status: 403 });
  }

  try {
    await deleteEvidenceObject(attachment.object_key);
  } catch {
    return NextResponse.json({ error: "Evidence could not be removed from storage. No database changes were made." }, { status: 503 });
  }

  try {
    await prisma.$transaction([
      prisma.attachment.delete({ where: { id: attachmentId } }),
      prisma.issueActivity.create({
        data: {
          issue_id: attachment.issue_id,
          actor_id: user.id,
          action_type: "EVIDENCE_DELETED",
          message: `Evidence "${attachment.original_name}" was deleted.`,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "The object was removed, but its database record could not be deleted. Retry the request to finish cleanup." }, { status: 500 });
  }
}
