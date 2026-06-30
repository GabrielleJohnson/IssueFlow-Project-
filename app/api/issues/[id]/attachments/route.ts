import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createStoredFilename, ensureIssueUploadDir, issueAttachmentRelativePath, validateAttachment } from "@/lib/attachments";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

const attachmentSelect = {
  id: true,
  filename: true,
  original_name: true,
  filepath: true,
  mimetype: true,
  filesize: true,
  uploaded_by: true,
  issue_id: true,
  created_at: true,
  uploader: { select: { id: true, username: true, email: true, role: true } }
};

async function getIssueId(params: Params["params"]) {
  const { id } = await params;
  const issueId = Number(id);
  return Number.isInteger(issueId) ? issueId : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view evidence." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true } });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { issue_id: issueId },
    orderBy: { created_at: "desc" },
    select: attachmentSelect
  });

  return NextResponse.json({ attachments });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to upload evidence." }, { status: 401 });
  }

  const issueId = await getIssueId(params);

  if (!issueId) {
    return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true } });

  if (!issue) {
    return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((value): value is File => value instanceof File) ?? [];

  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one evidence file to upload." }, { status: 400 });
  }

  const issueUploadDir = await ensureIssueUploadDir(issueId);
  const uploadedAttachments = [];

  for (const file of files) {
    const validation = validateAttachment(file);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const filename = createStoredFilename(validation.sanitizedName, validation.extension);
    const filepath = issueAttachmentRelativePath(issueId, filename);
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(join(issueUploadDir, filename), bytes, { flag: "wx" });

    const attachment = await prisma.attachment.create({
      data: {
        filename,
        original_name: validation.sanitizedName,
        filepath,
        mimetype: file.type,
        filesize: file.size,
        uploaded_by: user.id,
        issue_id: issueId
      },
      select: attachmentSelect
    });

    uploadedAttachments.push(attachment);
  }

  return NextResponse.json({ attachments: uploadedAttachments }, { status: 201 });
}

