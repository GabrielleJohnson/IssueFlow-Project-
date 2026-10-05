import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel, issueStatuses } from "@/lib/issueOptions";
import { isDeveloper } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type AssignedIssuesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AssignedIssuesPage({
  searchParams,
}: AssignedIssuesPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isDeveloper(user)) {
    redirect("/dashboard/issues");
  }

  const { status } = await searchParams;
  const statusFilter =
    status && issueStatuses.includes(status as (typeof issueStatuses)[number])
      ? status
      : "";
  const issues = await prisma.issue.findMany({
    where: {
      assigned_to: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      updated_at: true,
      linkedTestCase: { select: { id: true, title: true, status: true } },
    },
  });

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="Developer"
          title="My Assigned Bugs"
          description="A focused queue of defects assigned to you, with reopened bugs called out as failed verification or regression work."
        />

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/dashboard/issues/assigned"
            className={`rounded-full border px-4 py-2 text-xs font-bold ${!statusFilter ? "border-coral bg-coral text-espresso" : "border-bronze text-beige hover:border-amber hover:text-amber"}`}
          >
            All
          </Link>
          {issueStatuses.map((option) => (
            <Link
              key={option}
              href={`/dashboard/issues/assigned?status=${option}`}
              className={`rounded-full border px-4 py-2 text-xs font-bold ${statusFilter === option ? "border-coral bg-coral text-espresso" : "border-bronze text-beige hover:border-amber hover:text-amber"}`}
            >
              {formatEnumLabel(option)}
            </Link>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5">
            <h2 className="font-display text-xl font-semibold">
              Assigned Defect Queue
            </h2>
            <p className="mt-1 text-sm text-beige">
              {issues.length} assigned bug reports match this view.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">Bug Report</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Linked Test</th>
                  <th className="px-5 py-4">Updated</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr className="border-t border-bronze/70">
                    <td className="px-5 py-8 text-beige" colSpan={6}>
                      No assigned bugs match this status.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr
                      key={issue.id}
                      className={
                        issue.status === "REOPENED"
                          ? "border-t border-ember/70 bg-ember/10"
                          : "border-t border-bronze/70"
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ivory">
                          IF-{issue.id.toString().padStart(4, "0")}
                        </p>
                        <p className="mt-1 max-w-md text-beige">
                          {issue.title}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={issue.severity} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={issue.status} />
                      </td>
                      <td className="px-5 py-4 text-beige">
                        {issue.linkedTestCase
                          ? `TC-${issue.linkedTestCase.id.toString().padStart(4, "0")}`
                          : "None"}
                      </td>
                      <td className="px-5 py-4 text-beige">
                        {new Date(issue.updated_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          className="font-semibold text-amber transition hover:text-coral"
                          href={`/dashboard/issues/${issue.id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
