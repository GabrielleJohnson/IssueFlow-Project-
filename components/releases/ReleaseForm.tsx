"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEnumLabel, releaseStatuses } from "@/lib/issueOptions";

type RequirementChoice = { id: number; title: string; feature_module: string };
type RunChoice = { id: number; suite_name: string; release_label: string; environment: string; release_id: number | null };
type Initial = { id: number; name: string; description: string; status: string; targetDate: string; requirementIds: number[]; runIds: number[] };
type Props = { requirements: RequirementChoice[]; runs: RunChoice[]; initial?: Initial };

export function ReleaseForm({ requirements, runs, initial }: Props) {
  const router = useRouter(); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), description: form.get("description"), status: form.get("status"), target_date: form.get("target_date"), requirement_ids: form.getAll("requirement_ids").map(Number), run_ids: form.getAll("run_ids").map(Number) };
    const response = await fetch(initial ? `/api/releases/${initial.id}` : "/api/releases", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})); if (!response.ok) { setError(data.error ?? "Unable to save this release."); setSaving(false); return; }
    router.push(`/dashboard/releases/${data.release.id}`); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2 sm:p-6">
    <label><span className="mb-2 block text-sm font-semibold text-beige">Release name / version</span><input className="field" name="name" defaultValue={initial?.name} placeholder="v1.0.0" required /></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Lifecycle status</span><select className="field" name="status" defaultValue={initial?.status ?? "PLANNING"}>{releaseStatuses.map((item) => <option key={item} value={item}>{formatEnumLabel(item)}</option>)}</select></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Target date</span><input className="field" type="date" name="target_date" defaultValue={initial?.targetDate} /></label>
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Description</span><textarea className="field min-h-24" name="description" defaultValue={initial?.description} placeholder="QA scope, focus areas, and release intent." /></label>
    <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold text-beige">Requirement scope</legend><div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-bronze bg-espresso/45 p-3 sm:grid-cols-2">{requirements.length === 0 ? <p className="text-sm text-beige">Create Requirements before defining release coverage.</p> : requirements.map((item) => <label key={item.id} className="flex min-w-0 items-start gap-3 rounded-md border border-bronze/70 p-3 text-sm"><input className="mt-1 accent-coral" type="checkbox" name="requirement_ids" value={item.id} defaultChecked={initial?.requirementIds.includes(item.id)} /><span className="min-w-0 [overflow-wrap:anywhere]"><strong>REQ-{String(item.id).padStart(4, "0")} · {item.title}</strong><span className="mt-1 block text-xs text-beige">{item.feature_module}</span></span></label>)}</div></fieldset>
    <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold text-beige">Associated Test Runs</legend><p className="mt-1 text-xs text-beige">A run can belong to one QA release record. Selecting it here moves it from any previous release.</p><div className="mt-3 grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-bronze bg-espresso/45 p-3 sm:grid-cols-2">{runs.length === 0 ? <p className="text-sm text-beige">No Test Runs are available yet.</p> : runs.map((run) => <label key={run.id} className="flex min-w-0 items-start gap-3 rounded-md border border-bronze/70 p-3 text-sm"><input className="mt-1 accent-coral" type="checkbox" name="run_ids" value={run.id} defaultChecked={initial?.runIds.includes(run.id)} /><span className="min-w-0 [overflow-wrap:anywhere]"><strong>TR-{String(run.id).padStart(4, "0")} · {run.suite_name}</strong><span className="mt-1 block text-xs text-beige">{run.release_label} · {run.environment}{run.release_id && run.release_id !== initial?.id ? " · currently assigned" : ""}</span></span></label>)}</div></fieldset>
    {error && <p className="sm:col-span-2 rounded-lg border border-ember/40 bg-ember/15 p-3 text-sm text-[#ff9aa2]">{error}</p>}
    <div className="sm:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso disabled:opacity-60">{saving ? "Saving..." : initial ? "Save Release" : "Create Release"}</button><button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold">Cancel</button></div>
  </form>;
}
