import type { IssueStatus, UserRole } from "@/lib/issueOptions";

export type PermissionUser = {
  id: number;
  role: string;
};

export type IssuePermissionTarget = {
  created_by: number;
  assigned_to: number | null;
  status?: string;
};

export type TestCasePermissionTarget = {
  created_by: number;
  linkedIssue?: IssuePermissionTarget | null;
};

export type AttachmentPermissionTarget = {
  uploaded_by: number;
  issue?: IssuePermissionTarget | null;
};

export type CommentPermissionTarget = {
  author_id: number;
  issue?: IssuePermissionTarget | null;
};

export type TestSuitePermissionTarget = { created_by: number };
export type TestRunPermissionTarget = { created_by: number };

export const normalIssueLifecycle = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"] as const;
export const reopenedIssueLifecycle = ["RESOLVED", "REOPENED", "IN_PROGRESS", "IN_REVIEW", "RESOLVED"] as const;

const developerTransitions: Record<string, IssueStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW"],
  IN_REVIEW: ["RESOLVED"],
  REOPENED: ["IN_PROGRESS"]
};

const testerTransitions: Record<string, IssueStatus[]> = {
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"]
};

const adminTransitions: Record<string, IssueStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["IN_REVIEW", "OPEN"],
  IN_REVIEW: ["RESOLVED", "IN_PROGRESS"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: ["REOPENED"]
};

export function normalizeRole(role?: string): UserRole {
  return role === "ADMIN" || role === "DEVELOPER" || role === "TESTER" ? role : "TESTER";
}

export function isAdmin(user?: PermissionUser | null) {
  return normalizeRole(user?.role) === "ADMIN";
}

export function isTester(user?: PermissionUser | null) {
  return normalizeRole(user?.role) === "TESTER";
}

export function isDeveloper(user?: PermissionUser | null) {
  return normalizeRole(user?.role) === "DEVELOPER";
}

export function canManageUsers(user?: PermissionUser | null) {
  return isAdmin(user);
}

export function canViewAnalytics(user?: PermissionUser | null) {
  return Boolean(user);
}

export function canViewIssue(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  if (!user) {
    return false;
  }

  if (isAdmin(user) || isTester(user)) {
    return true;
  }

  return isDeveloper(user) && (issue.assigned_to === user.id || issue.assigned_to === null);
}

export function canCreateIssue(user?: PermissionUser | null) {
  return isAdmin(user) || isTester(user);
}

export function canEditIssue(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  if (!user) {
    return false;
  }

  return isAdmin(user) || (isTester(user) && issue.created_by === user.id);
}

export function canAssignIssue(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return Boolean(user && (isAdmin(user) || (isTester(user) && canViewIssue(user, issue))));
}

export function canUpdateIssueStatus(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  if (!user) {
    return false;
  }

  return canEditIssue(user, issue) || (isTester(user) && canViewIssue(user, issue)) || (isDeveloper(user) && canViewIssue(user, issue));
}

export function canTransitionIssueStatus(user: PermissionUser | null | undefined, issue: IssuePermissionTarget, nextStatus: string) {
  if (!user || !issue.status || issue.status === nextStatus) {
    return Boolean(user && issue.status === nextStatus && canViewIssue(user, issue));
  }

  if (!canUpdateIssueStatus(user, issue)) {
    return false;
  }

  const currentStatus = issue.status;

  if (isAdmin(user)) {
    return adminTransitions[currentStatus]?.includes(nextStatus as IssueStatus) ?? false;
  }

  if (isDeveloper(user)) {
    return developerTransitions[currentStatus]?.includes(nextStatus as IssueStatus) ?? false;
  }

  if (isTester(user)) {
    return testerTransitions[currentStatus]?.includes(nextStatus as IssueStatus) ?? false;
  }

  return false;
}

export function validTransitionsForIssue(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "REOPENED", "CLOSED"].filter((status) => canTransitionIssueStatus(user, issue, status));
}

export function canDeleteIssue(user: PermissionUser | null | undefined, _issue?: IssuePermissionTarget) {
  return isAdmin(user);
}

export function canViewTestCase(user: PermissionUser | null | undefined, testCase: TestCasePermissionTarget) {
  if (!user) {
    return false;
  }

  if (isAdmin(user) || isTester(user)) {
    return true;
  }

  return Boolean(testCase.linkedIssue && canViewIssue(user, testCase.linkedIssue));
}

export function canCreateTestCase(user?: PermissionUser | null) {
  return isAdmin(user) || isTester(user);
}

export function canEditTestCase(user: PermissionUser | null | undefined, _testCase?: TestCasePermissionTarget) {
  return isAdmin(user) || isTester(user);
}

export function canDeleteTestCase(user: PermissionUser | null | undefined, _testCase?: TestCasePermissionTarget) {
  return isAdmin(user);
}

export function canViewTestManagement(user?: PermissionUser | null) {
  return isAdmin(user) || isTester(user);
}

export function canCreateTestSuite(user?: PermissionUser | null) {
  return canViewTestManagement(user);
}

export function canEditTestSuite(user: PermissionUser | null | undefined, suite?: TestSuitePermissionTarget) {
  return Boolean(user && (isAdmin(user) || (isTester(user) && (!suite || suite.created_by === user.id))));
}

export function canDeleteTestSuite(user: PermissionUser | null | undefined, suite?: TestSuitePermissionTarget) {
  return canEditTestSuite(user, suite);
}

export function canCreateTestRun(user?: PermissionUser | null) {
  return canViewTestManagement(user);
}

export function canExecuteTestRun(user?: PermissionUser | null) {
  return canViewTestManagement(user);
}

export function canDeleteTestRun(user?: PermissionUser | null, _run?: TestRunPermissionTarget) {
  return isAdmin(user);
}

export function canUploadEvidence(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return (isAdmin(user) || isTester(user)) && canViewIssue(user, issue);
}

export function canViewEvidence(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return canViewIssue(user, issue);
}

export function canDeleteEvidence(user: PermissionUser | null | undefined, attachment: AttachmentPermissionTarget) {
  if (!user) {
    return false;
  }

  return isAdmin(user) || attachment.uploaded_by === user.id;
}

export function canCommentOnIssue(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return canViewIssue(user, issue);
}

export function canViewIssueActivity(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  return canViewIssue(user, issue);
}

export function canEditComment(user: PermissionUser | null | undefined, comment: CommentPermissionTarget) {
  return Boolean(user && comment.author_id === user.id);
}

export function canDeleteComment(user: PermissionUser | null | undefined, comment: CommentPermissionTarget) {
  return Boolean(user && (isAdmin(user) || comment.author_id === user.id));
}

export function issueWhereForUser(user: PermissionUser) {
  if (isDeveloper(user)) {
    return { OR: [{ assigned_to: user.id }, { assigned_to: null }] };
  }

  return {};
}

export function assignedIssueWhereForUser(user: PermissionUser) {
  return isDeveloper(user) ? { assigned_to: user.id } : issueWhereForUser(user);
}

export function issueStatusOnlyPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return false;
  }

  const keys = Object.keys(body).filter((key) => body[key] !== undefined);
  return keys.length > 0 && keys.every((key) => key === "status" || key === "reopen_reason");
}

