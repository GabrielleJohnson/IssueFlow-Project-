import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canDeleteTestRun, canViewTestManagement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

type Params = { params: Promise<{ id: string }> };
async function runId(params: Params["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) ? id : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to view this test run." },
      { status: 401 },
    );
  if (!canViewTestManagement(user))
    return NextResponse.json(
      { error: "You do not have permission to view this test run." },
      { status: 403 },
    );
  const id = await runId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test run id." },
      { status: 400 },
    );
  const run = await prisma.testRun.findUnique({
    where: { id },
    include: {
      suite: { select: { id: true, name: true } },
      creator: { select: { id: true, username: true } },
      executions: {
        orderBy: { id: "asc" },
        include: {
          executor: { select: { id: true, username: true } },
          testCase: { select: { id: true, title: true } },
          bugReport: {
            select: { id: true, title: true, status: true, assigned_to: true },
          },
        },
      },
    },
  });
  if (!run)
    return NextResponse.json({ error: "Test run not found." }, { status: 404 });
  return NextResponse.json({ run });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to update test runs." },
      { status: 401 },
    );
  if (!canViewTestManagement(user))
    return NextResponse.json(
      { error: "You do not have permission to update test runs." },
      { status: 403 },
    );
  const id = await runId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test run id." },
      { status: 400 },
    );
  const existing = await prisma.testRun.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Test run not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const release_label = cleanText(
    body?.release_label ?? existing.release_label,
    120,
  );
  const environment = cleanText(body?.environment ?? existing.environment, 240);
  const notes = cleanText(body?.notes ?? existing.notes, 2000);
  if (!release_label || !environment)
    return NextResponse.json(
      { error: "Release/build and environment are required." },
      { status: 400 },
    );
  const run = await prisma.testRun.update({
    where: { id },
    data: { release_label, environment, notes },
  });
  return NextResponse.json({ run });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to delete test runs." },
      { status: 401 },
    );
  const id = await runId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test run id." },
      { status: 400 },
    );
  const run = await prisma.testRun.findUnique({ where: { id } });
  if (!run)
    return NextResponse.json({ error: "Test run not found." }, { status: 404 });
  if (!canDeleteTestRun(user, run))
    return NextResponse.json(
      { error: "Only admins can delete test run history." },
      { status: 403 },
    );
  await prisma.testRun.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
