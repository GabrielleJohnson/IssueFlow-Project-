import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { TestCaseForm } from "@/components/test-cases/TestCaseForm";
import { getCurrentUser } from "@/lib/auth";
import { canCreateTestCase, issueWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NewTestCasePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canCreateTestCase(user)) {
    redirect("/dashboard/test-cases");
  }

  const issues = await prisma.issue.findMany({
    where: issueWhereForUser(user),
    orderBy: { updated_at: "desc" },
    select: { id: true, title: true, severity: true, status: true }
  });

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="Create Test Case"
          title="Document a QA verification scenario."
          description="Test cases define how expected behavior should be verified. Bug reports are created separately when a scenario fails."
        />
        <div className="mt-10">
          <TestCaseForm mode="create" issues={issues} />
        </div>
      </section>
    </main>
  );
}
