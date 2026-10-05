import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  canDeleteTestSuite,
  canEditTestSuite,
  canViewTestManagement,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

type Params = { params: Promise<{ id: string }> };
async function suiteId(params: Params["params"]) {
  const id = Number((await params).id);
  return Number.isInteger(id) ? id : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to view this test suite." },
      { status: 401 },
    );
  if (!canViewTestManagement(user))
    return NextResponse.json(
      { error: "You do not have permission to view this test suite." },
      { status: 403 },
    );
  const id = await suiteId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test suite id." },
      { status: 400 },
    );
  const suite = await prisma.testSuite.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true } },
      memberships: {
        orderBy: { added_at: "asc" },
        include: {
          testCase: { include: { creator: { select: { username: true } } } },
        },
      },
      runs: {
        orderBy: { started_at: "desc" },
        take: 10,
        include: { _count: { select: { executions: true } } },
      },
    },
  });
  if (!suite)
    return NextResponse.json(
      { error: "Test suite not found." },
      { status: 404 },
    );
  return NextResponse.json({ suite });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to update test suites." },
      { status: 401 },
    );
  const id = await suiteId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test suite id." },
      { status: 400 },
    );
  const existing = await prisma.testSuite.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: "Test suite not found." },
      { status: 404 },
    );
  if (!canEditTestSuite(user, existing))
    return NextResponse.json(
      { error: "You do not have permission to update this test suite." },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name ?? existing.name, 160);
  const description = cleanText(
    body?.description ?? existing.description,
    2000,
  );
  if (!name)
    return NextResponse.json(
      { error: "Suite name is required." },
      { status: 400 },
    );
  const suite = await prisma.testSuite.update({
    where: { id },
    data: { name, description },
  });
  return NextResponse.json({ suite });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to delete test suites." },
      { status: 401 },
    );
  const id = await suiteId(params);
  if (!id)
    return NextResponse.json(
      { error: "Invalid test suite id." },
      { status: 400 },
    );
  const existing = await prisma.testSuite.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json(
      { error: "Test suite not found." },
      { status: 404 },
    );
  if (!canDeleteTestSuite(user, existing))
    return NextResponse.json(
      { error: "You do not have permission to delete this test suite." },
      { status: 403 },
    );
  await prisma.testSuite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
