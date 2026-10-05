import { prisma } from "@/lib/prisma";
import {
  coverageState,
  latestExecution,
  type CoverageTestCase,
} from "@/lib/requirements";

export type ReadinessResult = "READY" | "AT_RISK" | "NOT_READY";

type ReleaseDefect = {
  id: number;
  title: string;
  severity: string;
  status: string;
};

type TestCaseDefectSource = {
  linkedIssue: ReleaseDefect | null;
  createdBugReports: ReleaseDefect[];
  executions: Array<{ bugReport: ReleaseDefect | null }>;
};

function relevantTestCaseDefects(testCase: TestCaseDefectSource) {
  const defects = new Map<number, ReleaseDefect>();
  if (testCase.linkedIssue)
    defects.set(testCase.linkedIssue.id, testCase.linkedIssue);
  for (const defect of testCase.createdBugReports)
    defects.set(defect.id, defect);
  for (const execution of testCase.executions) {
    if (execution.bugReport)
      defects.set(execution.bugReport.id, execution.bugReport);
  }
  return [...defects.values()].sort((left, right) => left.id - right.id);
}

export async function getReleaseReadiness(releaseId: number) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      creator: { select: { id: true, username: true } },
      runs: {
        orderBy: { started_at: "desc" },
        include: {
          executions: {
            orderBy: [
              { executed_at: "desc" },
              { updated_at: "desc" },
              { id: "desc" },
            ],
            include: {
              bugReport: {
                select: { id: true, title: true, severity: true, status: true },
              },
              testCase: { select: { id: true, title: true } },
            },
          },
        },
      },
      requirements: {
        orderBy: { linked_at: "asc" },
        include: {
          requirement: {
            include: {
              testCaseLinks: {
                orderBy: { linked_at: "asc" },
                include: {
                  testCase: {
                    include: {
                      linkedIssue: {
                        select: {
                          id: true,
                          title: true,
                          severity: true,
                          status: true,
                        },
                      },
                      createdBugReports: {
                        select: {
                          id: true,
                          title: true,
                          severity: true,
                          status: true,
                        },
                      },
                      executions: {
                        where: { run: { release_id: releaseId } },
                        orderBy: [
                          { executed_at: "desc" },
                          { updated_at: "desc" },
                          { id: "desc" },
                        ],
                        include: {
                          bugReport: {
                            select: {
                              id: true,
                              title: true,
                              severity: true,
                              status: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!release) return null;

  const executions = release.runs.flatMap((run) => run.executions);
  const counts = { PASSED: 0, FAILED: 0, BLOCKED: 0, NOT_RUN: 0 };
  for (const execution of executions) {
    const key =
      execution.status in counts
        ? (execution.status as keyof typeof counts)
        : "NOT_RUN";
    counts[key] += 1;
  }

  const requirements = release.requirements.map(({ requirement }) => {
    const testCases = requirement.testCaseLinks.map(({ testCase }) => ({
      ...testCase,
      relevantDefects: relevantTestCaseDefects(testCase),
    }));
    return {
      ...requirement,
      testCases,
      coverage: coverageState(testCases as CoverageTestCase[], false),
    };
  });

  const defectsById = new Map<
    number,
    { id: number; title: string; severity: string; status: string }
  >();
  for (const execution of executions) {
    if (execution.bugReport)
      defectsById.set(execution.bugReport.id, execution.bugReport);
  }
  for (const requirement of requirements) {
    for (const testCase of requirement.testCases) {
      for (const defect of testCase.relevantDefects)
        defectsById.set(defect.id, defect);
    }
  }
  const defects = [...defectsById.values()].sort(
    (left, right) => left.id - right.id,
  );
  const unresolved = defects.filter((defect) => defect.status !== "CLOSED");
  const criticalDefects = unresolved.filter(
    (defect) => defect.severity === "CRITICAL",
  ).length;
  const highDefects = unresolved.filter(
    (defect) => defect.severity === "HIGH",
  ).length;
  const reopenedDefects = unresolved.filter(
    (defect) => defect.status === "REOPENED",
  ).length;
  const blockingCoverage = requirements.filter(
    (item) => item.coverage !== "PASSING",
  );
  const hardBlock =
    release.runs.length === 0 ||
    requirements.length === 0 ||
    criticalDefects > 0 ||
    counts.FAILED > 0 ||
    counts.BLOCKED > 0 ||
    counts.NOT_RUN > 0 ||
    blockingCoverage.length > 0;
  const readiness: ReadinessResult = hardBlock
    ? "NOT_READY"
    : unresolved.length > 0
      ? "AT_RISK"
      : "READY";
  const executed = counts.PASSED + counts.FAILED + counts.BLOCKED;

  return {
    release,
    requirements,
    defects,
    unresolved,
    readiness,
    metrics: {
      runs: release.runs.length,
      executions: executions.length,
      ...counts,
      passRate: executed ? Math.round((counts.PASSED / executed) * 100) : 0,
      openDefects: unresolved.length,
      criticalDefects,
      highDefects,
      reopenedDefects,
      coverage: requirements.reduce<Record<string, number>>((totals, item) => {
        totals[item.coverage] = (totals[item.coverage] ?? 0) + 1;
        return totals;
      }, {}),
    },
  };
}

function spreadsheetSafe(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  return `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;
}

export function releaseReportCsv(
  data: NonNullable<Awaited<ReturnType<typeof getReleaseReadiness>>>,
) {
  const header = [
    "Release",
    "Readiness",
    "Requirement",
    "Requirement Title",
    "Feature / Module",
    "Coverage",
    "Test Case",
    "Test Case Title",
    "Latest Release Result",
    "Linked Defect",
    "Defect Severity",
    "Defect Status",
  ];
  const rows: unknown[][] = [];
  const reportedDefectIds = new Set<number>();

  for (const requirement of data.requirements) {
    if (requirement.testCases.length === 0) {
      rows.push([
        data.release.name,
        data.readiness,
        `REQ-${String(requirement.id).padStart(4, "0")}`,
        requirement.title,
        requirement.feature_module,
        requirement.coverage,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      continue;
    }
    for (const testCase of requirement.testCases) {
      const latest = latestExecution(testCase.executions);
      const defects = testCase.relevantDefects;
      for (const defect of defects) reportedDefectIds.add(defect.id);
      rows.push([
        data.release.name,
        data.readiness,
        `REQ-${String(requirement.id).padStart(4, "0")}`,
        requirement.title,
        requirement.feature_module,
        requirement.coverage,
        `TC-${String(testCase.id).padStart(4, "0")}`,
        testCase.title,
        latest?.status ?? "NOT_RUN",
        defects
          .map((defect) => `IF-${String(defect.id).padStart(4, "0")}`)
          .join("; "),
        defects.map((defect) => defect.severity).join("; "),
        defects.map((defect) => defect.status).join("; "),
      ]);
    }
  }

  for (const defect of data.defects) {
    if (reportedDefectIds.has(defect.id)) continue;
    rows.push([
      data.release.name,
      data.readiness,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `IF-${String(defect.id).padStart(4, "0")}`,
      defect.severity,
      defect.status,
    ]);
  }

  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
