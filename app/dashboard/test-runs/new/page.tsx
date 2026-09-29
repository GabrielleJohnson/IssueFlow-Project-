import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { TestRunForm } from "@/components/test-management/TestRunForm";
import { getCurrentUser } from "@/lib/auth";
import { canCreateTestRun } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
type Props={searchParams:Promise<{suite?:string}>};export default async function NewRunPage({searchParams}:Props){const user=await getCurrentUser();if(!user)redirect("/login");if(!canCreateTestRun(user))redirect("/dashboard");const initial=Number((await searchParams).suite);const suites=await prisma.testSuite.findMany({orderBy:{updated_at:"desc"},include:{_count:{select:{memberships:true}}}});return <main className="min-h-screen bg-espresso text-ivory"><DashboardNav user={user}/><section className="mx-auto max-w-4xl px-5 pb-20 pt-32 sm:px-8"><SectionHeader eyebrow="New Execution Session" title="Start a Test Run" description="The suite definition is copied into an immutable execution set when this run starts."/><div className="mt-8"><TestRunForm suites={suites.map(s=>({id:s.id,name:s.name,count:s._count.memberships}))} initialSuiteId={Number.isInteger(initial)?initial:undefined}/></div></section></main>}
