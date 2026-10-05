import { formatEnumLabel } from "@/lib/issueOptions";

const normalSteps = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"];
const reopenedSteps = [
  "RESOLVED",
  "REOPENED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "RESOLVED",
];

export function IssueLifecycleIndicator({ status }: { status: string }) {
  const steps = status === "REOPENED" ? reopenedSteps : normalSteps;

  return (
    <section className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
      <h2 className="font-display text-xl font-semibold text-ivory">
        Lifecycle
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
        {steps.map((step, index) => (
          <div key={`${step}-${index}`} className="flex items-center gap-2">
            <span
              className={
                step === status
                  ? "rounded-full bg-coral px-3 py-2 text-espresso"
                  : "rounded-full border border-bronze px-3 py-2 text-beige"
              }
            >
              {formatEnumLabel(step)}
            </span>
            {index < steps.length - 1 && <span className="text-bronze">/</span>}
          </div>
        ))}
      </div>
      {status === "REOPENED" && (
        <p className="mt-4 rounded-lg border border-ember/40 bg-ember/15 px-4 py-3 text-sm font-semibold text-[#ff9aa2]">
          Reopened means QA verification failed or the defect regressed. This is
          the same bug continuing through its lifecycle.
        </p>
      )}
    </section>
  );
}
