import { randomUUID } from "node:crypto";
import { extname } from "node:path";

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const allowedAttachmentTypes = new Map([
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg", "image/jpg"])],
  [".jpeg", new Set(["image/jpeg", "image/jpg"])],
  [".gif", new Set(["image/gif"])],
  [".pdf", new Set(["application/pdf"])],
]);

export type AttachmentMetadata = {
  name: string;
  type: string;
  size: number;
};

export function sanitizeOriginalName(name: string) {
  const cleaned = name
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.{2,}/g, ".");

  return cleaned || "evidence-file";
}

export function validateAttachmentMetadata(file: AttachmentMetadata) {
  const sanitizedName = sanitizeOriginalName(file.name);
  const extension = extname(sanitizedName).toLowerCase();
  const allowedMimeTypes = allowedAttachmentTypes.get(extension);

  if (!allowedMimeTypes || !allowedMimeTypes.has(file.type)) {
    return { ok: false as const, error: "Evidence must be a PNG, JPG, JPEG, GIF, or PDF file." };
  }
  if (!Number.isInteger(file.size) || file.size <= 0) {
    return { ok: false as const, error: "Evidence file cannot be empty." };
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { ok: false as const, error: "Evidence files must be 10MB or smaller." };
  }

  return { ok: true as const, sanitizedName, extension };
}

export function createStoredFilename(sanitizedName: string, extension: string) {
  const baseName = sanitizedName.slice(0, sanitizedName.length - extension.length) || "evidence";
  return `${baseName}-${randomUUID()}${extension}`;
}

export function createEvidenceObjectKey(issueId: number, filename: string) {
  return `issues/${issueId}/${filename}`;
}

export function hasValidAttachmentSignature(mimetype: string, bytes: Uint8Array) {
  const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);

  if (mimetype === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mimetype === "image/jpeg" || mimetype === "image/jpg") return startsWith(0xff, 0xd8, 0xff);
  if (mimetype === "image/gif") {
    return startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  }
  if (mimetype === "application/pdf") return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);

  return false;
}

export function isImageAttachment(mimetype: string) {
  return mimetype.startsWith("image/");
}
