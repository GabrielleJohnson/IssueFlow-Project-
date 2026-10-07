import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { isValidRegistrationEmail, normalizeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function duplicateEmailResponse() {
  return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Username, email, and password are required." }, { status: 400 });
  }

  if (!isValidRegistrationEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return duplicateEmailResponse();
  }

  const password_hash = await hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return duplicateEmailResponse();
    }
    throw error;
  }

  const token = await createSessionToken({ userId: user.id, email: user.email });
  await setSessionCookie(token);

  return NextResponse.json({ user }, { status: 201 });
}
