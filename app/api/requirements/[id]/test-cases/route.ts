import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canEditRequirement } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function requirementTestCaseContext(
  request: NextRequest,
  params: Params["params"],
) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "You must be logged in to manage requirement coverage." },
        { status: 401 },
      ),
    };
  }

  const requirementId = Number((await params).id);
  const requirement = Number.isInteger(requirementId)
    ? await prisma.requirement.findUnique({ where: { id: requirementId } })
    : null;

  if (!requirement) {
    return {
      error: NextResponse.json(
        { error: "Requirement not found." },
        { status: 404 },
      ),
    };
  }

  if (!canEditRequirement(user, requirement)) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to manage requirement coverage." },
        { status: 403 },
      ),
    };
  }

  const body = await request.json().catch(() => null);
  const testCaseId = Number(body?.test_case_id);

  if (!Number.isInteger(testCaseId)) {
    return {
      error: NextResponse.json(
        { error: "A valid test case is required." },
        { status: 400 },
      ),
    };
  }

  return { requirement, testCaseId };
}

export async function POST(request: NextRequest, { params }: Params) {
  const result = await requirementTestCaseContext(request, params);

  if ("error" in result) return result.error;

  const testCase = await prisma.testCase.findUnique({
    where: { id: result.testCaseId },
  });

  if (!testCase) {
    return NextResponse.json(
      { error: "Test case not found." },
      { status: 404 },
    );
  }

  const existingLink = await prisma.requirementTestCase.findUnique({
    where: {
      requirement_id_test_case_id: {
        requirement_id: result.requirement.id,
        test_case_id: result.testCaseId,
      },
    },
  });

  if (existingLink) {
    return NextResponse.json(
      { error: "That test case is already linked." },
      { status: 409 },
    );
  }

  const link = await prisma.requirementTestCase.create({
    data: {
      requirement_id: result.requirement.id,
      test_case_id: result.testCaseId,
    },
  });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const result = await requirementTestCaseContext(request, params);

  if ("error" in result) return result.error;

  const link = await prisma.requirementTestCase.findUnique({
    where: {
      requirement_id_test_case_id: {
        requirement_id: result.requirement.id,
        test_case_id: result.testCaseId,
      },
    },
  });

  if (!link) {
    return NextResponse.json(
      { error: "That test case is not linked." },
      { status: 404 },
    );
  }

  await prisma.requirementTestCase.delete({ where: { id: link.id } });
  return NextResponse.json({ ok: true });
}
