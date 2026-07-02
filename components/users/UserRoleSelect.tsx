"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { formatEnumLabel, userRoles } from "@/lib/issueOptions";

type UserRoleSelectProps = {
  userId: number;
  currentRole: string;
};

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextRole = event.target.value;
    setRole(nextRole);
    setError("");
    setIsSaving(true);

    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setRole(currentRole);
      setError(data.error ?? "Unable to update role.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="min-w-44">
      <select className="field py-2 text-sm" value={role} onChange={handleChange} disabled={isSaving}>
        {userRoles.map((option) => (
          <option key={option} value={option}>{formatEnumLabel(option)}</option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs font-semibold text-[#ff9aa2]">{error}</p>}
    </div>
  );
}
