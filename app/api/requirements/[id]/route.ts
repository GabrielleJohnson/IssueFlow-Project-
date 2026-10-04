import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isRequirementStatus, isTestCasePriority } from "@/lib/issueOptions";
import { canDeleteRequirement, canEditRequirement, canViewRequirements } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

type Params = { params: Promise<{ id: string }> };
async function readId(params: Params["params"]) { const id = Number((await params).id); return Number.isInteger(id) ? id : null; }
function ids(value: unknown) { return Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger))] : []; }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view this requirement." }, { status: 401 });
  if (!canViewRequirements(user)) return NextResponse.json({ error: "You do not have permission to view requirements." }, { status: 403 });
  const id = await readId(params);
  if (!id) return NextResponse.json({ error: "Invalid requirement id." }, { status: 400 });
  const requirement = await prisma.requirement.findUnique({ where: { id }, include: { creator: { select: { id: true, username: true } }, testCaseLinks: { include: { testCase: true } }, releaseLinks: { include: { release: true } } } });
  if (!requirement) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
  return NextResponse.json({ requirement });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to update requirements." }, { status: 401 });
  const id = await readId(params);
  if (!id) return NextResponse.json({ error: "Invalid requirement id." }, { status: 400 });
  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
  if (!canEditRequirement(user, existing)) return NextResponse.json({ error: "You do not have permission to update this requirement." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const title = cleanText(body?.title ?? existing.title, 180);
  const description = cleanText(body?.description ?? existing.description, 3000);
  const feature_module = cleanText(body?.feature_module ?? existing.feature_module, 120) || "General";
  const priority = String(body?.priority ?? existing.priority);
  const status = String(body?.status ?? existing.status);
  if (!title) return NextResponse.json({ error: "Requirement title is required." }, { status: 400 });
  if (!isTestCasePriority(priority) || !isRequirementStatus(status)) return NextResponse.json({ error: "Choose a valid priority and status." }, { status: 400 });
  const updateLinks = Array.isArray(body?.test_case_ids);
  const testCaseIds = ids(body?.test_case_ids);
  if (updateLinks && await prisma.testCase.count({ where: { id: { in: testCaseIds } } }) !== testCaseIds.length) return NextResponse.json({ error: "One or more selected test cases no longer exist." }, { status: 400 });
  const requirement = await prisma.$transaction(async (tx) => {
    if (updateLinks) {
      await tx.requirementTestCase.deleteMany({ where: { requirement_id: id } });
      if (testCaseIds.length) await tx.requirementTestCase.createMany({ data: testCaseIds.map((test_case_id) => ({ requirement_id: id, test_case_id })) });
    }
    return tx.requirement.update({ where: { id }, data: { title, description, feature_module, priority, status } });
  });
  return NextResponse.json({ requirement });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to delete requirements." }, { status: 401 });
  const id = await readId(params);
  if (!id) return NextResponse.json({ error: "Invalid requirement id." }, { status: 400 });
  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
  if (!canDeleteRequirement(user, existing)) return NextResponse.json({ error: "Only admins can delete requirements." }, { status: 403 });
  await prisma.requirement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
