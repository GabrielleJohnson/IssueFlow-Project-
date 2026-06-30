"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { AttachmentRecord } from "@/lib/attachmentTypes";
import { canDeleteAttachment } from "@/lib/issueOptions";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EVIDENCE = ".png,.jpg,.jpeg,.gif,.pdf,image/png,image/jpeg,image/gif,application/pdf";

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function isImage(mimetype: string) {
  return mimetype.startsWith("image/");
}

type EvidenceSectionProps = {
  issueId: number;
  currentUserId: number;
  currentUserRole: string;
};

export function EvidenceSection({ issueId, currentUserId, currentUserRole }: EvidenceSectionProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedFileSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return "PNG, JPG, GIF, or PDF up to 10MB each.";
    }

    return selectedFiles.map((file) => `${file.name} (${formatBytes(file.size)})`).join(", ");
  }, [selectedFiles]);

  useEffect(() => {
    let isActive = true;

    async function fetchAttachments() {
      const response = await fetch(`/api/issues/${issueId}/attachments`);
      const data = await response.json().catch(() => ({}));

      if (!isActive) {
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to load evidence files.");
        setIsLoading(false);
        return;
      }

      setAttachments(data.attachments ?? []);
      setIsLoading(false);
    }

    void fetchAttachments();

    return () => {
      isActive = false;
    };
  }, [issueId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setMessage("");
    setError("");

    const oversizedFile = files.find((file) => file.size > MAX_ATTACHMENT_SIZE);

    if (oversizedFile) {
      setSelectedFiles([]);
      setError(`${oversizedFile.name} is larger than 10MB.`);
      return;
    }

    setSelectedFiles(files);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Choose at least one evidence file to upload.");
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    const response = await fetch(`/api/issues/${issueId}/attachments`, {
      method: "POST",
      body: formData
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to upload evidence files.");
      setIsUploading(false);
      return;
    }

    setAttachments((current) => [...(data.attachments ?? []), ...current]);
    setSelectedFiles([]);
    setMessage("Evidence uploaded successfully.");
    setIsUploading(false);
  }

  async function handleDelete(attachmentId: number) {
    setDeletingId(attachmentId);
    setError("");
    setMessage("");

    const response = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to delete this evidence file.");
      setDeletingId(null);
      return;
    }

    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
    setMessage("Evidence removed.");
    setDeletingId(null);
  }

  return (
    <section className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ivory">Evidence</h2>
          <p className="mt-1 text-sm text-beige">Attach screenshots, GIFs, PDFs, or supporting notes that help developers reproduce the defect.</p>
        </div>
        <span className="rounded-full border border-bronze px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber">
          {attachments.length} file{attachments.length === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={handleUpload} className="mt-5 rounded-lg border border-dashed border-bronze bg-espresso/55 p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-bronze/70 bg-clay/50 px-4 py-6 text-center transition hover:border-coral">
          <span className="text-sm font-bold text-ivory">Drop evidence here or choose files</span>
          <span className="max-w-2xl text-xs leading-5 text-beige">{selectedFileSummary}</span>
          <input type="file" multiple accept={ACCEPTED_EVIDENCE} onChange={handleFileChange} className="sr-only" />
        </label>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={isUploading || selectedFiles.length === 0} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber disabled:cursor-not-allowed disabled:opacity-65">
            {isUploading ? "Uploading evidence..." : "Upload Evidence"}
          </button>
          <p className="text-xs text-beige">Supported: PNG, JPG, JPEG, GIF, PDF. Max 10MB each.</p>
        </div>
      </form>

      {message && <p className="mt-4 rounded-lg border border-sage/40 bg-sage/15 px-4 py-3 text-sm font-semibold text-sage">{message}</p>}
      {error && <p className="mt-4 rounded-lg border border-ember/40 bg-ember/15 px-4 py-3 text-sm font-semibold text-[#ff9aa2]">{error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <p className="text-sm text-beige">Loading evidence...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-beige">No evidence files have been attached yet.</p>
        ) : (
          attachments.map((attachment) => {
            const canDelete = canDeleteAttachment(attachment.uploaded_by, currentUserId, currentUserRole);

            return (
              <article key={attachment.id} className="overflow-hidden rounded-lg border border-bronze bg-espresso/60 shadow-card">
                <div className="relative flex h-40 items-center justify-center bg-[#120d0a]">
                  {isImage(attachment.mimetype) ? (
                    <Image src={`/api/attachments/${attachment.id}`} alt={attachment.original_name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                      <span className="rounded-lg border border-amber/50 bg-amber/10 px-4 py-3 font-display text-2xl font-bold text-amber">PDF</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-beige">Document evidence</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="break-words font-semibold text-ivory">{attachment.original_name}</p>
                  <p className="mt-2 text-xs text-beige">{formatBytes(attachment.filesize)} - Uploaded by {attachment.uploader.username}</p>
                  <p className="mt-1 text-xs text-beige">{new Date(attachment.created_at).toLocaleString()}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href={`/api/attachments/${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-full border border-bronze px-4 py-2 text-xs font-bold text-ivory transition hover:border-amber hover:text-amber">
                      View / Download
                    </a>
                    {canDelete && (
                      <button type="button" onClick={() => handleDelete(attachment.id)} disabled={deletingId === attachment.id} className="rounded-full border border-ember/60 px-4 py-2 text-xs font-bold text-[#ff9aa2] transition hover:bg-ember/15 disabled:cursor-not-allowed disabled:opacity-65">
                        {deletingId === attachment.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}



