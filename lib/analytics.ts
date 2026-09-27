import type { Prisma } from "@prisma/client";
import { issueSeverities, issueStatuses, testCaseStatuses } from "@/lib/issueOptions";
import { isAdmin, isDeveloper, issueWhereForUser, type PermissionUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const activeIssueStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "REOPENED"] as const;

type AnalyticsUser = PermissionUser & {
  username: string;
  role: string;
};

export type AnalyticsData = {
  scope: "all" | "qa" | "developer";
  summary: {
    totalBugReports: number;
    openBugs: number;
    criticalBugs: number;
    reopenedBugs: number;
    resolvedBugs: number;
    closedBugs: number;
    inProgressBugs: number;
    unassignedBugs: number;
    totalTestCases: number;
    failedTestCases: number;
    testPassRate: number;
    executedTestCases: number;
  };
  bugsByStatus: Array<{ key: string; label: string; count: number }>;
  bugsBySeverity: Array<{ key: string; label: string; count: number }>;
  testResults: Array<{ key: string; label: string; count: number }>;
  reopenMetrics: {
    currentReopenedBugs: number;
    recordedReopenEvents: number;
    recordedResolvedBugs: number;
    verifiedReopenedBugs: number;
    recordedReopenRate: number | null;
  };
  developerWorkload: Array<{
    id: number;
    username: string;
    counts: Record<string, number>;
    totalActive: number;
  }>;
  recentActivity: Array<{
    id: number;
    actionType: string;
    message: string;
    createdAt: Date;
    actor: { username: string; role: string } | null;
    issue: { id: number; title: string; status: string };
  }>;
  problemAreas: Array<{
    module: string;
    failedTests: number;
    linkedBugReports: number;
  }>;
};

function labelFor(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getAnalyticsData(user: AnalyticsUser): Promise<AnalyticsData> {
  const issueWhere: Prisma.IssueWhereInput = issueWhereForUser(user);
  const testCaseWhere: Prisma.TestCaseWhereInput = isDeveloper(user)
    ? { linkedIssue: { is: issueWhere } }
    : {};
  const activityWhere: Prisma.IssueActivityWhereInput = { issue: { is: issueWhere } };
  const meaningfulActions = [
    "ISSUE_CREATED",
    "STATUS_CHANGED",
    "ISSUE_REOPENED",
    "ISSUE_RESOLVED",
    "ISSUE_CLOSED",
    "ASSIGNEE_CHANGED",
    "EVIDENCE_UPLOADED",
    "COMMENT_ADDED"
  ];

  const developerWorkloadPromise = isAdmin(user) || isDeveloper(user)
    ? prisma.user.findMany({
        where: isDeveloper(user) ? { id: user.id, role: "DEVELOPER" } : { role: "DEVELOPER" },
        orderBy: { username: "asc" },
        select: {
          id: true,
          username: true,
          assignedIssues: {
            where: { status: { in: [...activeIssueStatuses] } },
            select: { status: true }
          }
        }
      })
    : Promise.resolve([]);

  const [statusGroups, severityGroups, testGroups, unassignedBugs, recentActivity, reopenActivities, resolvedActivities, developers, problemTestCases] = await Promise.all([
    prisma.issue.groupBy({ by: ["status"], where: issueWhere, _count: { _all: true } }),
    prisma.issue.groupBy({ by: ["severity"], where: issueWhere, _count: { _all: true } }),
    prisma.testCase.groupBy({ by: ["status"], where: testCaseWhere, _count: { _all: true } }),
    prisma.issue.count({ where: { ...issueWhere, assigned_to: null, status: { in: [...activeIssueStatuses] } } }),
    prisma.issueActivity.findMany({
      where: { ...activityWhere, action_type: { in: meaningfulActions } },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        action_type: true,
        message: true,
        created_at: true,
        actor: { select: { username: true, role: true } },
        issue: { select: { id: true, title: true, status: true } }
      }
    }),
    prisma.issueActivity.findMany({ where: { ...activityWhere, action_type: "ISSUE_REOPENED" }, select: { issue_id: true } }),
    prisma.issueActivity.findMany({ where: { ...activityWhere, action_type: "ISSUE_RESOLVED" }, select: { issue_id: true } }),
    developerWorkloadPromise,
    prisma.testCase.findMany({
      where: testCaseWhere,
      select: {
        feature_module: true,
        status: true,
        linked_issue_id: true,
        createdBugReports: { where: issueWhere, select: { id: true } }
      }
    })
  ]);

  const statusCounts = new Map(statusGroups.map((row) => [row.status, row._count._all]));
  const severityCounts = new Map(severityGroups.map((row) => [row.severity, row._count._all]));
  const testCounts = new Map(testGroups.map((row) => [row.status, row._count._all]));
  const bugsByStatus = issueStatuses.map((status) => ({ key: status, label: labelFor(status), count: statusCounts.get(status) ?? 0 }));
  const bugsBySeverity = issueSeverities.map((severity) => ({ key: severity, label: labelFor(severity), count: severityCounts.get(severity) ?? 0 }));
  const testResults = testCaseStatuses.map((status) => ({ key: status, label: labelFor(status), count: testCounts.get(status) ?? 0 }));
  const totalBugReports = bugsByStatus.reduce((total, item) => total + item.count, 0);
  const totalTestCases = testResults.reduce((total, item) => total + item.count, 0);
  const passed = testCounts.get("PASSED") ?? 0;
  const failed = testCounts.get("FAILED") ?? 0;
  const blocked = testCounts.get("BLOCKED") ?? 0;
  const executedTestCases = passed + failed + blocked;
  const resolvedIssueIds = new Set(resolvedActivities.map((activity) => activity.issue_id));
  const reopenedIssueIds = new Set(reopenActivities.map((activity) => activity.issue_id));
  const verifiedReopenedBugs = [...reopenedIssueIds].filter((issueId) => resolvedIssueIds.has(issueId)).length;
  const areaMap = new Map<string, { failedTests: number; linkedBugIds: Set<number> }>();

  for (const testCase of problemTestCases) {
    const moduleName = testCase.feature_module.trim() || "General";
    const area = areaMap.get(moduleName) ?? { failedTests: 0, linkedBugIds: new Set<number>() };

    if (testCase.status === "FAILED") {
      area.failedTests += 1;
    }

    if (testCase.linked_issue_id) {
      area.linkedBugIds.add(testCase.linked_issue_id);
    }

    for (const issue of testCase.createdBugReports) {
      area.linkedBugIds.add(issue.id);
    }

    areaMap.set(moduleName, area);
  }

  return {
    scope: isAdmin(user) ? "all" : isDeveloper(user) ? "developer" : "qa",
    summary: {
      totalBugReports,
      openBugs: activeIssueStatuses.reduce((total, status) => total + (statusCounts.get(status) ?? 0), 0),
      criticalBugs: severityCounts.get("CRITICAL") ?? 0,
      reopenedBugs: statusCounts.get("REOPENED") ?? 0,
      resolvedBugs: statusCounts.get("RESOLVED") ?? 0,
      closedBugs: statusCounts.get("CLOSED") ?? 0,
      inProgressBugs: statusCounts.get("IN_PROGRESS") ?? 0,
      unassignedBugs,
      totalTestCases,
      failedTestCases: failed,
      testPassRate: executedTestCases ? Math.round((passed / executedTestCases) * 1000) / 10 : 0,
      executedTestCases
    },
    bugsByStatus,
    bugsBySeverity,
    testResults,
    reopenMetrics: {
      currentReopenedBugs: statusCounts.get("REOPENED") ?? 0,
      recordedReopenEvents: reopenActivities.length,
      recordedResolvedBugs: resolvedIssueIds.size,
      verifiedReopenedBugs,
      recordedReopenRate: resolvedIssueIds.size ? Math.round((verifiedReopenedBugs / resolvedIssueIds.size) * 1000) / 10 : null
    },
    developerWorkload: developers.map((developer) => {
      const counts = Object.fromEntries(activeIssueStatuses.map((status) => [status, 0])) as Record<string, number>;

      for (const issue of developer.assignedIssues) {
        counts[issue.status] = (counts[issue.status] ?? 0) + 1;
      }

      return {
        id: developer.id,
        username: developer.username,
        counts,
        totalActive: developer.assignedIssues.length
      };
    }),
    recentActivity: recentActivity.map((activity) => ({
      id: activity.id,
      actionType: activity.action_type,
      message: activity.message,
      createdAt: activity.created_at,
      actor: activity.actor,
      issue: activity.issue
    })),
    problemAreas: [...areaMap.entries()]
      .map(([module, area]) => ({ module, failedTests: area.failedTests, linkedBugReports: area.linkedBugIds.size }))
      .filter((area) => area.failedTests > 0 || area.linkedBugReports > 0)
      .sort((left, right) => right.failedTests - left.failedTests || right.linkedBugReports - left.linkedBugReports || left.module.localeCompare(right.module))
      .slice(0, 6)
  };
}
