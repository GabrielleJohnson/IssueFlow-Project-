import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { SectionHeader } from "@/components/SectionHeader";
import { UserRoleSelect } from "@/components/users/UserRoleSelect";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManageUsers(user)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { created_at: "desc" },
    select: { id: true, username: true, email: true, role: true, created_at: true }
  });

  return (
    <main className="min-h-screen bg-espresso text-ivory">
      <DashboardNav user={user} />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <SectionHeader
          eyebrow="Admin"
          title="User Management"
          description="Assign Admin, Tester, or Developer roles without exposing role controls during normal registration."
        />

        <div className="mt-8 overflow-hidden rounded-lg border border-bronze bg-clay shadow-card">
          <div className="border-b border-bronze p-5">
            <h2 className="font-display text-xl font-semibold">Team Roles</h2>
            <p className="mt-1 text-sm text-beige">{users.length} users in this local IssueFlow workspace.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-espresso/45 text-xs uppercase tracking-[0.16em] text-beige">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Current Role</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account.id} className="border-t border-bronze/70">
                    <td className="px-5 py-4 font-semibold text-ivory">{account.username}</td>
                    <td className="px-5 py-4 text-beige">{account.email}</td>
                    <td className="px-5 py-4"><Badge label={account.role} /></td>
                    <td className="px-5 py-4 text-beige">{new Date(account.created_at).toLocaleString()}</td>
                    <td className="px-5 py-4"><UserRoleSelect userId={account.id} currentRole={account.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
