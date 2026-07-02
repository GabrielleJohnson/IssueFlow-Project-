import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateTestCase, canEditTestCase, isDeveloper } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const testCaseSelect = {
  id: true,
  title: true,
  description: true,
  feature_module: true,
  preconditions: true,
  test_steps: true,
  expected_result: true,
  actual_result: true,
  status: true,
  priority: true,
  created_by: true,
  linked_issue_id: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  linkedIssue: { select: { id: true, title: true, severity: true, status: true, created_by: true, assigned_to: true } }
};

export default async function TestCasesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const testCases = await prisma.testCase.findMany({
    where: isDeveloper(user) ? { linkedIssue: { is: { OR: [{ assigned_to: user.id }, { assigned_to: null }] } } } : {},
    orderBy: { updated_at: "desc" },
    select: testCaseSelect
  });

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Test Cases"
            title="QA Verification Scenarios"
            description={isDeveloper(user) ? "Developers can view test cases linked to visible bug reports for reproduction context." : "Test cases describe how expected behavior should be verified. Bug reports are created when a scenario fails."}
          />
          {canCreateTestCase(user) && (
            <Link href="/dashboard/test-cases/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">
              Create Test Case
            </Link>
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Scenario Library</h2>
              <p className="mt-1 text-sm text-beige">{testCases.length} QA scenarios visible for your role.</p>
            </div>
            <span className="text-sm font-semibold text-coral">QA coverage</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">Test Case</th>
                  <th className="px-5 py-4">Feature / Module</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Linked Bug Report</th>
                  <th className="px-5 py-4">Creator</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {testCases.length === 0 ? (
                  <tr className="border-t border-bronze/70">
                    <td className="px-5 py-8 text-beige" colSpan={7}>No test cases are visible for your role yet.</td>
                  </tr>
                ) : (
                  testCases.map((testCase) => (
                    <tr key={testCase.id} className="border-t border-bronze/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ivory">TC-{testCase.id.toString().padStart(4, "0")}</p>
                        <p className="mt-1 max-w-md text-beige">{testCase.title}</p>
                      </td>
                      <td className="px-5 py-4 text-beige">{testCase.feature_module}</td>
                      <td className="px-5 py-4"><Badge label={testCase.status} /></td>
                      <td className="px-5 py-4"><Badge label={testCase.priority} /></td>
                      <td className="px-5 py-4 text-beige">{testCase.linkedIssue ? `IF-${testCase.linkedIssue.id.toString().padStart(4, "0")}` : "None"}</td>
                      <td className="px-5 py-4 text-beige">{testCase.creator.username}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          <Link className="font-semibold text-amber transition hover:text-coral" href={`/dashboard/test-cases/${testCase.id}`}>View</Link>
                          {canEditTestCase(user, testCase) && <Link className="font-semibold text-beige transition hover:text-ivory" href={`/dashboard/test-cases/${testCase.id}/edit`}>Edit</Link>}
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
