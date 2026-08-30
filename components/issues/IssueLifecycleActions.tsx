"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IssueLifecycleActionsProps = {
  issueId: number;
  status: string;
  canClose: boolean;
  canReopen: boolean;
};

export function IssueLifecycleActions({ issueId, status, canClose, canReopen }: IssueLifecycleActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateStatus(nextStatus: string) {
    setError("");
    setIsUpdating(true);

    const response = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reopen_reason: nextStatus === "REOPENED" ? reason : undefined })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to update bug lifecycle.");
      setIsUpdating(false);
      return;
    }

    setReason("");
    setIsUpdating(false);
    window.dispatchEvent(new CustomEvent("issueflow:activity-updated", { detail: { issueId } }));
    router.refresh();
  }

  if (status !== "RESOLVED" || (!canClose && !canReopen)) {
    return null;
  }

  return (
    <section className="mt-8 rounded-lg border border-sage/40 bg-sage/10 p-5 shadow-card">
      <h2 className="font-display text-xl font-semibold text-ivory">Retest Resolution</h2>
      <p className="mt-2 text-sm leading-6 text-beige">This bug is marked resolved. QA should retest the linked behavior before closing it.</p>
      {canReopen && (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-beige">Reopen reason</span>
          <textarea className="field min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What still failed during verification?" />
        </label>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {canClose && (
          <button type="button" disabled={isUpdating} onClick={() => updateStatus("CLOSED")} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber disabled:cursor-not-allowed disabled:opacity-65">
            {isUpdating ? "Updating..." : "Verify & Close"}
          </button>
        )}
        {canReopen && (
          <button type="button" disabled={isUpdating} onClick={() => updateStatus("REOPENED")} className="rounded-full border border-ember/60 px-5 py-3 text-sm font-bold text-[#ff9aa2] transition hover:bg-ember/15 disabled:cursor-not-allowed disabled:opacity-65">
            {isUpdating ? "Updating..." : "Reopen Bug"}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-[#ff9aa2]">{error}</p>}
    </section>
  );
}
