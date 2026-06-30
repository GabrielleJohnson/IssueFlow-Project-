import { formatEnumLabel } from "@/lib/issueOptions";

type BadgeProps = {
  label: string;
};

const styles: Record<string, string> = {
  Critical: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  CRITICAL: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  High: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  HIGH: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  Medium: "border-amber/40 bg-amber/15 text-amber",
  MEDIUM: "border-amber/40 bg-amber/15 text-amber",
  Low: "border-sage/40 bg-sage/15 text-sage",
  LOW: "border-sage/40 bg-sage/15 text-sage",
  Open: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  OPEN: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  "In Progress": "border-amber/40 bg-amber/15 text-amber",
  IN_PROGRESS: "border-amber/40 bg-amber/15 text-amber",
  IN_REVIEW: "border-sage/40 bg-sage/15 text-sage",
  "Ready for QA": "border-sage/40 bg-sage/15 text-sage",
  Resolved: "border-sage/40 bg-sage/15 text-sage",
  RESOLVED: "border-sage/40 bg-sage/15 text-sage",
  CLOSED: "border-bronze bg-espresso/80 text-beige",
  Pass: "border-sage/40 bg-sage/15 text-sage",
  PASSED: "border-sage/40 bg-sage/15 text-sage",
  Fail: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  FAILED: "border-ember/40 bg-ember/15 text-[#ff9aa2]",
  Blocked: "border-ochre/40 bg-ochre/15 text-[#edc174]",
  BLOCKED: "border-ochre/40 bg-ochre/15 text-[#edc174]",
  NOT_RUN: "border-bronze bg-espresso/80 text-beige",
  ADMIN: "border-coral/40 bg-coral/15 text-[#ffb29f]",
  TESTER: "border-amber/40 bg-amber/15 text-amber",
  DEVELOPER: "border-sage/40 bg-sage/15 text-sage"
};

export function Badge({ label }: BadgeProps) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${styles[label] ?? "border-bronze bg-espresso/80 text-beige"}`}>
      {label.includes("_") || label === label.toUpperCase() ? formatEnumLabel(label) : label}
    </span>
  );
}
