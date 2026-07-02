import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isUserRole } from "@/lib/issueOptions";
import { canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

async function getUserId(params: Params["params"]) {
  const { id } = await params;
  const userId = Number(id);
  return Number.isInteger(userId) ? userId : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "You must be logged in to manage users." }, { status: 401 });
  }

  if (!canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Only admins can manage users." }, { status: 403 });
  }

  const userId = await getUserId(params);

  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const role = String(body?.role ?? "");

  if (!isUserRole(role)) {
    return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetUser.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

    if (adminCount <= 1) {
      return NextResponse.json({ error: "At least one admin must remain." }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, username: true, email: true, role: true, created_at: true }
  });

  return NextResponse.json({ user });
}
