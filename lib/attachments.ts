import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { extname, join } from "node:path";

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const UPLOAD_ROOT = "uploads";

const allowedAttachmentTypes = new Map([
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg", "image/jpg"])],
  [".jpeg", new Set(["image/jpeg", "image/jpg"])],
  [".gif", new Set(["image/gif"])],
  [".pdf", new Set(["application/pdf"])]
]);

export function sanitizeOriginalName(name: string) {
  const cleaned = name
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "evidence-file";
}

export function validateAttachment(file: File) {
  const sanitizedName = sanitizeOriginalName(file.name);
  const extension = extname(sanitizedName).toLowerCase();
  const allowedMimeTypes = allowedAttachmentTypes.get(extension);

  if (!allowedMimeTypes || !allowedMimeTypes.has(file.type)) {
    return { ok: false as const, error: "Evidence must be a PNG, JPG, JPEG, GIF, or PDF file." };
  }

  if (file.size <= 0) {
    return { ok: false as const, error: "Evidence file cannot be empty." };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { ok: false as const, error: "Evidence files must be 10MB or smaller." };
  }

  return { ok: true as const, sanitizedName, extension };
}

export async function ensureIssueUploadDir(issueId: number) {
  const absoluteDir = join(process.cwd(), UPLOAD_ROOT, "issues", String(issueId));
  await mkdir(absoluteDir, { recursive: true });
  return absoluteDir;
}

export function createStoredFilename(sanitizedName: string, extension: string) {
  const baseName = sanitizedName.slice(0, sanitizedName.length - extension.length) || "evidence";
  return `${baseName}-${randomUUID()}${extension}`;
}

export function issueAttachmentRelativePath(issueId: number, filename: string) {
  return join(UPLOAD_ROOT, "issues", String(issueId), filename).replace(/\\/g, "/");
}

export function attachmentAbsolutePath(relativePath: string) {
  const pathInsideUploads = relativePath.replace(/^uploads[\\/]/, "");
  return join(process.cwd(), UPLOAD_ROOT, pathInsideUploads);
}

export function isImageAttachment(mimetype: string) {
  return mimetype.startsWith("image/");
}



