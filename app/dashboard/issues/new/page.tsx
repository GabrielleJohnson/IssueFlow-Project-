import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IssueForm } from "@/components/issues/IssueForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewIssuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, email: true, role: true }
  });

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
          eyebrow="Create Issue"
          title="Capture a real database-backed defect."
          description="Use the same QA-focused fields from the original mock form, now persisted to SQLite and tied to your logged-in account."
        />
        <div className="mt-10">
          <IssueForm mode="create" users={users} />
        </div>
      </section>
    </main>
  );
}
