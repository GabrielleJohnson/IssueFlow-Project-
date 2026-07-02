import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateIssue, canEditIssue, isDeveloper, issueWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type IssuesPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { scope } = await searchParams;
  const issues = await prisma.issue.findMany({
    where: issueWhereForUser(user),
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      environment: true,
      severity: true,
      status: true,
      created_by: true,
      assigned_to: true,
      updated_at: true,
      creator: { select: { username: true } },
      assignee: { select: { username: true } },
      linkedTestCase: { select: { id: true, title: true, status: true } }
    }
  });

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={isDeveloper(user) && scope === "assigned" ? "Assigned Bugs" : "Issues"}
            title="Bug Reports"
            description={isDeveloper(user) ? "Review assigned and unassigned defects, update status, and inspect evidence without changing QA-owned details." : "Track defects discovered during testing, separate from the QA scenarios used to verify expected behavior."}
          />
          {canCreateIssue(user) && (
            <Link href="/dashboard/issues/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
              Create Bug Report
            </Link>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5">
            <h2 className="font-display text-xl font-semibold">Defect Queue</h2>
            <p className="mt-1 text-sm text-beige">{issues.length} bug reports visible for your role.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">Bug Report</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Environment</th>
                  <th className="px-5 py-4">Failed Test</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr className="border-t border-bronze/70">
                    <td className="px-5 py-8 text-beige" colSpan={6}>No bug reports are visible for your role yet.</td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="border-t border-bronze/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ivory">IF-{issue.id.toString().padStart(4, "0")}</p>
                        <p className="mt-1 max-w-md text-beige">{issue.title}</p>
                      </td>
                      <td className="px-5 py-4"><Badge label={issue.severity} /></td>
                      <td className="px-5 py-4"><Badge label={issue.status} /></td>
                      <td className="px-5 py-4 text-beige">{issue.environment}</td>
                      <td className="px-5 py-4 text-beige">{issue.linkedTestCase ? `TC-${issue.linkedTestCase.id.toString().padStart(4, "0")}` : "None"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          <Link className="font-semibold text-amber transition hover:text-coral" href={`/dashboard/issues/${issue.id}`}>View</Link>
                          {(canEditIssue(user, issue) || isDeveloper(user)) && <Link className="font-semibold text-beige transition hover:text-ivory" href={`/dashboard/issues/${issue.id}/edit`}>Edit</Link>}
                        </div>
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
