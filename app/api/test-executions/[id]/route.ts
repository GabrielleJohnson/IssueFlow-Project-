import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canExecuteTestRun } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  cleanText,
  isExecutionStatus,
  nextRunState,
} from "@/lib/testManagement";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "You must be logged in to record test results." },
      { status: 401 },
    );
  if (!canExecuteTestRun(user))
    return NextResponse.json(
      { error: "You do not have permission to record test results." },
      { status: 403 },
    );
  const id = Number((await params).id);
  if (!Number.isInteger(id))
    return NextResponse.json(
      { error: "Invalid execution id." },
      { status: 400 },
    );
  const execution = await prisma.testExecution.findUnique({ where: { id } });
  if (!execution)
    return NextResponse.json(
      { error: "Test execution not found." },
      { status: 404 },
    );
  const body = await request.json().catch(() => null);
  const status = String(body?.status ?? "");
  const actualResult = cleanText(body?.actual_result, 4000);
  if (!isExecutionStatus(status))
    return NextResponse.json(
      { error: "Invalid execution status." },
      { status: 400 },
    );
  if ((status === "FAILED" || status === "BLOCKED") && !actualResult)
    return NextResponse.json(
      {
        error:
          "Add an actual result or note for failed and blocked executions.",
      },
      { status: 400 },
    );
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.testExecution.update({
      where: { id },
      data: {
        status,
        actual_result: actualResult,
        executed_by: status === "NOT_RUN" ? null : user.id,
        executed_at: status === "NOT_RUN" ? null : new Date(),
      },
      include: {
        executor: { select: { id: true, username: true } },
        bugReport: { select: { id: true, title: true, status: true } },
      },
    });
    if (execution.test_case_id)
      await tx.testCase
        .update({
          where: { id: execution.test_case_id },
          data: {
            status,
            actual_result: actualResult || "Not recorded for this execution.",
          },
        })
        .catch(() => null);
    const executions = await tx.testExecution.findMany({
      where: { run_id: execution.run_id },
      select: { status: true },
    });
    const runState = nextRunState(executions);
    const run = await tx.testRun.update({
      where: { id: execution.run_id },
      data: runState,
    });
    return { execution: updated, run };
  });
  return NextResponse.json(result);
}
