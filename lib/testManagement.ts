import { testCaseStatuses, testRunStatuses } from "@/lib/issueOptions";

export type RunProgressInput = { status: string };

export function testSuiteReference(id: number) {
  return `TS-${String(id).padStart(4, "0")}`;
}

export function testRunReference(id: number) {
  return `TR-${String(id).padStart(4, "0")}`;
}

export function testExecutionReference(id: number) {
  return `EX-${String(id).padStart(4, "0")}`;
}

export function runProgress(executions: RunProgressInput[]) {
  const total = executions.length;
  const executed = executions.filter((execution) => execution.status !== "NOT_RUN").length;
  const passed = executions.filter((execution) => execution.status === "PASSED").length;
  const failed = executions.filter((execution) => execution.status === "FAILED").length;
  const blocked = executions.filter((execution) => execution.status === "BLOCKED").length;
  const percent = total ? Math.round((executed / total) * 100) : 0;
  return { total, executed, passed, failed, blocked, percent };
}

export function nextRunState(executions: RunProgressInput[]) {
  if (executions.length > 0 && executions.every((execution) => execution.status !== "NOT_RUN")) {
    return { status: "COMPLETED", completed_at: new Date() };
  }

  return { status: "IN_PROGRESS", completed_at: null };
}

export function isExecutionStatus(value: string) {
  return testCaseStatuses.includes(value as (typeof testCaseStatuses)[number]);
}

export function isRunStatus(value: string) {
  return testRunStatuses.includes(value as (typeof testRunStatuses)[number]);
}

export function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}
