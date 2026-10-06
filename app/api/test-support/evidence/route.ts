import { NextRequest, NextResponse } from "next/server";
import { isTestEvidenceStorageEnabled, loadTestEvidence, storeTestEvidence } from "@/lib/evidenceStorage";

function tokenFrom(request: NextRequest) {
  return request.nextUrl.searchParams.get("token");
}

export async function PUT(request: NextRequest) {
  if (!isTestEvidenceStorageEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Upload target not found." }, { status: 404 });

  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    await storeTestEvidence(token, bytes, request.headers.get("content-type") ?? "");
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Upload target not found." }, { status: 404 });
  }
}

export async function GET(request: NextRequest) {
  if (!isTestEvidenceStorageEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Download target not found." }, { status: 404 });

  try {
    const object = await loadTestEvidence(token);
    return new NextResponse(Buffer.from(object.bytes), {
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": `inline; filename="${object.originalName.replace(/["\\]/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Download target not found." }, { status: 404 });
  }
}
