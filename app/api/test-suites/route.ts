import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canCreateTestSuite, canViewTestManagement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/testManagement";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to view test suites." },
      { status: 401 },
    );
  if (!canViewTestManagement(user))
    return NextResponse.json(
      { error: "You do not have permission to view test suites." },
      { status: 403 },
    );
  const q = cleanText(request.nextUrl.searchParams.get("q"), 120);
  const sort =
    request.nextUrl.searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const requestedSize = Number(request.nextUrl.searchParams.get("pageSize"));
  const pageSize = [10, 25, 50].includes(requestedSize) ? requestedSize : 10;
  const requestedPage = Math.max(
    Number(request.nextUrl.searchParams.get("page")) || 1,
    1,
  );
  const where = q
    ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] }
    : {};
  const total = await prisma.testSuite.count({ where });
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const suites = await prisma.testSuite.findMany({
    where,
    orderBy: [{ updated_at: sort }, { id: sort }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      creator: { select: { id: true, username: true } },
      _count: { select: { memberships: true, runs: true } },
    },
  });
  return NextResponse.json({
    suites,
    pagination: { total, page, pageSize, totalPages },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to create test suites." },
      { status: 401 },
    );
  if (!canCreateTestSuite(user))
    return NextResponse.json(
      { error: "You do not have permission to create test suites." },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 160);
  const description = cleanText(body?.description, 2000);
  if (!name)
    return NextResponse.json(
      { error: "Suite name is required." },
      { status: 400 },
    );
  const suite = await prisma.testSuite.create({
    data: { name, description, created_by: user.id },
  });
  return NextResponse.json({ suite }, { status: 201 });
}
