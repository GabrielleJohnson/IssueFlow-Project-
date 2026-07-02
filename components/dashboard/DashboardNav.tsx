import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { isAdmin, isDeveloper, isTester } from "@/lib/permissions";

type DashboardNavProps = {
  user: {
    id: number;
    role: string;
  };
};

export function DashboardNav({ user }: DashboardNavProps) {
  const links = isAdmin(user)
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/issues", label: "Bug Reports" },
        { href: "/dashboard/test-cases", label: "Test Cases" },
        { href: "/dashboard#analytics", label: "Analytics" },
        { href: "/dashboard/users", label: "Users" }
      ]
    : isTester(user)
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/issues", label: "Bug Reports" },
          { href: "/dashboard/test-cases", label: "Test Cases" }
        ]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/issues?scope=assigned", label: "Assigned Bugs" },
          { href: "/dashboard/issues", label: "Bug Reports" }
        ];

  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/dashboard" className="font-display text-xl font-bold tracking-wide text-ivory">Issue<span className="text-coral">Flow</span></Link>
        <div className="hidden items-center gap-6 text-sm text-beige md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ivory">{link.label}</Link>
          ))}
        </div>
        <LogoutButton />
      </nav>
    </header>
  );
}

export function roleDashboardTitle(role: string) {
  if (role === "ADMIN") {
    return "Command center for QA operations.";
  }

  if (role === "DEVELOPER") {
    return "Assigned defects without the noise.";
  }

  return "QA coverage and defect flow in one place.";
}

export function roleDashboardDescription(role: string) {
  if (role === "ADMIN") {
    return "Monitor users, role mix, open defects, failed tests, and evidence volume from the same warm IssueFlow workspace.";
  }

  if (role === "DEVELOPER") {
    return "Focus on assigned and unassigned bug reports, update status, and review linked evidence and test context.";
  }

  return "Track test cases, failed runs, bug reports created from failed tests, and evidence uploads without leaving the QA workflow.";
}
