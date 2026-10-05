import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { TestSuiteForm } from "@/components/test-management/TestSuiteForm";
import { getCurrentUser } from "@/lib/auth";
import { canCreateTestSuite } from "@/lib/permissions";
export default async function NewSuitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateTestSuite(user)) redirect("/dashboard");
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-3xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="New Test Suite"
          title="Assemble reusable regression coverage."
          description="Suite membership can evolve without changing the execution history of runs already started."
        />
        <div className="mt-8">
          <TestSuiteForm mode="create" />
        </div>
      </section>
    </main>
  );
}
