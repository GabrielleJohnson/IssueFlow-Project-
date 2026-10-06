import { test, expect, loginThroughApi } from "../fixtures";
import { e2eUser, prisma } from "../support/database";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA1xNAAAAABJRU5ErkJggg==",
  "base64",
);

async function createIssue() {
  const [tester, developer] = await Promise.all([e2eUser("tester"), e2eUser("developer")]);
  return prisma.issue.create({
    data: {
      title: "Evidence storage regression",
      description: "Verifies private direct uploads and evidence permissions.",
      environment: "Playwright / isolated PostgreSQL",
      steps_to_reproduce: "Upload a screenshot to this synthetic defect.",
      expected_result: "The private evidence remains authorized and retrievable.",
      actual_result: "The test exercises the complete evidence lifecycle.",
      severity: "MEDIUM",
      status: "OPEN",
      created_by: tester.id,
      assigned_to: developer.id,
    },
  });
}

async function prepareUpload(page: import("@playwright/test").Page, issueId: number, file: { name: string; type: string; size: number }) {
  const response = await page.request.post(`/api/issues/${issueId}/attachments`, { data: { files: [file] } });
  const data = await response.json();
  return { response, data };
}

test("private evidence uploads directly, remains authorized, and deletes consistently", async ({ page }) => {
  const issue = await createIssue();
  await loginThroughApi(page, "tester");
  await page.goto(`/dashboard/issues/${issue.id}`);

  await page.locator('input[type="file"]').setInputFiles({ name: "checkout-evidence.png", mimeType: "image/png", buffer: PNG_BYTES });
  await page.getByRole("button", { name: "Upload Evidence" }).click();
  await expect(page.getByText("Evidence uploaded successfully.")).toBeVisible();
  await expect(page.getByText("checkout-evidence.png", { exact: true })).toBeVisible();

  const attachment = await prisma.attachment.findFirstOrThrow({ where: { issue_id: issue.id } });
  expect(attachment.object_key).toMatch(new RegExp(`^issues/${issue.id}/[a-zA-Z0-9.-]+-[0-9a-f-]{36}\\.png$`));
  expect(attachment.object_key).not.toContain("../");

  const privateAccess = await page.request.get(`/api/attachments/${attachment.id}`, { maxRedirects: 0 });
  expect(privateAccess.status()).toBe(307);
  const signedLocation = privateAccess.headers().location;
  expect(signedLocation).toContain("/api/test-support/evidence?token=");
  expect(signedLocation).not.toContain(attachment.object_key);

  await loginThroughApi(page, "developer");
  const developerView = await page.request.get(`/api/attachments/${attachment.id}`, { maxRedirects: 0 });
  expect(developerView.status()).toBe(307);
  const forbiddenDelete = await page.request.delete(`/api/attachments/${attachment.id}`);
  expect(forbiddenDelete.status()).toBe(403);

  await page.context().clearCookies();
  expect((await page.request.get(`/api/attachments/${attachment.id}`, { maxRedirects: 0 })).status()).toBe(401);

  await loginThroughApi(page, "tester");
  expect((await page.request.delete(`/api/attachments/${attachment.id}`)).ok()).toBeTruthy();
  expect(await prisma.attachment.count({ where: { id: attachment.id } })).toBe(0);
  expect((await page.request.get(`/api/attachments/${attachment.id}`, { maxRedirects: 0 })).status()).toBe(404);
  const activity = await prisma.issueActivity.findMany({ where: { issue_id: issue.id }, select: { action_type: true } });
  expect(activity.map((entry) => entry.action_type)).toEqual(expect.arrayContaining(["EVIDENCE_UPLOADED", "EVIDENCE_DELETED"]));
});

test("evidence preparation rejects unsafe metadata and finalization cannot be forged", async ({ page }) => {
  const issue = await createIssue();
  await loginThroughApi(page, "tester");

  const unsupported = await prepareUpload(page, issue.id, { name: "payload.exe", type: "application/octet-stream", size: 20 });
  expect(unsupported.response.status()).toBe(400);

  const oversized = await prepareUpload(page, issue.id, { name: "too-large.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 });
  expect(oversized.response.status()).toBe(400);

  const forged = await page.request.patch(`/api/issues/${issue.id}/attachments`, { data: { tokens: ["not-a-signed-upload-intent"] } });
  expect(forged.status()).toBe(400);

  const wrongBytes = await prepareUpload(page, issue.id, { name: "claimed.png", type: "image/png", size: 5 });
  expect(wrongBytes.response.ok()).toBeTruthy();
  const target = wrongBytes.data.uploads[0];
  expect((await page.request.put(target.uploadUrl, { headers: { "Content-Type": "image/png" }, data: Buffer.from("hello") })).ok()).toBeTruthy();
  const rejectedFinalize = await page.request.patch(`/api/issues/${issue.id}/attachments`, { data: { tokens: [target.token] } });
  expect(rejectedFinalize.status()).toBe(400);
  expect(await prisma.attachment.count({ where: { issue_id: issue.id } })).toBe(0);

  await loginThroughApi(page, "developer");
  const developerUpload = await prepareUpload(page, issue.id, { name: "developer.png", type: "image/png", size: PNG_BYTES.byteLength });
  expect(developerUpload.response.status()).toBe(403);
});

test("evidence upload failures identify the storage stage without exposing the upload URL", async ({ page }) => {
  const issue = await createIssue();
  await loginThroughApi(page, "tester");
  await page.route("**/api/test-support/evidence?token=**", async (route) => {
    await route.fulfill({ status: 503, body: "synthetic storage failure" });
  });
  await page.goto(`/dashboard/issues/${issue.id}`);

  await page.locator('input[type="file"]').setInputFiles({ name: "failed-upload.png", mimeType: "image/png", buffer: PNG_BYTES });
  await page.getByRole("button", { name: "Upload Evidence" }).click();

  const alert = page.locator('p[role="alert"]');
  await expect(alert).toContainText("Unable to upload failed-upload.png. Storage returned HTTP 503.");
  await expect(alert).not.toContainText("token=");
  expect(await prisma.attachment.count({ where: { issue_id: issue.id } })).toBe(0);
});
