export const userRoles = ["ADMIN", "TESTER", "DEVELOPER"] as const;
export const issueSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const issueStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;
export const testCaseStatuses = ["NOT_RUN", "PASSED", "FAILED", "BLOCKED"] as const;
export const testCasePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type UserRole = (typeof userRoles)[number];
export type IssueSeverity = (typeof issueSeverities)[number];
export type IssueStatus = (typeof issueStatuses)[number];
export type TestCaseStatus = (typeof testCaseStatuses)[number];
export type TestCasePriority = (typeof testCasePriorities)[number];

export function isIssueSeverity(value: string): value is IssueSeverity {
  return issueSeverities.includes(value as IssueSeverity);
}

export function isIssueStatus(value: string): value is IssueStatus {
  return issueStatuses.includes(value as IssueStatus);
}

export function isTestCaseStatus(value: string): value is TestCaseStatus {
  return testCaseStatuses.includes(value as TestCaseStatus);
}

export function isTestCasePriority(value: string): value is TestCasePriority {
  return testCasePriorities.includes(value as TestCasePriority);
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Future role checks can centralize here, for example:
// export function canDeleteIssue(role: UserRole) { return role === "ADMIN"; }
export function canDeleteIssue(role?: string) {
  return role === "ADMIN" || role === "TESTER" || role === "DEVELOPER";
}

// Future role gate: make destructive test-case actions ADMIN-only when dashboards split by role.
export function canDeleteTestCase(role?: string) {
  return role === "ADMIN" || role === "TESTER" || role === "DEVELOPER";
}
