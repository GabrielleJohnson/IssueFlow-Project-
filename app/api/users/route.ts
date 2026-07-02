import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view users." }, { status: 401 });
  }

  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Only admins can manage users." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: { id: true, username: true, email: true, role: true, created_at: true }
  });

  return NextResponse.json({ users });
}
