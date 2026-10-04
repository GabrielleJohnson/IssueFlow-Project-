import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canExportRelease } from "@/lib/permissions";
import { getReleaseReadiness, releaseReportCsv } from "@/lib/releaseReadiness";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to export release reports." }, { status: 401 });
  if (!canExportRelease(user)) return NextResponse.json({ error: "You do not have permission to export release reports." }, { status: 403 });
  const id = Number((await params).id); if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid release id." }, { status: 400 });
  const data = await getReleaseReadiness(id); if (!data) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  const filename = `issueflow-${data.release.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || `release-${id}`}-qa-report.csv`;
  return new NextResponse(`\uFEFF${releaseReportCsv(data)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}
