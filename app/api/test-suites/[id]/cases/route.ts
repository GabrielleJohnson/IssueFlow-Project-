import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canEditTestSuite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
async function suiteContext(params: Params["params"]) { const id = Number((await params).id); return Number.isInteger(id) ? prisma.testSuite.findUnique({ where: { id } }) : null; }
async function membershipRequest(request: NextRequest, params: Params["params"]) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "You must be logged in to manage suite test cases." }, { status: 401 }) };
  const suite = await suiteContext(params);
  if (!suite) return { error: NextResponse.json({ error: "Test suite not found." }, { status: 404 }) };
  if (!canEditTestSuite(user, suite)) return { error: NextResponse.json({ error: "You do not have permission to manage this suite." }, { status: 403 }) };
  const body = await request.json().catch(() => null);
  const testCaseId = Number(body?.test_case_id);
  if (!Number.isInteger(testCaseId)) return { error: NextResponse.json({ error: "A valid test case is required." }, { status: 400 }) };
  return { suite, testCaseId };
}

export async function POST(request: NextRequest, { params }: Params) {
  const result = await membershipRequest(request, params);
  if ("error" in result) return result.error;
  const testCase = await prisma.testCase.findUnique({ where: { id: result.testCaseId } });
  if (!testCase) return NextResponse.json({ error: "Test case not found." }, { status: 404 });
  const duplicate = await prisma.testSuiteCase.findUnique({ where: { suite_id_test_case_id: { suite_id: result.suite.id, test_case_id: result.testCaseId } } });
  if (duplicate) return NextResponse.json({ error: "That test case is already in this suite." }, { status: 409 });
  const membership = await prisma.testSuiteCase.create({ data: { suite_id: result.suite.id, test_case_id: result.testCaseId } });
  return NextResponse.json({ membership }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await membershipRequest(request, params);
  if ("error" in result) return result.error;
  const membership = await prisma.testSuiteCase.findUnique({ where: { suite_id_test_case_id: { suite_id: result.suite.id, test_case_id: result.testCaseId } } });
  if (!membership) return NextResponse.json({ error: "That test case is not in this suite." }, { status: 404 });
  await prisma.testSuiteCase.delete({ where: { id: membership.id } });
  return NextResponse.json({ ok: true });
}
