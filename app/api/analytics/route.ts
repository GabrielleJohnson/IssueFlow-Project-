import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { canViewAnalytics } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to view analytics." }, { status: 401 });
  }

  if (!canViewAnalytics(user)) {
    return NextResponse.json({ error: "You do not have permission to view analytics." }, { status: 403 });
  }

  const analytics = await getAnalyticsData(user);
  return NextResponse.json({ analytics });
}
