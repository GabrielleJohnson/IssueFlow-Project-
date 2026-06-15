export type IssueUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export type IssueRecord = {
  id: number;
  title: string;
  description: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  severity: string;
  status: string;
  created_by: number;
  assigned_to: number | null;
  created_at: Date;
  updated_at: Date;
  creator: IssueUser;
  assignee: IssueUser | null;
};

export type IssueStats = {
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  total: number;
};
