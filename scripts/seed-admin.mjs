import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { loadDatabaseEnvironment } from "./lib/database-url.mjs";

loadDatabaseEnvironment();

const username = process.env.ISSUEFLOW_ADMIN_USERNAME?.trim();
const email = process.env.ISSUEFLOW_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ISSUEFLOW_ADMIN_PASSWORD ?? "";

if (!username || !email || !password) {
  console.error("Set ISSUEFLOW_ADMIN_USERNAME, ISSUEFLOW_ADMIN_EMAIL, and ISSUEFLOW_ADMIN_PASSWORD before running db:seed-admin.");
  process.exit(1);
}

if (!email.includes("@") || password.length < 8) {
  console.error("Admin email must be valid and password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await hash(password, 12);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  await prisma.user.upsert({
    where: { email },
    update: { username, password_hash: passwordHash, role: "ADMIN" },
    create: { username, email, password_hash: passwordHash, role: "ADMIN" }
  });

  console.log(existingUser ? "Updated existing admin user." : "Created admin user.");
} finally {
  await prisma.$disconnect();
}
