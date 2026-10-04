import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isRequirementStatus, isTestCasePriority } from "@/lib/issueOptions";
import { canCreateRequirement, canViewRequirements } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

function ids(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger))] : [];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view requirements." }, { status: 401 });
  if (!canViewRequirements(user)) return NextResponse.json({ error: "You do not have permission to view requirements." }, { status: 403 });
  const requirements = await prisma.requirement.findMany({ orderBy: { updated_at: "desc" }, include: { _count: { select: { testCaseLinks: true, releaseLinks: true } } } });
  return NextResponse.json({ requirements });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to create requirements." }, { status: 401 });
  if (!canCreateRequirement(user)) return NextResponse.json({ error: "You do not have permission to create requirements." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const title = cleanText(body?.title, 180);
  const description = cleanText(body?.description, 3000);
  const feature_module = cleanText(body?.feature_module, 120) || "General";
  const priority = String(body?.priority ?? "MEDIUM");
  const status = String(body?.status ?? "DRAFT");
  const testCaseIds = ids(body?.test_case_ids);
  if (!title) return NextResponse.json({ error: "Requirement title is required." }, { status: 400 });
  if (!isTestCasePriority(priority) || !isRequirementStatus(status)) return NextResponse.json({ error: "Choose a valid priority and status." }, { status: 400 });
  const validCount = await prisma.testCase.count({ where: { id: { in: testCaseIds } } });
  if (validCount !== testCaseIds.length) return NextResponse.json({ error: "One or more selected test cases no longer exist." }, { status: 400 });
  const requirement = await prisma.requirement.create({ data: { title, description, feature_module, priority, status, created_by: user.id, testCaseLinks: { create: testCaseIds.map((test_case_id) => ({ test_case_id })) } } });
  return NextResponse.json({ requirement }, { status: 201 });
}
