import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isReleaseStatus } from "@/lib/issueOptions";
import { canDeleteRelease, canEditRelease, canViewReleases } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

type Params = { params: Promise<{ id: string }> };
async function readId(params: Params["params"]) { const id = Number((await params).id); return Number.isInteger(id) ? id : null; }
function ids(value: unknown) { return Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger))] : []; }
function targetDate(value: unknown, fallback: Date | null) { if (value === undefined) return fallback; if (!value) return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? undefined : date; }

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to view this release." }, { status: 401 });
  if (!canViewReleases(user)) return NextResponse.json({ error: "You do not have permission to view releases." }, { status: 403 });
  const id = await readId(params); if (!id) return NextResponse.json({ error: "Invalid release id." }, { status: 400 });
  const release = await prisma.release.findUnique({ where: { id }, include: { runs: true, requirements: { include: { requirement: true } } } });
  if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  return NextResponse.json({ release });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "You must be logged in to update releases." }, { status: 401 });
  const id = await readId(params); if (!id) return NextResponse.json({ error: "Invalid release id." }, { status: 400 });
  const existing = await prisma.release.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  if (!canEditRelease(user, existing)) return NextResponse.json({ error: "You do not have permission to update this release." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name ?? existing.name, 120);
  const description = cleanText(body?.description ?? existing.description, 3000);
  const status = String(body?.status ?? existing.status);
  const date = targetDate(body?.target_date, existing.target_date);
  const updateRuns = Array.isArray(body?.run_ids); const runIds = ids(body?.run_ids);
  const updateRequirements = Array.isArray(body?.requirement_ids); const requirementIds = ids(body?.requirement_ids);
  if (!name) return NextResponse.json({ error: "Release name or version is required." }, { status: 400 });
  if (!isReleaseStatus(status) || date === undefined) return NextResponse.json({ error: "Choose a valid release status and target date." }, { status: 400 });
  const [runCount, requirementCount] = await Promise.all([prisma.testRun.count({ where: { id: { in: runIds } } }), prisma.requirement.count({ where: { id: { in: requirementIds } } })]);
  if ((updateRuns && runCount !== runIds.length) || (updateRequirements && requirementCount !== requirementIds.length)) return NextResponse.json({ error: "One or more selected records no longer exist." }, { status: 400 });
  const release = await prisma.$transaction(async (tx) => {
    if (updateRuns) {
      await tx.testRun.updateMany({ where: { release_id: id, id: { notIn: runIds } }, data: { release_id: null } });
      if (runIds.length) await tx.testRun.updateMany({ where: { id: { in: runIds } }, data: { release_id: id } });
    }
    if (updateRequirements) {
      await tx.releaseRequirement.deleteMany({ where: { release_id: id } });
      if (requirementIds.length) await tx.releaseRequirement.createMany({ data: requirementIds.map((requirement_id) => ({ release_id: id, requirement_id })) });
    }
    return tx.release.update({ where: { id }, data: { name, description, status, target_date: date } });
  });
  return NextResponse.json({ release });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "You must be logged in to delete releases." }, { status: 401 });
  const id = await readId(params); if (!id) return NextResponse.json({ error: "Invalid release id." }, { status: 400 });
  const existing = await prisma.release.findUnique({ where: { id } }); if (!existing) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  if (!canDeleteRelease(user, existing)) return NextResponse.json({ error: "Only admins can delete releases." }, { status: 403 });
  await prisma.release.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
