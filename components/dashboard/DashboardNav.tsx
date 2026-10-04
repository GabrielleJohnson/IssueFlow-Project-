"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { isAdmin, isDeveloper, isTester } from "@/lib/permissions";

type DashboardNavProps = {
  user: {
    id: number;
    role: string;
  };
};

function dashboardLinks(user: DashboardNavProps["user"]) {
  return isAdmin(user)
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/issues", label: "Bug Reports" },
        { href: "/dashboard/test-cases", label: "Test Cases" },
        { href: "/dashboard/test-suites", label: "Suites" },
        { href: "/dashboard/test-runs", label: "Runs" },
        { href: "/dashboard/requirements", label: "Coverage" },
        { href: "/dashboard/releases", label: "Releases" },
        { href: "/dashboard/analytics", label: "Analytics" },
        { href: "/dashboard/users", label: "Users" }
      ]
    : isTester(user)
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/issues", label: "Bug Reports" },
          { href: "/dashboard/test-cases", label: "Test Cases" },
          { href: "/dashboard/test-suites", label: "Suites" },
          { href: "/dashboard/test-runs", label: "Runs" },
          { href: "/dashboard/requirements", label: "Coverage" },
          { href: "/dashboard/releases", label: "Releases" },
          { href: "/dashboard/analytics", label: "Analytics" }
        ]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/issues/assigned", label: "Assigned Bugs" },
          { href: "/dashboard/issues", label: "Bug Reports" },
          { href: "/dashboard/analytics", label: "Analytics" }
        ];
}
function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function DashboardNav({ user }: DashboardNavProps) {
  const links = dashboardLinks(user);
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/dashboard" onClick={() => setIsOpen(false)} className="font-display text-xl font-bold tracking-wide text-ivory">Issue<span className="text-coral">Flow</span></Link>
        <div data-testid="desktop-dashboard-navigation" className="hidden items-center gap-4 text-xs text-beige xl:flex 2xl:gap-5 2xl:text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isCurrentRoute(pathname, link.href) ? "page" : undefined} className={`transition hover:text-ivory ${isCurrentRoute(pathname, link.href) ? "font-semibold text-coral" : ""}`}>{link.label}</Link>
          ))}
        </div>
        <div className="hidden xl:block"><LogoutButton /></div>
        <button
          ref={triggerRef}
          type="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          aria-controls="mobile-dashboard-navigation"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full border border-bronze text-ivory transition hover:border-coral hover:text-coral xl:hidden"
        >
          <span className={`h-0.5 w-4 bg-current transition ${isOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-4 bg-current transition ${isOpen ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-4 bg-current transition ${isOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </nav>
      {isOpen && (
        <>
          <button type="button" aria-label="Close navigation" onClick={() => setIsOpen(false)} className="fixed inset-0 top-[73px] z-20 bg-black/55 backdrop-blur-sm xl:hidden" />
          <div ref={panelRef} id="mobile-dashboard-navigation" data-testid="mobile-dashboard-navigation" className="absolute left-0 right-0 top-full z-30 max-h-[calc(100vh-73px)] overflow-y-auto border-b border-bronze bg-clay px-5 py-5 shadow-card sm:px-8 xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {links.map((link) => {
                const current = isCurrentRoute(pathname, link.href);
                return <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} aria-current={current ? "page" : undefined} className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${current ? "border-coral/50 bg-coral/10 text-coral" : "border-transparent text-beige hover:border-bronze hover:bg-espresso/45 hover:text-ivory"}`}>{link.label}</Link>;
              })}
              <div className="mt-3 border-t border-bronze pt-4"><LogoutButton /></div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
