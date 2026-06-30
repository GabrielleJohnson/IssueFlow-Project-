"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { formatEnumLabel, testCasePriorities, testCaseStatuses } from "@/lib/issueOptions";
import type { IssueRecord, TestCaseRecord } from "@/lib/issueTypes";

type TestCaseFormProps = {
  mode: "create" | "edit";
  testCase?: TestCaseRecord;
  issues: Pick<IssueRecord, "id" | "title" | "severity" | "status">[];
};

export function TestCaseForm({ mode, testCase, issues }: TestCaseFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === "edit";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      feature_module: String(formData.get("feature_module") ?? ""),
      preconditions: String(formData.get("preconditions") ?? ""),
      test_steps: String(formData.get("test_steps") ?? ""),
      expected_result: String(formData.get("expected_result") ?? ""),
      actual_result: String(formData.get("actual_result") ?? ""),
      status: String(formData.get("status") ?? "NOT_RUN"),
      priority: String(formData.get("priority") ?? "MEDIUM"),
      linked_issue_id: String(formData.get("linked_issue_id") ?? "") || null
    };

    const response = await fetch(isEdit ? `/api/test-cases/${testCase?.id}` : "/api/test-cases", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to save this test case.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/dashboard/test-cases/${data.testCase.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Test case title</span>
        <input className="field" name="title" defaultValue={testCase?.title} placeholder="Verify checkout total after loyalty credit" required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Feature / module</span>
        <input className="field" name="feature_module" defaultValue={testCase?.feature_module} placeholder="Checkout / Payments" required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Priority</span>
        <select className="field" name="priority" defaultValue={testCase?.priority ?? "MEDIUM"}>
          {testCasePriorities.map((priority) => (
            <option key={priority} value={priority}>{formatEnumLabel(priority)}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Scenario description</span>
        <textarea className="field min-h-24" name="description" defaultValue={testCase?.description} placeholder="Describe the behavior this scenario verifies, not the defect itself." required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Preconditions</span>
        <textarea className="field min-h-24" name="preconditions" defaultValue={testCase?.preconditions} placeholder="Customer account exists, loyalty balance is available, cart has eligible item." required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Test steps</span>
        <textarea className="field min-h-32" name="test_steps" defaultValue={testCase?.test_steps} placeholder="1. Sign in&#10;2. Add eligible item&#10;3. Apply loyalty credit&#10;4. Refresh checkout" required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Expected result</span>
        <textarea className="field min-h-24" name="expected_result" defaultValue={testCase?.expected_result} placeholder="The adjusted total remains correct." required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Actual result</span>
        <textarea className="field min-h-24" name="actual_result" defaultValue={testCase?.actual_result} placeholder="Record observed behavior after running the scenario." required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Status</span>
        <select className="field" name="status" defaultValue={testCase?.status ?? "NOT_RUN"}>
          {testCaseStatuses.map((status) => (
            <option key={status} value={status}>{formatEnumLabel(status)}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Linked bug report</span>
        <select className="field" name="linked_issue_id" defaultValue={testCase?.linked_issue_id ?? ""}>
          <option value="">No linked bug report</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>IF-{issue.id.toString().padStart(4, "0")} - {issue.title}</option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-lg border border-ember/40 bg-ember/15 px-4 py-3 text-sm font-semibold text-[#ff9aa2] sm:col-span-2">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <button type="submit" disabled={isSubmitting} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber disabled:cursor-not-allowed disabled:opacity-65">
          {isSubmitting ? "Saving..." : isEdit ? "Save Test Case" : "Create Test Case"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">
          Cancel
        </button>
      </div>
    </form>
  );
}
