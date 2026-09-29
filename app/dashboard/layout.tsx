import type { ReactNode } from "react";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-espresso text-ivory">
      <div className="flex-1">{children}</div>
      <DashboardFooter />
    </div>
  );
}
