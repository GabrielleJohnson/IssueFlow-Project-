"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isRegister ? payload : { email: payload.email, password: payload.password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-bronze bg-clay p-6 shadow-card">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-coral">{isRegister ? "Create account" : "Welcome back"}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ivory sm:text-4xl">
          {isRegister ? "Start tracking QA signals." : "Log in to IssueFlow."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-beige">
          {isRegister
            ? "Create a local account for the protected dashboard and defect workflow."
            : "Access the protected dashboard, test cases, and issue reporting workspace."}
        </p>
      </div>

      <div className="mt-7 grid gap-4">
        {isRegister && (
          <label>
            <span className="mb-2 block text-sm font-semibold text-beige">Username</span>
            <input className="field" name="username" placeholder="Gabrielle QA" autoComplete="username" required />
          </label>
        )}
        <label>
          <span className="mb-2 block text-sm font-semibold text-beige">Email</span>
          <input className="field" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-beige">Password</span>
          <input
            className="field"
            name="password"
            type="password"
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-ember/40 bg-ember/15 px-4 py-3 text-sm font-semibold text-[#ff9aa2]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-full bg-coral px-5 py-3 text-sm font-bold text-espresso shadow-glow transition hover:bg-amber disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? "Working..." : isRegister ? "Create Account" : "Log In"}
      </button>

      <p className="mt-5 text-center text-sm text-beige">
        {isRegister ? "Already have an account?" : "Need an account?"}{" "}
        <Link className="font-semibold text-amber transition hover:text-coral" href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Log in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
