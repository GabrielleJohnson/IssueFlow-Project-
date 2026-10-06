import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jwtVerify, SignJWT } from "jose";

const UPLOAD_URL_SECONDS = 5 * 60;
const DOWNLOAD_URL_SECONDS = 60;

type UploadTarget = {
  objectKey: string;
  contentType: string;
  contentLength: number;
  origin: string;
};

type StoredObject = {
  bytes: Uint8Array;
  contentType: string;
};

type TestStorageState = {
  objects: Map<string, StoredObject>;
};

const globalForEvidence = globalThis as typeof globalThis & {
  issueFlowEvidenceTestStorage?: TestStorageState;
};

export class EvidenceStorageError extends Error {
  constructor(
    message: string,
    readonly code: "CONFIGURATION" | "NOT_FOUND" | "INVALID_UPLOAD" = "INVALID_UPLOAD",
  ) {
    super(message);
  }
}

export function isTestEvidenceStorageEnabled() {
  return process.env.EVIDENCE_STORAGE_DRIVER === "memory" && process.env.EVIDENCE_STORAGE_TEST_MODE === "true";
}

function testState() {
  if (!isTestEvidenceStorageEnabled()) {
    throw new EvidenceStorageError("Test evidence storage is not enabled.", "NOT_FOUND");
  }
  globalForEvidence.issueFlowEvidenceTestStorage ??= { objects: new Map() };
  return globalForEvidence.issueFlowEvidenceTestStorage;
}

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new EvidenceStorageError("AUTH_SECRET is required for evidence upload signing.", "CONFIGURATION");
  }
  return new TextEncoder().encode(secret ?? "issueflow-local-development-secret");
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new EvidenceStorageError(`${name} is required for evidence storage.`, "CONFIGURATION");
  return value;
}

function storageConfig() {
  return {
    endpoint: requiredEnvironment("AWS_ENDPOINT_URL_S3"),
    region: requiredEnvironment("AWS_REGION"),
    bucket: requiredEnvironment("EVIDENCE_STORAGE_BUCKET"),
    accessKeyId: requiredEnvironment("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("AWS_SECRET_ACCESS_KEY"),
  };
}

function s3Client() {
  const config = storageConfig();
  return {
    bucket: config.bucket,
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

async function signTestCapability(payload: Record<string, string | number>, audience: string, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("issueflow")
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(signingKey());
}

async function verifyTestCapability(token: string, audience: string) {
  try {
    const result = await jwtVerify(token, signingKey(), { issuer: "issueflow", audience });
    return result.payload;
  } catch {
    throw new EvidenceStorageError("The temporary evidence URL is invalid or expired.", "NOT_FOUND");
  }
}

export async function createEvidenceUploadUrl(input: UploadTarget) {
  if (isTestEvidenceStorageEnabled()) {
    const token = await signTestCapability(
      { key: input.objectKey, type: input.contentType, size: input.contentLength },
      "evidence-test-upload",
      `${UPLOAD_URL_SECONDS}s`,
    );
    return `${input.origin}/api/test-support/evidence?token=${encodeURIComponent(token)}`;
  }

  const { client, bucket } = s3Client();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    }),
    { expiresIn: UPLOAD_URL_SECONDS },
  );
}

export async function inspectEvidenceObject(objectKey: string) {
  if (isTestEvidenceStorageEnabled()) {
    const object = testState().objects.get(objectKey);
    if (!object) throw new EvidenceStorageError("Evidence object was not found.", "NOT_FOUND");
    return { contentLength: object.bytes.byteLength, contentType: object.contentType, firstBytes: object.bytes.slice(0, 16) };
  }

  const { client, bucket } = s3Client();
  try {
    const [head, prefix] = await Promise.all([
      client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey })),
      client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey, Range: "bytes=0-15" })),
    ]);
    return {
      contentLength: head.ContentLength ?? 0,
      contentType: head.ContentType ?? "",
      firstBytes: new Uint8Array((await prefix.Body?.transformToByteArray()) ?? []),
    };
  } catch {
    throw new EvidenceStorageError("Evidence object was not found.", "NOT_FOUND");
  }
}

export async function createEvidenceDownloadUrl(objectKey: string, originalName: string, origin: string) {
  if (isTestEvidenceStorageEnabled()) {
    const token = await signTestCapability({ key: objectKey, name: originalName }, "evidence-test-download", `${DOWNLOAD_URL_SECONDS}s`);
    return `${origin}/api/test-support/evidence?token=${encodeURIComponent(token)}`;
  }

  const { client, bucket } = s3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ResponseContentDisposition: `inline; filename="${originalName.replace(/["\\]/g, "")}"`,
    }),
    { expiresIn: DOWNLOAD_URL_SECONDS },
  );
}

export async function deleteEvidenceObject(objectKey: string) {
  if (isTestEvidenceStorageEnabled()) {
    testState().objects.delete(objectKey);
    return;
  }
  const { client, bucket } = s3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

export async function storeTestEvidence(token: string, bytes: Uint8Array, contentType: string) {
  const payload = await verifyTestCapability(token, "evidence-test-upload");
  if (typeof payload.key !== "string" || typeof payload.type !== "string" || typeof payload.size !== "number") {
    throw new EvidenceStorageError("The temporary upload target is invalid.");
  }
  if (payload.type !== contentType || payload.size !== bytes.byteLength) {
    throw new EvidenceStorageError("The uploaded evidence does not match the authorized file metadata.");
  }
  testState().objects.set(payload.key, { bytes, contentType });
}

export async function loadTestEvidence(token: string) {
  const payload = await verifyTestCapability(token, "evidence-test-download");
  if (typeof payload.key !== "string" || typeof payload.name !== "string") {
    throw new EvidenceStorageError("The temporary download target is invalid.");
  }
  const object = testState().objects.get(payload.key);
  if (!object) throw new EvidenceStorageError("Evidence object was not found.", "NOT_FOUND");
  return { ...object, originalName: payload.name };
}
