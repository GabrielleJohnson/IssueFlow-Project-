import { notFound, redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RequirementForm } from "@/components/requirements/RequirementForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canEditRequirement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
type Props = { params: Promise<{ id: string }> };
export default async function EditRequirementPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [requirement, testCases] = await Promise.all([
    prisma.requirement.findUnique({
      where: { id },
      include: { testCaseLinks: true },
    }),
    prisma.testCase.findMany({
      orderBy: { updated_at: "desc" },
      select: { id: true, title: true, feature_module: true },
    }),
  ]);
  if (!requirement) notFound();
  if (!canEditRequirement(user, requirement)) redirect("/dashboard");
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-4xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow={`REQ-${String(id).padStart(4, "0")}`}
          title="Edit Requirement"
          description="Update the requirement definition and its current Test Case traceability."
        />
        <div className="mt-8">
          <RequirementForm
            testCases={testCases}
            initial={{
              id,
              title: requirement.title,
              description: requirement.description,
              feature_module: requirement.feature_module,
              priority: requirement.priority,
              status: requirement.status,
              testCaseIds: requirement.testCaseLinks.map(
                (item) => item.test_case_id,
              ),
            }}
          />
        </div>
      </section>
    </main>
  );
}
