import type { IssueStatus, Severity, TestStatus } from "@/data/mockData";

type BadgeProps = {
  label: Severity | IssueStatus | TestStatus;
};

const styles: Record<string, string> = {
  Critical: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  High: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  Medium: "border-amber/40 bg-amber/15 text-amber",
  Low: "border-sage/40 bg-sage/15 text-sage",
  Open: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  "In Progress": "border-amber/40 bg-amber/15 text-amber",
  "Ready for QA": "border-sage/40 bg-sage/15 text-sage",
  Resolved: "border-sage/40 bg-sage/15 text-sage",
  Pass: "border-sage/40 bg-sage/15 text-sage",
  Fail: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  Blocked: "border-ochre/40 bg-ochre/15 text-[#edc174]"
};

export function Badge({ label }: BadgeProps) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${styles[label]}`}>
      {label}
    </span>
  );
}
