import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ReleaseForm } from "@/components/releases/ReleaseForm";
import { SectionHeader } from "@/components/SectionHeader";
import { getCurrentUser } from "@/lib/auth";
import { canCreateRelease } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
export default async function NewReleasePage(){const user=await getCurrentUser();if(!user)redirect("/login");if(!canCreateRelease(user))redirect("/dashboard");const [requirements,runs]=await Promise.all([prisma.requirement.findMany({orderBy:{updated_at:"desc"},select:{id:true,title:true,feature_module:true}}),prisma.testRun.findMany({orderBy:{started_at:"desc"},select:{id:true,suite_name:true,release_label:true,environment:true,release_id:true}})]);return <main className="min-h-screen bg-espresso text-ivory"><DashboardNav user={user}/><section className="mx-auto max-w-5xl px-5 pb-20 pt-32 sm:px-8"><SectionHeader eyebrow="Release Readiness" title="Create QA Release" description="Define the intended Requirement scope and connect existing Test Runs without duplicating their execution history."/><div className="mt-8"><ReleaseForm requirements={requirements} runs={runs}/></div></section></main>}
