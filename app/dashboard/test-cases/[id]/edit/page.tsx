import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SectionHeader } from "@/components/SectionHeader";
import { TestCaseForm } from "@/components/test-cases/TestCaseForm";
import { getCurrentUser } from "@/lib/auth";
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
  linkedIssue: { select: { id: true, title: true, severity: true, status: true } }
};

export default async function EditTestCasePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const testCaseId = Number(id);

  if (!Number.isInteger(testCaseId)) {
    notFound();
  }

  const [testCase, issues] = await Promise.all([
    prisma.testCase.findUnique({ where: { id: testCaseId }, select: testCaseSelect }),
    prisma.issue.findMany({ orderBy: { updated_at: "desc" }, select: { id: true, title: true, severity: true, status: true } })
  ]);

  if (!testCase) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/dashboard" className="font-display text-xl font-bold tracking-wide text-ivory">Issue<span className="text-coral">Flow</span></Link>
          <LogoutButton />
        </nav>
      </header>
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow={`Edit TC-${testCase.id.toString().padStart(4, "0")}`}
          title="Update QA scenario details."
          description="Test cases define verification steps. Link a bug report only when the scenario exposes a defect."
        />
        <div className="mt-10">
          <TestCaseForm mode="edit" testCase={testCase} issues={issues} />
        </div>
      </section>
    </main>
  );
}
