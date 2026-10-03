import type { TestInfo } from "@playwright/test";

export function e2eName(testInfo: TestInfo, label: string) {
  const testSlug = testInfo.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 36);
  return `E2E-${label}-${testSlug}-${Date.now()}`;
}
