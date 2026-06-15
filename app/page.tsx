import Image from "next/image";
import Link from "next/link";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { LandingAnimations } from "@/components/landing/LandingAnimations";
import { severityBreakdown } from "@/data/mockData";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Report", href: "#report" },
  { label: "Test Cases", href: "#test-cases" },
  { label: "Analytics", href: "#analytics" }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <LandingAnimations />
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#hero" className="font-display text-xl font-bold tracking-wide text-ivory">
            Issue<span className="text-coral">Flow</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-beige md:flex">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-ivory">
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/login"
            className="rounded-full border border-coral/50 px-4 py-2 text-sm font-semibold text-ivory shadow-glow transition hover:bg-coral hover:text-espresso"
          >
            Log In
          </Link>
        </nav>
      </header>

      <section id="hero" className="relative flex min-h-screen items-center pt-24">
        <Image
          src="/issueflow-hero.png"
          alt="Abstract IssueFlow QA dashboard visualization"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-52"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/88 to-espresso/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-espresso to-transparent" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="hero-copy max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-bronze bg-clay/70 px-4 py-2 text-sm font-semibold text-amber">
              Built for testers, triage, and release confidence
            </p>
            <h1 className="font-display text-5xl font-bold leading-tight text-ivory sm:text-7xl">
              IssueFlow
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-beige sm:text-2xl">
              QA-focused issue tracking without the clutter.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-coral px-6 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
              >
                View Dashboard
              </Link>
              <a
                href="#test-cases"
                className="rounded-full border border-bronze bg-clay/80 px-6 py-3 text-center text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="hidden items-end justify-end lg:flex">
            <div className="gsap-reveal w-full max-w-sm rounded-lg border border-bronze bg-clay/84 p-5 shadow-card backdrop-blur">
              <div className="flex items-center justify-between border-b border-bronze pb-4">
                <span className="text-sm font-semibold text-beige">Release Pulse</span>
                <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-semibold text-sage">74% resolved</span>
              </div>
              <div className="mt-5 space-y-4">
                {severityBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-beige">{item.label}</span>
                      <span className="font-semibold text-ivory">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-espresso">
                      <div className="h-2 rounded-full" style={{ width: `${item.value * 5}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardContent />
    </main>
  );
}
