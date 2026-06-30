export type IssueUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export type LinkedTestCaseSummary = {
  id: number;
  title: string;
  status: string;
  priority: string;
};

export type IssueRecord = {
  id: number;
  title: string;
  description: string;
  environment: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  severity: string;
  status: string;
  created_by: number;
  assigned_to: number | null;
  linked_test_case_id: number | null;
  created_at: Date;
  updated_at: Date;
  creator: IssueUser;
  assignee: IssueUser | null;
  linkedTestCase?: LinkedTestCaseSummary | null;
};

export type TestCaseRecord = {
  id: number;
  title: string;
  description: string;
  feature_module: string;
  preconditions: string;
  test_steps: string;
  expected_result: string;
  actual_result: string;
  status: string;
  priority: string;
  created_by: number;
  linked_issue_id: number | null;
  created_at: Date;
  updated_at: Date;
  creator: IssueUser;
  linkedIssue: Pick<IssueRecord, "id" | "title" | "severity" | "status"> | null;
};

export type IssueStats = {
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  total: number;
  totalTestCases: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
};
