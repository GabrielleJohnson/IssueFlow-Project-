import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { DeleteTestCaseButton } from "@/components/test-cases/DeleteTestCaseButton";
import { getCurrentUser } from "@/lib/auth";
import { canCreateIssue, canDeleteTestCase, canEditTestCase, canViewTestCase } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function TestCaseDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const testCaseId = Number(id);

  if (!Number.isInteger(testCaseId)) {
    notFound();
  }

  const testCase = await prisma.testCase.findUnique({ where: { id: testCaseId }, select: testCaseSelect });

  if (!testCase || !canViewTestCase(user, testCase)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={`TC-${testCase.id.toString().padStart(4, "0")}`}
            title={testCase.title}
            description={testCase.description}
          />
          <div className="flex flex-wrap gap-3">
            {canEditTestCase(user, testCase) && <Link href={`/dashboard/test-cases/${testCase.id}/edit`} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">Edit Test Case</Link>}
            <Link href="/dashboard/test-cases" className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">Back to Test Cases</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Status</p><div className="mt-3"><Badge label={testCase.status} /></div></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Priority</p><div className="mt-3"><Badge label={testCase.priority} /></div></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Feature / module</p><p className="mt-2 font-semibold text-ivory">{testCase.feature_module}</p></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Linked bug report</p>{testCase.linkedIssue ? <Link className="mt-2 block font-semibold text-amber transition hover:text-coral" href={`/dashboard/issues/${testCase.linkedIssue.id}`}>IF-{testCase.linkedIssue.id.toString().padStart(4, "0")}</Link> : <p className="mt-2 font-semibold text-ivory">None</p>}</article>
        </div>

        {testCase.status === "FAILED" && canCreateIssue(user) && (
          <div className="mt-8 rounded-lg border border-ember/40 bg-ember/15 p-5 shadow-card">
            <h2 className="font-display text-xl font-semibold text-ivory">Failed test can become a bug report</h2>
            <p className="mt-2 text-sm leading-6 text-beige">This opens a bug report form prefilled from the failed QA scenario.</p>
            <Link href={`/dashboard/issues/new?fromTestCase=${testCase.id}`} className="mt-5 inline-flex rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber">
              Create Bug Report from Failed Test
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            ["Preconditions", testCase.preconditions],
            ["Test steps", testCase.test_steps],
            ["Expected result", testCase.expected_result],
            ["Actual result", testCase.actual_result],
            ["Timeline", `Created ${new Date(testCase.created_at).toLocaleString()}\nUpdated ${new Date(testCase.updated_at).toLocaleString()}`]
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold text-ivory">{label}</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-beige">{value}</p>
            </article>
          ))}
        </div>

        {canDeleteTestCase(user, testCase) && (
          <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
            <p className="mb-4 text-sm text-beige">Admin-only destructive action.</p>
            <DeleteTestCaseButton testCaseId={testCase.id} />
          </div>
        )}
      </section>
    </main>
  );
}
