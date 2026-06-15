import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function IssuesIndexPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard#dashboard");
}
