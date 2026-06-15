"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteIssueButton({ issueId }: { issueId: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this issue? This action can be restricted to admins later.");

    if (!confirmed) {
      return;
    }

    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/issues/${issueId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Unable to delete this issue.");
      setIsDeleting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        data-role-gate="admin-delete-issue"
        className="rounded-full border border-ember/50 px-5 py-3 text-sm font-bold text-[#ff9aa2] transition hover:bg-ember hover:text-ivory disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isDeleting ? "Deleting..." : "Delete Issue"}
      </button>
      {error && <p className="mt-3 text-sm font-semibold text-[#ff9aa2]">{error}</p>}
    </div>
  );
}
