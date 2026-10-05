"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";

type Execution = {
  id: number;
  test_case_id: number | null;
  test_case_reference: string;
  title_snapshot: string;
  description_snapshot: string;
  feature_module_snapshot: string;
  preconditions_snapshot: string;
  test_steps_snapshot: string;
  expected_result_snapshot: string;
  priority_snapshot: string;
  status: string;
  actual_result: string;
  executed_at: Date | string | null;
  executor: { username: string } | null;
  bugReport: { id: number; title: string; status: string } | null;
};
export function RunExecutionWorkspace({
  executions,
  canExecute,
}: {
  executions: Execution[];
  canExecute: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault();
    setBusyId(id);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/test-executions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        actual_result: form.get("actual_result"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Unable to record this result.");
    else router.refresh();
    setBusyId(null);
  }
  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-ember/40 bg-ember/15 p-4 text-sm text-[#ff9aa2]"
        >
          {error}
        </p>
      )}
      {executions.map((execution) => (
        <article
          key={execution.id}
          className={
            execution.status === "FAILED"
              ? "rounded-lg border border-ember/55 bg-clay p-5 shadow-card"
              : "rounded-lg border border-bronze bg-clay p-5 shadow-card"
          }
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber">
                {execution.test_case_reference} ·{" "}
                {execution.feature_module_snapshot}
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold">
                {execution.title_snapshot}
              </h2>
              <p className="mt-2 text-sm leading-6 text-beige">
                {execution.description_snapshot}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge label={execution.status} />
              <Badge label={execution.priority_snapshot} />
            </div>
          </div>
          <details className="mt-5 rounded-lg border border-bronze bg-espresso/45 p-4">
            <summary className="cursor-pointer font-semibold text-ivory">
              Execution instructions
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-coral">
                  Preconditions
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-beige">
                  {execution.preconditions_snapshot}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-coral">
                  Test steps
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-beige">
                  {execution.test_steps_snapshot}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-coral">
                  Expected
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-beige">
                  {execution.expected_result_snapshot}
                </p>
              </div>
            </div>
          </details>
          {canExecute && (
            <form
              onSubmit={(event) => save(event, execution.id)}
              className="mt-5 grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end"
            >
              <label>
                <span className="mb-2 block text-sm font-semibold text-beige">
                  Result
                </span>
                <select
                  className="field"
                  name="status"
                  defaultValue={execution.status}
                >
                  <option value="NOT_RUN">Not Run</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-beige">
                  Actual result / notes
                </span>
                <textarea
                  className="field min-h-20"
                  name="actual_result"
                  defaultValue={execution.actual_result}
                  placeholder="Record observed behavior, evidence context, or blocking reason."
                />
              </label>
              <button
                disabled={busyId === execution.id}
                className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso disabled:opacity-60"
              >
                {busyId === execution.id ? "Saving..." : "Record Result"}
              </button>
            </form>
          )}
          {execution.status === "FAILED" && (
            <div className="mt-4 rounded-lg border border-ember/40 bg-ember/10 p-4">
              {execution.bugReport ? (
                <p className="text-sm text-beige">
                  Linked bug:{" "}
                  <Link
                    href={`/dashboard/issues/${execution.bugReport.id}`}
                    className="font-semibold text-amber"
                  >
                    IF-{String(execution.bugReport.id).padStart(4, "0")} ·{" "}
                    {execution.bugReport.title}
                  </Link>
                </p>
              ) : canExecute ? (
                <Link
                  href={`/dashboard/issues/new?fromExecution=${execution.id}`}
                  className="inline-flex rounded-full border border-ember/60 px-4 py-2 text-sm font-bold text-[#ff9aa2] transition hover:bg-ember/15"
                >
                  Create Bug Report from Failed Execution
                </Link>
              ) : null}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
