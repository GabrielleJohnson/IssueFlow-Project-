import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canEditRelease } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
async function context(request: NextRequest, params: Params["params"]) {
  const user = await getCurrentUser(); if (!user) return { error: NextResponse.json({ error: "You must be logged in to manage release runs." }, { status: 401 }) };
  const id = Number((await params).id); const release = Number.isInteger(id) ? await prisma.release.findUnique({ where: { id } }) : null;
  if (!release) return { error: NextResponse.json({ error: "Release not found." }, { status: 404 }) };
  if (!canEditRelease(user, release)) return { error: NextResponse.json({ error: "You do not have permission to manage release runs." }, { status: 403 }) };
  const body = await request.json().catch(() => null); const runId = Number(body?.run_id);
  if (!Number.isInteger(runId)) return { error: NextResponse.json({ error: "A valid test run is required." }, { status: 400 }) };
  return { release, runId };
}
export async function POST(request: NextRequest, { params }: Params) { const result = await context(request, params); if ("error" in result) return result.error; if (!await prisma.testRun.findUnique({ where: { id: result.runId } })) return NextResponse.json({ error: "Test run not found." }, { status: 404 }); await prisma.testRun.update({ where: { id: result.runId }, data: { release_id: result.release.id } }); return NextResponse.json({ ok: true }); }
export async function DELETE(request: NextRequest, { params }: Params) { const result = await context(request, params); if ("error" in result) return result.error; const run = await prisma.testRun.findUnique({ where: { id: result.runId } }); if (!run || run.release_id !== result.release.id) return NextResponse.json({ error: "That test run is not associated with this release." }, { status: 404 }); await prisma.testRun.update({ where: { id: result.runId }, data: { release_id: null } }); return NextResponse.json({ ok: true }); }
