import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ListPagination } from "@/components/productivity/ListPagination";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canViewTestManagement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { testSuiteReference } from "@/lib/testManagement";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] ?? "" : input ?? ""; }

export default async function TestSuitesPage({ searchParams }: Props) {
  const user = await getCurrentUser(); if (!user) redirect("/login"); if (!canViewTestManagement(user)) redirect("/dashboard");
  const raw = await searchParams; const q = value(raw.q).trim().slice(0, 120); const sort = value(raw.sort) === "oldest" ? "oldest" : "updated"; const requestedPage = Math.max(Number(value(raw.page)) || 1, 1); const pageSize = [10,25,50].includes(Number(value(raw.pageSize))) ? Number(value(raw.pageSize)) : 10;
  const where = q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {};
  const total = await prisma.testSuite.count({ where }); const totalPages = Math.max(Math.ceil(total / pageSize), 1); const page = Math.min(requestedPage, totalPages);
  const suites = await prisma.testSuite.findMany({ where, orderBy: [{ updated_at: sort === "oldest" ? "asc" : "desc" }, { id: sort === "oldest" ? "asc" : "desc" }], skip: (page-1)*pageSize, take: pageSize, include: { creator: { select: { username: true } }, _count: { select: { memberships: true, runs: true } } } });
  const params = new URLSearchParams(); if(q) params.set("q",q); if(sort!=="updated") params.set("sort",sort); if(pageSize!==10) params.set("pageSize",String(pageSize)); if(page>1) params.set("page",String(page)); const statePath=params.size?`/dashboard/test-suites?${params}`:"/dashboard/test-suites";
  function pageHref(nextPage:number){const next=new URLSearchParams(params);if(nextPage>1)next.set("page",String(nextPage));else next.delete("page");return next.size?`/dashboard/test-suites?${next}`:"/dashboard/test-suites";}
  return <main className="min-h-screen bg-espresso text-ivory"><DashboardNav user={user}/><section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><SectionHeader eyebrow="Test Management" title="Test Suites" description="Group reusable QA scenarios into focused regression coverage."/><Link href="/dashboard/test-suites/new" className="rounded-full bg-coral px-5 py-3 text-center text-sm font-bold text-espresso">Create Suite</Link></div>
    <form key={statePath} method="get" className="mt-8 grid gap-4 rounded-lg border border-bronze bg-clay p-5 shadow-card sm:grid-cols-[1fr_220px_auto]"><label><span className="mb-2 block text-sm font-semibold text-beige">Search suites</span><input className="field" name="q" defaultValue={q} placeholder="Suite name or purpose"/></label><label><span className="mb-2 block text-sm font-semibold text-beige">Sort</span><select className="field" name="sort" defaultValue={sort}><option value="updated">Recently updated</option><option value="oldest">Oldest first</option></select></label><div className="flex items-end gap-3"><button className="rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso">Apply</button>{params.size>0&&<Link href="/dashboard/test-suites" className="pb-3 text-sm font-semibold text-amber">Reset</Link>}</div></form>
    <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card"><div className="border-b border-bronze p-5"><h2 className="font-display text-xl font-semibold">Suite Library</h2><p className="mt-1 text-sm text-beige">{total} {total===1?"suite":"suites"}</p></div>{suites.length===0?<p className="p-6 text-sm text-beige">{q?"No suites match this search.":"No test suites yet. Create one to organize reusable coverage."}</p>:<div className="divide-y divide-bronze/70">{suites.map(suite=><Link key={suite.id} href={`/dashboard/test-suites/${suite.id}`} className="grid gap-3 p-5 transition hover:bg-espresso/35 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber">{testSuiteReference(suite.id)}</p><h3 className="mt-1 font-semibold text-ivory">{suite.name}</h3><p className="mt-1 text-sm text-beige">{suite.description||"No description"} · {suite.creator.username}</p></div><span className="text-sm text-beige">{suite._count.memberships} cases</span><span className="text-sm text-beige">{suite._count.runs} runs</span></Link>)}</div>}<ListPagination page={page} total={total} totalPages={totalPages} from={total?(page-1)*pageSize+1:0} to={total?Math.min(page*pageSize,total):0} hrefForPage={pageHref}/></div>
  </section></main>;
}
