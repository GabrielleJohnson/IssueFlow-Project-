import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IssueDashboard } from "@/components/issues/IssueDashboard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const issues = await prisma.issue.findMany({
    orderBy: { updated_at: "desc" },
    take: 12,
    select: issueSelect
  });

  const stats = {
    open: await prisma.issue.count({ where: { status: "OPEN" } }),
    inProgress: await prisma.issue.count({ where: { status: "IN_PROGRESS" } }),
    resolved: await prisma.issue.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
    critical: await prisma.issue.count({ where: { severity: "CRITICAL" } }),
    total: await prisma.issue.count()
  };

  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-wide text-ivory">
            Issue<span className="text-coral">Flow</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-beige md:flex">
            <a href="#dashboard" className="transition hover:text-ivory">Dashboard</a>
            <Link href="/dashboard/issues/new" className="transition hover:text-ivory">Create Issue</Link>
            <a href="#analytics" className="transition hover:text-ivory">Analytics</a>
          </div>
          <LogoutButton />
        </nav>
      </header>
      <IssueDashboard issues={issues} stats={stats} user={user} />
    </main>
  );
}
