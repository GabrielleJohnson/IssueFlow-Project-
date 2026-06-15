import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-wide text-ivory">
            Issue<span className="text-coral">Flow</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-beige md:flex">
            <a href="#dashboard" className="transition hover:text-ivory">Dashboard</a>
            <a href="#report" className="transition hover:text-ivory">Report</a>
            <a href="#test-cases" className="transition hover:text-ivory">Test Cases</a>
            <a href="#analytics" className="transition hover:text-ivory">Analytics</a>
          </div>
          <LogoutButton />
        </nav>
      </header>
      <DashboardContent
        includeTopPadding
        user={{ username: user.username, email: user.email }}
      />
    </main>
  );
}

