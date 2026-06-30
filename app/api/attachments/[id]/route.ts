import { readFile, unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { attachmentAbsolutePath } from "@/lib/attachments";
import { getCurrentUser } from "@/lib/auth";
import { canDeleteAttachment } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

async function getAttachmentId(params: Params["params"]) {
  const { id } = await params;
  const attachmentId = Number(id);
  return Number.isInteger(attachmentId) ? attachmentId : null;
}

function contentDispositionName(name: string) {
  return name.replace(/["\\]/g, "");
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view evidence." }, { status: 401 });
  }

  const attachmentId = await getAttachmentId(params);

  if (!attachmentId) {
    return NextResponse.json({ error: "Invalid evidence id." }, { status: 400 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });

  if (!attachment) {
    return NextResponse.json({ error: "Evidence file not found." }, { status: 404 });
  }

  try {
    const file = await readFile(attachmentAbsolutePath(attachment.filepath));

    return new NextResponse(file, {
      headers: {
        "Content-Type": attachment.mimetype,
        "Content-Disposition": `inline; filename="${contentDispositionName(attachment.original_name)}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Evidence file is missing from local storage." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to delete evidence." }, { status: 401 });
  }

  const attachmentId = await getAttachmentId(params);

  if (!attachmentId) {
    return NextResponse.json({ error: "Invalid evidence id." }, { status: 400 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });

  if (!attachment) {
    return NextResponse.json({ error: "Evidence file not found." }, { status: 404 });
  }

  if (!canDeleteAttachment(attachment.uploaded_by, user.id, user.role)) {
    return NextResponse.json({ error: "Only the uploader can delete this evidence." }, { status: 403 });
  }

  await unlink(attachmentAbsolutePath(attachment.filepath)).catch(() => undefined);
  await prisma.attachment.delete({ where: { id: attachmentId } });

  return NextResponse.json({ ok: true });
}



