import { notFound, redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { TestSuiteForm } from "@/components/test-management/TestSuiteForm";
import { getCurrentUser } from "@/lib/auth";
import { canEditTestSuite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
type Props={params:Promise<{id:string}>};export default async function EditSuitePage({params}:Props){const user=await getCurrentUser();if(!user)redirect("/login");const id=Number((await params).id);if(!Number.isInteger(id))notFound();const suite=await prisma.testSuite.findUnique({where:{id}});if(!suite)notFound();if(!canEditTestSuite(user,suite))redirect(`/dashboard/test-suites/${id}`);return <main className="min-h-screen bg-espresso text-ivory"><DashboardNav user={user}/><section className="mx-auto max-w-3xl px-5 pb-20 pt-32 sm:px-8"><SectionHeader eyebrow="Edit Test Suite" title={suite.name} description="Membership is managed from the suite detail page."/><div className="mt-8"><TestSuiteForm mode="edit" suite={suite}/></div></section></main>}
