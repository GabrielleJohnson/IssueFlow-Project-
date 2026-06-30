"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { formatEnumLabel, issueSeverities, issueStatuses } from "@/lib/issueOptions";
import type { IssueRecord, IssueUser, TestCaseRecord } from "@/lib/issueTypes";

type IssuePrefill = Partial<Pick<IssueRecord, "title" | "description" | "environment" | "steps_to_reproduce" | "expected_result" | "actual_result" | "linked_test_case_id">>;

type IssueFormProps = {
  mode: "create" | "edit";
  issue?: IssueRecord;
  users: IssueUser[];
  testCases: Pick<TestCaseRecord, "id" | "title" | "status" | "priority">[];
  prefill?: IssuePrefill;
};

export function IssueForm({ mode, issue, users, testCases, prefill }: IssueFormProps) {
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
      environment: String(formData.get("environment") ?? ""),
      steps_to_reproduce: String(formData.get("steps_to_reproduce") ?? ""),
      expected_result: String(formData.get("expected_result") ?? ""),
      actual_result: String(formData.get("actual_result") ?? ""),
      severity: String(formData.get("severity") ?? "MEDIUM"),
      status: String(formData.get("status") ?? "OPEN"),
      assigned_to: String(formData.get("assigned_to") ?? "") || null,
      linked_test_case_id: String(formData.get("linked_test_case_id") ?? "") || null
    };

    const response = await fetch(isEdit ? `/api/issues/${issue?.id}` : "/api/issues", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to save this bug report.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/dashboard/issues/${data.issue.id}`);
    router.refresh();
  }

  const defaultLinkedTestCase = issue?.linked_test_case_id ?? prefill?.linked_test_case_id ?? "";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Bug title</span>
        <input className="field" name="title" defaultValue={issue?.title ?? prefill?.title} placeholder="Checkout total recalculates after loyalty credit" required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Bug summary</span>
        <textarea className="field min-h-24" name="description" defaultValue={issue?.description ?? prefill?.description} placeholder="Summarize the defect, user impact, and affected workflow." required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Environment / browser / device</span>
        <input className="field" name="environment" defaultValue={issue?.environment ?? prefill?.environment} placeholder="Chrome 126 on Windows 11, staging checkout" required />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-2 block text-sm font-semibold text-beige">Steps to reproduce</span>
        <textarea className="field min-h-28" name="steps_to_reproduce" defaultValue={issue?.steps_to_reproduce ?? prefill?.steps_to_reproduce} placeholder="1. Sign in as a returning customer&#10;2. Apply loyalty credit&#10;3. Refresh checkout" required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Expected result</span>
        <textarea className="field min-h-24" name="expected_result" defaultValue={issue?.expected_result ?? prefill?.expected_result} placeholder="The total remains accurate after refresh." required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Actual result</span>
        <textarea className="field min-h-24" name="actual_result" defaultValue={issue?.actual_result ?? prefill?.actual_result} placeholder="The total recalculates and removes the credit." required />
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Severity</span>
        <select className="field" name="severity" defaultValue={issue?.severity ?? "MEDIUM"}>
          {issueSeverities.map((severity) => (
            <option key={severity} value={severity}>{formatEnumLabel(severity)}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Status</span>
        <select className="field" name="status" defaultValue={issue?.status ?? "OPEN"}>
          {issueStatuses.map((status) => (
            <option key={status} value={status}>{formatEnumLabel(status)}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Assigned to</span>
        <select className="field" name="assigned_to" defaultValue={issue?.assigned_to ?? ""}>
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.username} - {formatEnumLabel(user.role)}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-2 block text-sm font-semibold text-beige">Linked failed test case</span>
        <select className="field" name="linked_test_case_id" defaultValue={defaultLinkedTestCase}>
          <option value="">No linked failed test</option>
          {testCases.map((testCase) => (
            <option key={testCase.id} value={testCase.id}>TC-{testCase.id.toString().padStart(4, "0")} - {testCase.title}</option>
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
          {isSubmitting ? "Saving..." : isEdit ? "Save Bug Report" : "Create Bug Report"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">
          Cancel
        </button>
      </div>
    </form>
  );
}
