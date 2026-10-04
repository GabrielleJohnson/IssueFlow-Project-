export function roleDashboardTitle(role: string) {
  if (role === "ADMIN") {
    return "Command center for QA operations.";
  }

  if (role === "DEVELOPER") {
    return "Assigned defects without the noise.";
  }

  return "QA coverage and defect flow in one place.";
}

export function roleDashboardDescription(role: string) {
  if (role === "ADMIN") {
    return "Monitor users, role mix, open defects, failed tests, and evidence volume from the same warm IssueFlow workspace.";
  }

  if (role === "DEVELOPER") {
    return "Focus on assigned and unassigned bug reports, update status, and review linked evidence and test context.";
  }

  return "Track test cases, failed runs, bug reports created from failed tests, and evidence uploads without leaving the QA workflow.";
}
