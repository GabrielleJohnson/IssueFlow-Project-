"use client";

import type { AttachmentRecord } from "@/lib/attachmentTypes";

type PreparedUpload = { uploadUrl: string; token: string };

export class EvidenceUploadError extends Error {
  constructor(
    message: string,
    readonly stage: "prepare" | "upload" | "finalize",
    readonly status?: number,
  ) {
    super(message);
    this.name = "EvidenceUploadError";
  }
}

export async function uploadEvidenceFiles(
  issueId: number,
  files: File[],
  onProgress?: (completed: number, total: number) => void,
) {
  const prepareResponse = await fetch(`/api/issues/${issueId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
  });
  const prepared = await prepareResponse.json().catch(() => ({}));
  if (!prepareResponse.ok) {
    throw new EvidenceUploadError(
      prepared.error ?? "Unable to prepare evidence upload.",
      "prepare",
      prepareResponse.status,
    );
  }

  const uploads = prepared.uploads as PreparedUpload[];
  try {
    for (let index = 0; index < uploads.length; index += 1) {
      const response = await fetch(uploads[index].uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": files[index].type },
        body: files[index],
      });
      if (!response.ok) {
        throw new EvidenceUploadError(
          `Unable to upload ${files[index].name}. Storage returned HTTP ${response.status}.`,
          "upload",
          response.status,
        );
      }
      onProgress?.(index + 1, uploads.length);
    }

    const finalizeResponse = await fetch(`/api/issues/${issueId}/attachments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: uploads.map((upload) => upload.token) }),
    });
    const finalized = await finalizeResponse.json().catch(() => ({}));
    if (!finalizeResponse.ok) {
      throw new EvidenceUploadError(
        finalized.error ?? "Unable to finalize evidence upload.",
        "finalize",
        finalizeResponse.status,
      );
    }
    return finalized.attachments as AttachmentRecord[];
  } catch (error) {
    await fetch(`/api/issues/${issueId}/attachments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: uploads.map((upload) => upload.token) }),
    }).catch(() => undefined);
    throw error;
  }
}
