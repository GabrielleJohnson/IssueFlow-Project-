"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { suites: { id: number; name: string; count: number }[]; initialSuiteId?: number };
export function TestRunForm({ suites, initialSuiteId }: Props) {
  const router = useRouter(); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/test-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suite_id: form.get("suite_id"), release_label: form.get("release_label"), environment: form.get("environment"), notes: form.get("notes") }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.error ?? "Unable to start this run."); setSaving(false); return; }
    router.push(`/dashboard/test-runs/${data.run.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Test suite</span><select className="field" name="suite_id" defaultValue={initialSuiteId ?? ""} required><option value="">Choose a suite</option>{suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name} · {suite.count} test cases</option>)}</select></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Release / build</span><input className="field" name="release_label" placeholder="v1.0.0 or Build 2026.09.28" required /></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Environment</span><input className="field" name="environment" placeholder="Chrome 126 / Windows 11 / staging" required /></label>
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Run notes</span><textarea className="field min-h-24" name="notes" placeholder="Optional focus areas or setup notes." /></label>
    {error && <p className="sm:col-span-2 rounded-lg border border-ember/40 bg-ember/15 p-3 text-sm text-[#ff9aa2]">{error}</p>}
    <div className="sm:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso disabled:opacity-60">{saving ? "Starting..." : "Start Test Run"}</button><button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold">Cancel</button></div>
  </form>;
}
