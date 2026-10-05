import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RequirementForm } from "@/components/requirements/RequirementForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateRequirement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
export default async function NewRequirementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canCreateRequirement(user)) redirect("/dashboard");
  const testCases = await prisma.testCase.findMany({
    orderBy: { updated_at: "desc" },
    select: { id: true, title: true, feature_module: true },
  });
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="QA Coverage"
          title="Create Requirement"
          description="Capture the behavior QA must verify and link its executable scenarios."
        />
        <div className="mt-8">
          <RequirementForm testCases={testCases} />
        </div>
      </section>
    </main>
  );
}
