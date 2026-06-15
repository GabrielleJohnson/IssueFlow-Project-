import Image from "next/image";
import { Badge } from "@/components/Badge";
import { SectionHeader } from "@/components/SectionHeader";
import { issues, overviewStats, severityBreakdown, testCases } from "@/data/mockData";

const navItems = ["Dashboard", "Report", "Test Cases", "Analytics"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-espresso text-ivory">
      <header className="fixed left-0 right-0 top-0 z-20 border-b border-bronze/70 bg-espresso/78 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#hero" className="font-display text-xl font-bold tracking-wide text-ivory">
            Issue<span className="text-coral">Flow</span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-beige md:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="transition hover:text-ivory">
                {item}
              </a>
            ))}
          </div>
          <a
            href="#report"
            className="rounded-full border border-coral/50 px-4 py-2 text-sm font-semibold text-ivory shadow-glow transition hover:bg-coral hover:text-espresso"
          >
            New Bug
          </a>
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
          <div className="max-w-3xl">
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
              <a
                href="#dashboard"
                className="rounded-full bg-coral px-6 py-3 text-center text-sm font-bold text-espresso shadow-glow transition hover:bg-amber"
              >
                View Dashboard
              </a>
              <a
                href="#test-cases"
                className="rounded-full border border-bronze bg-clay/80 px-6 py-3 text-center text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="hidden items-end justify-end lg:flex">
            <div className="w-full max-w-sm rounded-lg border border-bronze bg-clay/84 p-5 shadow-card backdrop-blur">
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

      <section id="dashboard" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeader
          eyebrow="Dashboard"
          title="Fast triage for every defect that matters."
          description="IssueFlow keeps high-signal QA context visible: severity, linked test coverage, owners, and the release risk behind each issue."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <article key={stat.label} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <p className="text-sm text-beige">{stat.label}</p>
              <div className="mt-4 flex items-end justify-between">
                <strong className="font-display text-4xl text-ivory">{stat.value}</strong>
                <span className="text-right text-xs font-semibold text-amber">{stat.delta}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="flex flex-col gap-2 border-b border-bronze p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold">Recent Issues</h3>
              <p className="mt-1 text-sm text-beige">Evidence-ready defects pulled from the latest regression cycle.</p>
            </div>
            <span className="text-sm font-semibold text-coral">Sprint 22 QA board</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">Issue</th>
                  <th className="px-5 py-4">Area</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Test Case</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-t border-bronze/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ivory">{issue.id}</p>
                      <p className="mt-1 max-w-md text-beige">{issue.title}</p>
                    </td>
                    <td className="px-5 py-4 text-beige">{issue.area}</td>
                    <td className="px-5 py-4"><Badge label={issue.severity} /></td>
                    <td className="px-5 py-4"><Badge label={issue.status} /></td>
                    <td className="px-5 py-4 text-beige">{issue.owner}</td>
                    <td className="px-5 py-4 font-semibold text-amber">{issue.testCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="report" className="border-y border-bronze bg-[#18120f] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader
            eyebrow="Bug Reporting"
            title="Capture reproduction detail while it is still fresh."
            description="The form favors tester language: what happened, what should have happened, how to reproduce it, and which test case exposed the defect."
          />
          <form className="grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-beige">Bug title</span>
              <input className="field" placeholder="Cart badge count doubles after item removal" />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-beige">Description</span>
              <textarea className="field min-h-24" placeholder="A concise summary of the defect and affected workflow." />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-beige">Steps to reproduce</span>
              <textarea className="field min-h-28" placeholder="1. Add two items to cart&#10;2. Remove one item&#10;3. Refresh checkout summary" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">Expected result</span>
              <textarea className="field min-h-24" placeholder="Cart badge reflects the current item count." />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">Actual result</span>
              <textarea className="field min-h-24" placeholder="Badge increments and persists after refresh." />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">Severity</span>
              <select className="field" defaultValue="High">
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-beige">Status</span>
              <select className="field" defaultValue="Open">
                <option>Open</option>
                <option>In Progress</option>
                <option>Ready for QA</option>
                <option>Resolved</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-beige">Related test case</span>
              <select className="field" defaultValue="TC-084">
                {testCases.map((test) => (
                  <option key={test.id}>{test.id} - {test.name}</option>
                ))}
              </select>
            </label>
            <button className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso transition hover:bg-amber sm:col-span-2">
              Save Mock Bug Report
            </button>
          </form>
        </div>
      </section>

      <section id="test-cases" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeader
          eyebrow="Test Cases"
          title="Failures stay connected to the bugs they reveal."
          description="A focused test case view helps small QA teams trace every failed check back to a specific issue, suite, and latest run."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {testCases.map((test) => (
            <article key={test.id} className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber">{test.id}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ivory">{test.name}</h3>
                </div>
                <Badge label={test.status} />
              </div>
              <div className="mt-6 grid gap-3 text-sm text-beige sm:grid-cols-3">
                <span>{test.suite}</span>
                <span>{test.lastRun}</span>
                <span className="font-semibold text-coral">{test.linkedIssue ?? "No defect linked"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="analytics" className="bg-[#18120f] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Analytics"
            title="Readable QA signals without a reporting maze."
            description="Simple visual cards make severity mix, resolution progress, and failing coverage obvious during release conversations."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Bugs by Severity</h3>
              <div className="mt-6 space-y-4">
                {severityBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex justify-between text-sm text-beige">
                      <span>{item.label}</span>
                      <span>{item.value} bugs</span>
                    </div>
                    <div className="h-3 rounded-full bg-espresso">
                      <div className="h-3 rounded-full" style={{ width: `${item.value * 5}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Resolution Progress</h3>
              <div className="mt-8 flex items-center justify-center">
                <div className="grid h-44 w-44 place-items-center rounded-full border-[18px] border-sage bg-espresso shadow-glow">
                  <div className="text-center">
                    <p className="font-display text-4xl font-bold text-ivory">74%</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-beige">Resolved</p>
                  </div>
                </div>
              </div>
            </article>
            <article className="rounded-lg border border-bronze bg-clay p-5 shadow-card">
              <h3 className="font-display text-xl font-semibold">Failed Test Cases</h3>
              <div className="mt-6 space-y-3">
                {testCases.filter((test) => test.status !== "Pass").map((test) => (
                  <div key={test.id} className="flex items-center justify-between rounded-lg border border-bronze bg-espresso/60 p-3">
                    <div>
                      <p className="font-semibold text-ivory">{test.id}</p>
                      <p className="mt-1 text-sm text-beige">{test.linkedIssue}</p>
                    </div>
                    <Badge label={test.status} />
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
