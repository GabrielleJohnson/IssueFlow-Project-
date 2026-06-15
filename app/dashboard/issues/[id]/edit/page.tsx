import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IssueForm } from "@/components/issues/IssueForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

const issueSelect = {
  id: true,
  title: true,
  description: true,
  steps_to_reproduce: true,
  expected_result: true,
  actual_result: true,
  severity: true,
  status: true,
  created_by: true,
  assigned_to: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, email: true, role: true } },
  assignee: { select: { id: true, username: true, email: true, role: true } }
};

export default async function EditIssuePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    notFound();
  }

  const [issue, users] = await Promise.all([
    prisma.issue.findUnique({ where: { id: issueId }, select: issueSelect }),
    prisma.user.findMany({ orderBy: { username: "asc" }, select: { id: true, username: true, email: true, role: true } })
  ]);

  if (!issue) {
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
          eyebrow={`Edit IF-${issue.id.toString().padStart(4, "0")}`}
          title="Update issue details."
          description="Adjust severity, status, assignment, and reproduction notes while preserving the original QA-focused structure."
        />
        <div className="mt-10">
          <IssueForm mode="edit" issue={issue} users={users} />
        </div>
      </section>
    </main>
  );
}
