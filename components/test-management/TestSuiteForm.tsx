"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { mode: "create" | "edit"; suite?: { id: number; name: string; description: string } };

export function TestSuiteForm({ mode, suite }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(mode === "edit" ? `/api/test-suites/${suite?.id}` : "/api/test-suites", { method: mode === "edit" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description") }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "Unable to save this suite."); setSaving(false); return; }
    router.push(`/dashboard/test-suites/${data.suite.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-bronze bg-clay p-5 shadow-card">
    <label><span className="mb-2 block text-sm font-semibold text-beige">Suite name</span><input className="field" name="name" defaultValue={suite?.name} placeholder="Checkout Regression" required /></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Description</span><textarea className="field min-h-32" name="description" defaultValue={suite?.description} placeholder="Reusable coverage for checkout, payment, and loyalty behavior." /></label>
    {error && <p className="rounded-lg border border-ember/40 bg-ember/15 px-4 py-3 text-sm font-semibold text-[#ff9aa2]">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber disabled:opacity-60">{saving ? "Saving..." : mode === "edit" ? "Save Suite" : "Create Suite"}</button><button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber">Cancel</button></div>
  </form>;
}
