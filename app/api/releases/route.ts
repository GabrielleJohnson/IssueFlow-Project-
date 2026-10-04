import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isReleaseStatus } from "@/lib/issueOptions";
import { canCreateRelease, canViewReleases } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

function ids(value: unknown) { return Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger))] : []; }
function targetDate(value: unknown) { if (!value) return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? undefined : date; }

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view releases." }, { status: 401 });
  if (!canViewReleases(user)) return NextResponse.json({ error: "You do not have permission to view releases." }, { status: 403 });
  const releases = await prisma.release.findMany({ orderBy: { updated_at: "desc" }, include: { _count: { select: { runs: true, requirements: true } } } });
  return NextResponse.json({ releases });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to create releases." }, { status: 401 });
  if (!canCreateRelease(user)) return NextResponse.json({ error: "You do not have permission to create releases." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 120);
  const description = cleanText(body?.description, 3000);
  const status = String(body?.status ?? "PLANNING");
  const date = targetDate(body?.target_date);
  const runIds = ids(body?.run_ids);
  const requirementIds = ids(body?.requirement_ids);
  if (!name) return NextResponse.json({ error: "Release name or version is required." }, { status: 400 });
  if (!isReleaseStatus(status) || date === undefined) return NextResponse.json({ error: "Choose a valid release status and target date." }, { status: 400 });
  const [runCount, requirementCount] = await Promise.all([prisma.testRun.count({ where: { id: { in: runIds } } }), prisma.requirement.count({ where: { id: { in: requirementIds } } })]);
  if (runCount !== runIds.length || requirementCount !== requirementIds.length) return NextResponse.json({ error: "One or more selected records no longer exist." }, { status: 400 });
  const release = await prisma.$transaction(async (tx) => {
    const created = await tx.release.create({ data: { name, description, status, target_date: date, created_by: user.id, requirements: { create: requirementIds.map((requirement_id) => ({ requirement_id })) } } });
    if (runIds.length) await tx.testRun.updateMany({ where: { id: { in: runIds } }, data: { release_id: created.id } });
    return created;
  });
  return NextResponse.json({ release }, { status: 201 });
}
