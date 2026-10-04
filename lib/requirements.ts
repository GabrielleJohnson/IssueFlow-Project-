import type { CoverageState } from "@/lib/issueOptions";

export type CoverageExecution = {
  id: number;
  status: string;
  executed_at?: Date | null;
  updated_at?: Date;
  created_at?: Date;
};

export type CoverageTestCase = {
  status?: string;
  executions: CoverageExecution[];
};

export function requirementReference(id: number) {
  return `REQ-${String(id).padStart(4, "0")}`;
}

export function latestExecution<T extends CoverageExecution>(executions: T[]): T | null {
  return executions.toSorted((left, right) => {
    const leftTime = (left.executed_at ?? left.updated_at ?? left.created_at ?? new Date(0)).getTime();
    const rightTime = (right.executed_at ?? right.updated_at ?? right.created_at ?? new Date(0)).getTime();
    return rightTime - leftTime || right.id - left.id;
  })[0] ?? null;
}

export function coverageState(testCases: CoverageTestCase[], useCurrentTestStatus = true): CoverageState {
  if (testCases.length === 0) return "NOT_COVERED";

  const states = testCases.map((testCase) => {
    const latest = latestExecution(testCase.executions);
    return latest?.status ?? (useCurrentTestStatus && testCase.status === "BLOCKED" ? "BLOCKED" : "NOT_RUN");
  });

  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("FAILED")) return "FAILING";
  if (states.some((state) => state !== "PASSED")) return "COVERED_NOT_EXECUTED";
  return "PASSING";
}

export const coverageLabels: Record<CoverageState, string> = {
  NOT_COVERED: "Not Covered",
  COVERED_NOT_EXECUTED: "Covered / Not Executed",
  PASSING: "Passing",
  FAILING: "Failing",
  BLOCKED: "Blocked"
};
