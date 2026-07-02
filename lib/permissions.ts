import type { UserRole } from "@/lib/issueOptions";

export type PermissionUser = {
  id: number;
  role: string;
};

export type IssuePermissionTarget = {
  created_by: number;
  assigned_to: number | null;
};

export type TestCasePermissionTarget = {
  created_by: number;
  linkedIssue?: IssuePermissionTarget | null;
};

export type AttachmentPermissionTarget = {
  uploaded_by: number;
  issue?: IssuePermissionTarget | null;
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
  return isAdmin(user);
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

export function canUpdateIssueStatus(user: PermissionUser | null | undefined, issue: IssuePermissionTarget) {
  if (!user) {
    return false;
  }

  return canEditIssue(user, issue) || (isDeveloper(user) && canViewIssue(user, issue));
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

export function issueWhereForUser(user: PermissionUser) {
  if (isDeveloper(user)) {
    return { OR: [{ assigned_to: user.id }, { assigned_to: null }] };
  }

  return {};
}

export function issueStatusOnlyPayload(body: Record<string, unknown> | null) {
  if (!body) {
    return false;
  }

  const keys = Object.keys(body).filter((key) => body[key] !== undefined);
  return keys.length > 0 && keys.every((key) => key === "status");
}
