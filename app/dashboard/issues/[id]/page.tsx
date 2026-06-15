import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/Badge";
import { DeleteIssueButton } from "@/components/issues/DeleteIssueButton";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/issueOptions";
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

export default async function IssueDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const issueId = Number(id);

  if (!Number.isInteger(issueId)) {
    notFound();
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: issueSelect });

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
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow={`IF-${issue.id.toString().padStart(4, "0")}`}
            title={issue.title}
            description={issue.description}
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/issues/${issue.id}/edit`} className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber">Edit Issue</Link>
            <Link href="/dashboard" className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber">Back to Dashboard</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Severity</p><div className="mt-3"><Badge label={issue.severity} /></div></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Status</p><div className="mt-3"><Badge label={issue.status} /></div></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Created by</p><p className="mt-2 font-semibold text-ivory">{issue.creator.username}</p><p className="text-sm text-beige">{formatEnumLabel(issue.creator.role)}</p></article>
          <article className="rounded-lg border border-bronze bg-clay p-4 shadow-card"><p className="text-sm text-beige">Assigned to</p><p className="mt-2 font-semibold text-ivory">{issue.assignee?.username ?? "Unassigned"}</p></article>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            ["Steps to reproduce", issue.steps_to_reproduce],
            ["Expected result", issue.expected_result],
            ["Actual result", issue.actual_result],
            ["Timeline", `Created ${new Date(issue.created_at).toLocaleString()}\nUpdated ${new Date(issue.updated_at).toLocaleString()}`]
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold text-ivory">{label}</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-beige">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-bronze bg-clay p-5 shadow-card">
          <p className="mb-4 text-sm text-beige">Delete is intentionally isolated so it can be hidden or admin-gated later.</p>
          <DeleteIssueButton issueId={issue.id} />
        </div>
      </section>
    </main>
  );
}
