"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-full border border-coral/50 px-4 py-2 text-sm font-semibold text-ivory shadow-glow transition hover:bg-coral hover:text-espresso disabled:cursor-not-allowed disabled:opacity-65"
    >
      {isLoggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
