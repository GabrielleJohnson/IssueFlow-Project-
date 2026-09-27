import type { AnalyticsData } from "@/lib/analytics";

type DistributionChartProps = {
  title: string;
  description: string;
  data: Array<{ key: string; label: string; count: number }>;
  colors: Record<string, string>;
};

function DistributionChart({ title, description, data, colors }: DistributionChartProps) {
  const max = Math.max(...data.map((item) => item.count), 0);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ivory">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-beige">{description}</p>
        </div>
        <span className="rounded-full border border-bronze bg-espresso/70 px-3 py-1 text-sm font-semibold text-amber">{total}</span>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-bronze bg-espresso/35 px-4 py-8 text-center text-sm text-beige">
          No records are available for this chart yet.
        </div>
      ) : (
        <div className="mt-6 space-y-4" role="img" aria-label={`${title} distribution`}>
          {data.map((item) => (
            <div key={item.key}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-ivory">{item.label}</span>
                <span className="tabular-nums text-beige">{item.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-espresso" title={`${item.label}: ${item.count}`}>
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: max ? `${(item.count / max) * 100}%` : "0%", backgroundColor: colors[item.key] ?? "#B8A99A" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

const statusColors = { OPEN: "#FF6B4A", IN_PROGRESS: "#F7B267", IN_REVIEW: "#D99A2B", RESOLVED: "#8DB596", REOPENED: "#E63946", CLOSED: "#756A61" };
const severityColors = { LOW: "#8DB596", MEDIUM: "#F7B267", HIGH: "#FF6B4A", CRITICAL: "#E63946" };
const testColors = { NOT_RUN: "#756A61", PASSED: "#8DB596", FAILED: "#E63946", BLOCKED: "#D99A2B" };

export function AnalyticsCharts({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <DistributionChart title="Bugs by Status" description="Current defect queue across every lifecycle stage." data={analytics.bugsByStatus} colors={statusColors} />
      <DistributionChart title="Bugs by Severity" description="Risk distribution for bug reports in your visible scope." data={analytics.bugsBySeverity} colors={severityColors} />
      <DistributionChart title="Test Case Results" description="Run outcomes; Not Run is excluded from the pass rate." data={analytics.testResults} colors={testColors} />
    </div>
  );
}
