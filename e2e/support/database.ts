import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { E2E_PASSWORD, E2E_USERS } from "./environment";

export const prisma = new PrismaClient();

export async function seedE2EUsers() {
  const passwordHash = await hash(E2E_PASSWORD, 12);

  await Promise.all(
    Object.values(E2E_USERS).map((user) =>
      prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          password_hash: passwordHash,
          role: user.role
        }
      })
    )
  );
}

export async function e2eUser(key: keyof typeof E2E_USERS) {
  return prisma.user.findUniqueOrThrow({ where: { email: E2E_USERS[key].email } });
}

export async function clearE2EData() {
  await prisma.testCase.updateMany({ data: { linked_issue_id: null } });
  await prisma.issue.updateMany({ data: { linked_test_case_id: null, origin_execution_id: null } });
  await prisma.issueActivity.deleteMany();
  await prisma.issueComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.testExecution.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testSuiteCase.deleteMany();
  await prisma.testSuite.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.user.deleteMany();
}
