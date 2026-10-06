export const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lA1xNAAAAABJRU5ErkJggg==",
  "base64",
);

export async function uploadEvidence({ baseUrl, issueId, cookie, name, type, bytes }) {
  const prepare = await fetch(`${baseUrl}/api/issues/${issueId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ files: [{ name, type, size: bytes.byteLength }] }),
  });
  const prepared = await prepare.json().catch(() => ({}));
  if (!prepare.ok) return { response: prepare, data: prepared };

  const target = prepared.uploads[0];
  const upload = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: bytes });
  if (!upload.ok) return { response: upload, data: { error: await upload.text() } };

  const finalize = await fetch(`${baseUrl}/api/issues/${issueId}/attachments`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ tokens: [target.token] }),
  });
  return { response: finalize, data: await finalize.json().catch(() => ({})) };
}
