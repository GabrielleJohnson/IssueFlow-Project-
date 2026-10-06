import { jwtVerify, SignJWT } from "jose";

export type EvidenceUploadIntent = {
  issueId: number;
  uploaderId: number;
  objectKey: string;
  filename: string;
  originalName: string;
  mimetype: string;
  filesize: number;
};

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production.");
  return new TextEncoder().encode(secret ?? "issueflow-local-development-secret");
}

export async function createEvidenceUploadIntent(intent: EvidenceUploadIntent) {
  return new SignJWT(intent)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("issueflow")
    .setAudience("evidence-upload")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(signingKey());
}

export async function verifyEvidenceUploadIntent(token: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: "issueflow", audience: "evidence-upload" });
    const intent = payload as Partial<EvidenceUploadIntent>;
    if (
      typeof intent.issueId !== "number" || typeof intent.uploaderId !== "number" ||
      typeof intent.objectKey !== "string" || typeof intent.filename !== "string" ||
      typeof intent.originalName !== "string" || typeof intent.mimetype !== "string" ||
      typeof intent.filesize !== "number"
    ) return null;
    return intent as EvidenceUploadIntent;
  } catch {
    return null;
  }
}
