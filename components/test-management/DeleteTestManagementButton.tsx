"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTestManagementButton({
  endpoint,
  returnTo,
  label,
}: {
  endpoint: string;
  returnTo: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (
      !window.confirm(
        `Delete ${label}? Historical protections described on this page still apply.`,
      )
    )
      return;
    setBusy(true);
    const response = await fetch(endpoint, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? `Unable to delete ${label}.`);
      setBusy(false);
      return;
    }
    router.push(returnTo);
    router.refresh();
  }
  return (
    <div>
      {error && <p className="mb-3 text-sm text-[#ff9aa2]">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded-full border border-ember/60 px-5 py-3 text-sm font-bold text-[#ff9aa2] disabled:opacity-60"
      >
        {busy ? "Deleting..." : `Delete ${label}`}
      </button>
    </div>
  );
}
