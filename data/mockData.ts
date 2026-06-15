export type Severity = "Critical" | "High" | "Medium" | "Low";
export type IssueStatus = "Open" | "In Progress" | "Ready for QA" | "Resolved";
export type TestStatus = "Pass" | "Fail" | "Blocked";

export type Issue = {
  id: string;
  title: string;
  area: string;
  severity: Severity;
  status: IssueStatus;
  owner: string;
  testCase: string;
  reported: string;
};

export type TestCase = {
  id: string;
  name: string;
  suite: string;
  status: TestStatus;
  linkedIssue?: string;
  lastRun: string;
};

export const issues: Issue[] = [
  {
    id: "BUG-1427",
    title: "Checkout total recalculates after applying loyalty credit",
    area: "Payments",
    severity: "Critical",
    status: "Open",
    owner: "Maya",
    testCase: "TC-084",
    reported: "Today"
  },
  {
    id: "BUG-1419",
    title: "Mobile filter drawer traps keyboard focus after closing",
    area: "Catalog",
    severity: "High",
    status: "In Progress",
    owner: "Jon",
    testCase: "TC-031",
    reported: "Yesterday"
  },
  {
    id: "BUG-1398",
    title: "Evidence upload succeeds but thumbnail preview is missing",
    area: "Bug intake",
    severity: "Medium",
    status: "Ready for QA",
    owner: "Priya",
    testCase: "TC-112",
    reported: "Jun 11"
  },
  {
    id: "BUG-1386",
    title: "Password reset confirmation shows stale email address",
    area: "Auth",
    severity: "Low",
    status: "Resolved",
    owner: "Eli",
    testCase: "TC-018",
    reported: "Jun 09"
  }
];

export const testCases: TestCase[] = [
  {
    id: "TC-084",
    name: "Apply loyalty credit during checkout",
    suite: "Regression / Payments",
    status: "Fail",
    linkedIssue: "BUG-1427",
    lastRun: "14 min ago"
  },
  {
    id: "TC-031",
    name: "Navigate product filters with keyboard only",
    suite: "Accessibility",
    status: "Fail",
    linkedIssue: "BUG-1419",
    lastRun: "38 min ago"
  },
  {
    id: "TC-112",
    name: "Attach video and screenshot evidence to defect",
    suite: "QA Workflow",
    status: "Blocked",
    linkedIssue: "BUG-1398",
    lastRun: "1 hr ago"
  },
  {
    id: "TC-018",
    name: "Complete password reset using invited account",
    suite: "Auth",
    status: "Pass",
    lastRun: "2 hrs ago"
  }
];

export const overviewStats = [
  { label: "Open Bugs", value: 32, delta: "+6 this sprint", tone: "coral" },
  { label: "In Progress", value: 14, delta: "8 assigned today", tone: "amber" },
  { label: "Resolved", value: 91, delta: "74% closure rate", tone: "sage" },
  { label: "Critical Issues", value: 5, delta: "2 blocking release", tone: "ember" }
] as const;

export const severityBreakdown = [
  { label: "Critical", value: 5, color: "#E63946" },
  { label: "High", value: 11, color: "#FF6B4A" },
  { label: "Medium", value: 16, color: "#F7B267" },
  { label: "Low", value: 9, color: "#8DB596" }
];
