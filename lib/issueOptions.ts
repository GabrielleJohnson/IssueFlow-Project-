export const userRoles = ["ADMIN", "TESTER", "DEVELOPER"] as const;
export const issueSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const issueStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "REOPENED", "CLOSED"] as const;
export const testCaseStatuses = ["NOT_RUN", "PASSED", "FAILED", "BLOCKED"] as const;
export const testCasePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const testRunStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export const requirementStatuses = ["DRAFT", "READY", "VERIFIED", "BLOCKED"] as const;
export const releaseStatuses = ["PLANNING", "IN_TESTING", "READY", "RELEASED"] as const;
export const coverageStates = ["NOT_COVERED", "COVERED_NOT_EXECUTED", "PASSING", "FAILING", "BLOCKED"] as const;

export type UserRole = (typeof userRoles)[number];
export type IssueSeverity = (typeof issueSeverities)[number];
export type IssueStatus = (typeof issueStatuses)[number];
export type TestCaseStatus = (typeof testCaseStatuses)[number];
export type TestCasePriority = (typeof testCasePriorities)[number];
export type TestRunStatus = (typeof testRunStatuses)[number];
export type RequirementStatus = (typeof requirementStatuses)[number];
export type ReleaseStatus = (typeof releaseStatuses)[number];
export type CoverageState = (typeof coverageStates)[number];

export function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

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

export function isTestRunStatus(value: string): value is TestRunStatus {
  return testRunStatuses.includes(value as TestRunStatus);
}

export function isRequirementStatus(value: string): value is RequirementStatus {
  return requirementStatuses.includes(value as RequirementStatus);
}

export function isReleaseStatus(value: string): value is ReleaseStatus {
  return releaseStatuses.includes(value as ReleaseStatus);
}

export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
