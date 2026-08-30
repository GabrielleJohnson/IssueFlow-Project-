import { formatEnumLabel } from "@/lib/issueOptions";
import { prisma } from "@/lib/prisma";

type ActivityInput = {
  issueId: number;
  actorId?: number | null;
  actionType: string;
  message: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
};

export async function logIssueActivity({ issueId, actorId, actionType, message, fieldName, oldValue, newValue }: ActivityInput) {
  return prisma.issueActivity.create({
    data: {
      issue_id: issueId,
      actor_id: actorId ?? null,
      action_type: actionType,
      message,
      field_name: fieldName ?? null,
      old_value: oldValue ?? null,
      new_value: newValue ?? null
    }
  });
}

export function statusActivityType(status: string) {
  if (status === "REOPENED") {
    return "ISSUE_REOPENED";
  }

  if (status === "RESOLVED") {
    return "ISSUE_RESOLVED";
  }

  if (status === "CLOSED") {
    return "ISSUE_CLOSED";
  }

  return "STATUS_CHANGED";
}

export function statusChangeMessage(actorName: string, oldStatus: string, nextStatus: string, reason?: string) {
  const base = `${actorName} changed status from ${formatEnumLabel(oldStatus)} to ${formatEnumLabel(nextStatus)}.`;
  return reason ? `${base} Reason: ${reason}` : base;
}

export function assignmentMessage(oldAssignee: string | null, nextAssignee: string | null) {
  if (!oldAssignee && nextAssignee) {
    return `Assigned to ${nextAssignee}.`;
  }

  if (oldAssignee && nextAssignee && oldAssignee !== nextAssignee) {
    return `Reassigned from ${oldAssignee} to ${nextAssignee}.`;
  }

  if (oldAssignee && !nextAssignee) {
    return "Bug was unassigned.";
  }

  return "Assignment was updated.";
}
