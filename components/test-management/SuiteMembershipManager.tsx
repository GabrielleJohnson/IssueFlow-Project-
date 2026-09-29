"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TestCase = { id: number; title: string; feature_module: string; status: string; priority: string };
type Props = { suiteId: number; available: TestCase[]; members: TestCase[]; canManage: boolean };

export function SuiteMembershipManager({ suiteId, available, members, canManage }: Props) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function request(method: "POST" | "DELETE", testCaseId: number) {
    setBusy(true); setError("");
    const response = await fetch(`/api/test-suites/${suiteId}/cases`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test_case_id: testCaseId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Unable to update suite membership."); else router.refresh();
    setBusy(false);
  }
  function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const id = Number(new FormData(event.currentTarget).get("test_case_id")); if (id) request("POST", id); }
  const memberIds = new Set(members.map((item) => item.id));
  const choices = available.filter((item) => !memberIds.has(item.id));
  return <div className="rounded-lg border border-bronze bg-clay shadow-card">
    <div className="border-b border-bronze p-5"><h2 className="font-display text-xl font-semibold">Suite Test Cases</h2><p className="mt-1 text-sm text-beige">Changes affect future runs only. Existing run snapshots stay unchanged.</p></div>
    {canManage && <form onSubmit={add} className="flex flex-col gap-3 border-b border-bronze p-5 sm:flex-row"><select name="test_case_id" className="field" defaultValue=""><option value="">Choose an existing test case</option>{choices.map((item) => <option key={item.id} value={item.id}>TC-{String(item.id).padStart(4, "0")} · {item.title}</option>)}</select><button disabled={busy || choices.length === 0} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso disabled:opacity-60">Add Test Case</button></form>}
    {error && <p className="m-5 rounded-lg border border-ember/40 bg-ember/15 p-3 text-sm text-[#ff9aa2]">{error}</p>}
    <div className="divide-y divide-bronze/70">{members.length === 0 ? <p className="p-5 text-sm text-beige">No test cases have been added. Add coverage before starting a run.</p> : members.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><a href={`/dashboard/test-cases/${item.id}`} className="font-semibold text-ivory transition hover:text-coral">TC-{String(item.id).padStart(4, "0")} · {item.title}</a><p className="mt-1 text-sm text-beige">{item.feature_module} · {item.priority} · latest {item.status}</p></div>{canManage && <button type="button" disabled={busy} onClick={() => request("DELETE", item.id)} className="text-sm font-semibold text-[#ff9aa2]">Remove</button>}</div>)}</div>
  </div>;
}
