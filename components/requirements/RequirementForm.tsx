"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { requirementStatuses, testCasePriorities } from "@/lib/issueOptions";
import { formatEnumLabel } from "@/lib/issueOptions";

type Choice = { id: number; title: string; feature_module: string };
type Initial = { id: number; title: string; description: string; feature_module: string; priority: string; status: string; testCaseIds: number[] };
type Props = { testCases: Choice[]; initial?: Initial };

export function RequirementForm({ testCases, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { title: form.get("title"), description: form.get("description"), feature_module: form.get("feature_module"), priority: form.get("priority"), status: form.get("status"), test_case_ids: form.getAll("test_case_ids").map(Number) };
    const response = await fetch(initial ? `/api/requirements/${initial.id}` : "/api/requirements", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? "Unable to save this requirement."); setSaving(false); return; }
    router.push(`/dashboard/requirements/${data.requirement.id}`); router.refresh();
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2 sm:p-6">
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Requirement title</span><input className="field" name="title" defaultValue={initial?.title} placeholder="Customers can recover access with a verified email" required /></label>
    <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-beige">Description</span><textarea className="field min-h-28" name="description" defaultValue={initial?.description} placeholder="Describe the behavior QA must verify." /></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Feature / module</span><input className="field" name="feature_module" defaultValue={initial?.feature_module ?? "General"} required /></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Priority</span><select className="field" name="priority" defaultValue={initial?.priority ?? "MEDIUM"}>{testCasePriorities.map((item) => <option key={item} value={item}>{formatEnumLabel(item)}</option>)}</select></label>
    <label><span className="mb-2 block text-sm font-semibold text-beige">Status</span><select className="field" name="status" defaultValue={initial?.status ?? "DRAFT"}>{requirementStatuses.map((item) => <option key={item} value={item}>{formatEnumLabel(item)}</option>)}</select></label>
    <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold text-beige">Linked Test Cases</legend><p className="mt-1 text-xs text-beige">Select the QA scenarios that verify this requirement.</p><div className="mt-3 grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-bronze bg-espresso/45 p-3 sm:grid-cols-2">{testCases.length === 0 ? <p className="text-sm text-beige">No Test Cases are available yet.</p> : testCases.map((testCase) => <label key={testCase.id} className="flex min-w-0 items-start gap-3 rounded-md border border-bronze/70 p-3 text-sm"><input className="mt-1 accent-coral" type="checkbox" name="test_case_ids" value={testCase.id} defaultChecked={initial?.testCaseIds.includes(testCase.id)} /><span className="min-w-0 [overflow-wrap:anywhere]"><strong className="text-ivory">TC-{String(testCase.id).padStart(4, "0")} · {testCase.title}</strong><span className="mt-1 block text-xs text-beige">{testCase.feature_module}</span></span></label>)}</div></fieldset>
    {error && <p className="sm:col-span-2 rounded-lg border border-ember/40 bg-ember/15 p-3 text-sm text-[#ff9aa2]">{error}</p>}
    <div className="sm:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso disabled:opacity-60">{saving ? "Saving..." : initial ? "Save Requirement" : "Create Requirement"}</button><button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold">Cancel</button></div>
  </form>;
}
