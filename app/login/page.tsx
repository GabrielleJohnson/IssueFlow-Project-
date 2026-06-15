import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-espresso px-5 py-16 text-ivory sm:px-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block font-display text-2xl font-bold tracking-wide text-ivory">
          Issue<span className="text-coral">Flow</span>
        </Link>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
