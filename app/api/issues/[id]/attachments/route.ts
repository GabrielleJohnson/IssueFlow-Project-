import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  createEvidenceObjectKey,
  createStoredFilename,
  hasValidAttachmentSignature,
  validateAttachmentMetadata,
  type AttachmentMetadata,
} from "@/lib/attachments";
import { getCurrentUser } from "@/lib/auth";
import {
  createEvidenceUploadUrl,
  deleteEvidenceObject,
  EvidenceStorageError,
  inspectEvidenceObject,
} from "@/lib/evidenceStorage";
import { createEvidenceUploadIntent, verifyEvidenceUploadIntent, type EvidenceUploadIntent } from "@/lib/evidenceUploadIntent";
import { canUploadEvidence, canViewEvidence } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const attachmentSelect = {
  id: true,
  filename: true,
  original_name: true,
  mimetype: true,
  filesize: true,
  uploaded_by: true,
  issue_id: true,
  created_at: true,
  uploader: { select: { id: true, username: true, email: true, role: true } },
};

async function issueIdFrom(params: Params["params"]) {
  const issueId = Number((await params).id);
  return Number.isInteger(issueId) && issueId > 0 ? issueId : null;
}

async function issueForUpload(issueId: number) {
  return prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, created_by: true, assigned_to: true } });
}

function storageError(error: unknown) {
  if (error instanceof EvidenceStorageError && error.code === "CONFIGURATION") {
    return NextResponse.json({ error: "Evidence storage is not configured. Check the required storage environment variables." }, { status: 503 });
  }
  return NextResponse.json({ error: "Evidence storage is temporarily unavailable." }, { status: 503 });
}

async function authorizedUploadContext(params: Params["params"]) {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "You must be logged in to upload evidence." }, { status: 401 }) };
  const issueId = await issueIdFrom(params);
  if (!issueId) return { response: NextResponse.json({ error: "Invalid bug report id." }, { status: 400 }) };
  const issue = await issueForUpload(issueId);
  if (!issue) return { response: NextResponse.json({ error: "Bug report not found." }, { status: 404 }) };
  if (!canUploadEvidence(user, issue)) {
    return { response: NextResponse.json({ error: "You do not have permission to upload evidence for this bug report." }, { status: 403 }) };
  }
  return { user, issueId, issue };
}

async function parsedIntents(request: NextRequest, issueId: number, uploaderId: number) {
  const body = await request.json().catch(() => null) as { tokens?: unknown } | null;
  if (!Array.isArray(body?.tokens) || body.tokens.length === 0 || body.tokens.some((token) => typeof token !== "string")) return null;
  const intents = await Promise.all((body.tokens as string[]).map(verifyEvidenceUploadIntent));
  if (intents.some((intent) => !intent || intent.issueId !== issueId || intent.uploaderId !== uploaderId)) return null;
  return intents as EvidenceUploadIntent[];
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view evidence." }, { status: 401 });
  const issueId = await issueIdFrom(params);
  if (!issueId) return NextResponse.json({ error: "Invalid bug report id." }, { status: 400 });
  const issue = await issueForUpload(issueId);
  if (!issue) return NextResponse.json({ error: "Bug report not found." }, { status: 404 });
  if (!canViewEvidence(user, issue)) {
    return NextResponse.json({ error: "You do not have permission to view evidence for this bug report." }, { status: 403 });
  }
  const attachments = await prisma.attachment.findMany({ where: { issue_id: issueId }, orderBy: { created_at: "desc" }, select: attachmentSelect });
  return NextResponse.json({ attachments });
}

export async function POST(request: NextRequest, { params }: Params) {
  const context = await authorizedUploadContext(params);
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => null) as { files?: unknown } | null;
  if (!Array.isArray(body?.files) || body.files.length === 0) {
    return NextResponse.json({ error: "Choose at least one evidence file to upload." }, { status: 400 });
  }

  const prepared: Array<{ uploadUrl: string; token: string }> = [];
  try {
    for (const value of body.files) {
      if (!value || typeof value !== "object") return NextResponse.json({ error: "Invalid evidence metadata." }, { status: 400 });
      const file = value as Partial<AttachmentMetadata>;
      if (typeof file.name !== "string" || typeof file.type !== "string" || typeof file.size !== "number") {
        return NextResponse.json({ error: "Invalid evidence metadata." }, { status: 400 });
      }
      const validation = validateAttachmentMetadata({ name: file.name, type: file.type, size: file.size });
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
      const filename = createStoredFilename(validation.sanitizedName, validation.extension);
      const objectKey = createEvidenceObjectKey(context.issueId, filename);
      const intent: EvidenceUploadIntent = {
        issueId: context.issueId,
        uploaderId: context.user.id,
        objectKey,
        filename,
        originalName: validation.sanitizedName,
        mimetype: file.type,
        filesize: file.size,
      };
      const [uploadUrl, token] = await Promise.all([
        createEvidenceUploadUrl({
          objectKey,
          contentType: file.type,
          contentLength: file.size,
          origin: request.headers.get("origin") ?? request.nextUrl.origin,
        }),
        createEvidenceUploadIntent(intent),
      ]);
      prepared.push({ uploadUrl, token });
    }
    return NextResponse.json({ uploads: prepared });
  } catch (error) {
    return storageError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await authorizedUploadContext(params);
  if ("response" in context) return context.response;
  const intents = await parsedIntents(request, context.issueId, context.user.id);
  if (!intents) return NextResponse.json({ error: "Upload confirmation is invalid or expired." }, { status: 400 });

  try {
    const existing = await prisma.attachment.findFirst({ where: { object_key: { in: intents.map((intent) => intent.objectKey) } } });
    if (existing) return NextResponse.json({ error: "This evidence upload has already been finalized." }, { status: 409 });

    for (const intent of intents) {
      const stored = await inspectEvidenceObject(intent.objectKey);
      if (
        stored.contentLength !== intent.filesize || stored.contentType !== intent.mimetype ||
        !hasValidAttachmentSignature(intent.mimetype, stored.firstBytes)
      ) {
        await deleteEvidenceObject(intent.objectKey).catch(() => undefined);
        return NextResponse.json({ error: `Evidence "${intent.originalName}" did not pass server validation.` }, { status: 400 });
      }
    }

    const attachments = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const intent of intents) {
        const attachment = await tx.attachment.create({
          data: {
            filename: intent.filename,
            original_name: intent.originalName,
            object_key: intent.objectKey,
            mimetype: intent.mimetype,
            filesize: intent.filesize,
            uploaded_by: context.user.id,
            issue_id: context.issueId,
          },
          select: attachmentSelect,
        });
        await tx.issueActivity.create({
          data: {
            issue_id: context.issueId,
            actor_id: context.user.id,
            action_type: "EVIDENCE_UPLOADED",
            message: `Evidence "${intent.originalName}" was uploaded.`,
          },
        });
        created.push(attachment);
      }
      return created;
    });
    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      await Promise.all(intents.map((intent) => deleteEvidenceObject(intent.objectKey).catch(() => undefined)));
    }
    if (error instanceof EvidenceStorageError) return storageError(error);
    return NextResponse.json({ error: "Evidence could not be finalized." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const context = await authorizedUploadContext(params);
  if ("response" in context) return context.response;
  const intents = await parsedIntents(request, context.issueId, context.user.id);
  if (!intents) return NextResponse.json({ error: "Upload cancellation is invalid or expired." }, { status: 400 });

  try {
    const linked = await prisma.attachment.findMany({
      where: { object_key: { in: intents.map((intent) => intent.objectKey) } },
      select: { object_key: true },
    });
    const linkedKeys = new Set(linked.map((attachment) => attachment.object_key));
    await Promise.all(intents.filter((intent) => !linkedKeys.has(intent.objectKey)).map((intent) => deleteEvidenceObject(intent.objectKey)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageError(error);
  }
}
