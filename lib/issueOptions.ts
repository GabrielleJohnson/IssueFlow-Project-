export const userRoles = ["ADMIN", "TESTER", "DEVELOPER"] as const;
export const issueSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const issueStatuses = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;

export type UserRole = (typeof userRoles)[number];
export type IssueSeverity = (typeof issueSeverities)[number];
export type IssueStatus = (typeof issueStatuses)[number];

export function isIssueSeverity(value: string): value is IssueSeverity {
  return issueSeverities.includes(value as IssueSeverity);
}

export function isIssueStatus(value: string): value is IssueStatus {
  return issueStatuses.includes(value as IssueStatus);
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
