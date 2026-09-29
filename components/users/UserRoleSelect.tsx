"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useReducer, useState } from "react";
import { formatEnumLabel, userRoles } from "@/lib/issueOptions";
import { createRoleChangeState, roleChangeReducer } from "@/lib/roleChangeState";

type UserRoleSelectProps = {
  userId: number;
  username: string;
  currentRole: string;
  isCurrentUser: boolean;
};

export function UserRoleSelect({ userId, username, currentRole, isCurrentUser }: UserRoleSelectProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(roleChangeReducer, currentRole, createRoleChangeState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dispatch({ type: "sync", role: currentRole });
  }, [currentRole]);

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRole = event.target.value;
    dispatch({ type: "select", role: nextRole });
  }

  function cancelChange() {
    dispatch({ type: "cancel" });
  }

  async function confirmChange() {
    if (!state.pendingRole) {
      return;
    }

    setIsSaving(true);

    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: state.pendingRole })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      dispatch({ type: "saveFailed", error: data.error ?? "Unable to update role." });
      setIsSaving(false);
      return;
    }

    const savedRole = String(data.user?.role ?? state.pendingRole);
    dispatch({ type: "saveSucceeded", role: savedRole });
    setIsSaving(false);

    if (isCurrentUser && savedRole !== "ADMIN") {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-w-44">
      <select className="field py-2 text-sm" value={state.selectedRole} onChange={handleChange} disabled={isSaving}>
        {userRoles.map((option) => (
          <option key={option} value={option}>{formatEnumLabel(option)}</option>
        ))}
      </select>
      {state.error && <p className="mt-2 text-xs font-semibold text-[#ff9aa2]">{state.error}</p>}

      {state.pendingRole && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-espresso/80 px-4 py-8 backdrop-blur-sm" role="presentation">
          <div
            aria-describedby={`role-change-description-${userId}`}
            aria-labelledby={`role-change-title-${userId}`}
            aria-modal="true"
            className={`w-full max-w-md rounded-lg border bg-clay p-6 shadow-card ${isCurrentUser ? "border-ember/70" : "border-bronze"}`}
            role="dialog"
          >
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isCurrentUser ? "text-[#ff9aa2]" : "text-coral"}`}>
              {isCurrentUser ? "Your access" : "Role confirmation"}
            </p>
            <h2 id={`role-change-title-${userId}`} className="mt-3 font-display text-2xl font-semibold text-ivory [overflow-wrap:anywhere]">
              {isCurrentUser ? "Change your own Admin role?" : `Change ${username}'s role?`}
            </h2>
            <p className="mt-5 text-lg font-semibold text-ivory">
              {formatEnumLabel(state.savedRole)} <span aria-hidden="true" className="px-2 text-coral">→</span>{" "}
              {formatEnumLabel(state.pendingRole)}
            </p>
            <p id={`role-change-description-${userId}`} className="mt-4 text-sm leading-6 text-beige">
              {isCurrentUser
                ? "You may immediately lose access to Admin-only features, including User Management."
                : "This will change the permissions available to this user."}
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-full border border-bronze px-5 py-3 text-sm font-bold text-ivory transition hover:border-amber hover:text-amber"
                onClick={cancelChange}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-full px-5 py-3 text-sm font-bold text-espresso transition disabled:cursor-not-allowed disabled:opacity-65 ${isCurrentUser ? "bg-ember text-ivory hover:bg-[#ff5965]" : "bg-coral hover:bg-amber"}`}
                onClick={confirmChange}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : isCurrentUser ? "Change My Role" : "Confirm Role Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
