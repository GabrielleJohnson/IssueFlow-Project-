"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTestCaseButton({ testCaseId }: { testCaseId: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this test case? This can be admin-gated later.");

    if (!confirmed) {
      return;
    }

    setError("");
    setIsDeleting(true);

    const response = await fetch(`/api/test-cases/${testCaseId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Unable to delete this test case.");
      setIsDeleting(false);
      return;
    }

    router.push("/dashboard/test-cases");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        data-role-gate="admin-delete-test-case"
        className="rounded-full border border-ember/50 px-5 py-3 text-sm font-bold text-[#ff9aa2] transition hover:bg-ember hover:text-ivory disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isDeleting ? "Deleting..." : "Delete Test Case"}
      </button>
      {error && <p className="mt-3 text-sm font-semibold text-[#ff9aa2]">{error}</p>}
    </div>
  );
}
