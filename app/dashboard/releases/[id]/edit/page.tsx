import { notFound, redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ReleaseForm } from "@/components/releases/ReleaseForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canEditRelease } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
type Props = { params: Promise<{ id: string }> };
export default async function EditReleasePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [release, requirements, runs] = await Promise.all([
    prisma.release.findUnique({
      where: { id },
      include: { requirements: true, runs: { select: { id: true } } },
    }),
    prisma.requirement.findMany({
      orderBy: { updated_at: "desc" },
      select: { id: true, title: true, feature_module: true },
    }),
    prisma.testRun.findMany({
      orderBy: { started_at: "desc" },
      select: {
        id: true,
        suite_name: true,
        release_label: true,
        environment: true,
        release_id: true,
      },
    }),
  ]);
  if (!release) notFound();
  if (!canEditRelease(user, release)) redirect("/dashboard");
  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow={`Release RL-${String(id).padStart(4, "0")}`}
          title="Edit QA Release"
          description="Update metadata, Requirement scope, or associated Test Runs."
        />
        <div className="mt-8">
          <ReleaseForm
            requirements={requirements}
            runs={runs}
            initial={{
              id,
              name: release.name,
              description: release.description,
              status: release.status,
              targetDate: release.target_date?.toISOString().slice(0, 10) ?? "",
              requirementIds: release.requirements.map(
                (item) => item.requirement_id,
              ),
              runIds: release.runs.map((item) => item.id),
            }}
          />
        </div>
      </section>
    </main>
  );
}
