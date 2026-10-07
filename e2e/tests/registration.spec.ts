import { test, expect } from "../fixtures";
import { prisma } from "../support/database";
import { E2E_PASSWORD } from "../support/environment";

const invalidEmails = [
  "gabrielle",
  "gabrielle@",
  "gabrielle@gmail.c",
  "gabrielle @gmail.com",
  "gabrielle@@gmail.com",
];

const validEmails = [
  "gabrielle@gmail.com",
  "person@company.com",
  "student@university.edu",
  "student@utech.edu.jm",
];

test("registration form clearly rejects malformed email addresses", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Username").fill("Email Validation Tester");
  await page.getByLabel("Password").fill(E2E_PASSWORD);

  for (const email of invalidEmails) {
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page.locator('p[role="alert"]')).toHaveText("Enter a valid email address.");
    await expect(page).toHaveURL(/\/register$/);
  }
});

test("registration API validates format, normalizes email, and preserves duplicate handling", async ({ page }, testInfo) => {
  for (const [index, email] of invalidEmails.entries()) {
    const response = await page.request.post("/api/auth/register", {
      data: { username: `Invalid Email ${index}`, email, password: E2E_PASSWORD },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: "Enter a valid email address." });
  }

  for (const [index, email] of validEmails.entries()) {
    const uniqueEmail = email.replace("@", `+${testInfo.workerIndex}-${index}@`);
    const response = await page.request.post("/api/auth/register", {
      data: { username: `Valid Email ${index}`, email: uniqueEmail, password: E2E_PASSWORD },
    });
    expect(response.status()).toBe(201);
  }

  const normalizedEmail = `registration-${testInfo.workerIndex}@company.com`;
  const normalized = await page.request.post("/api/auth/register", {
    data: { username: "Normalized Email", email: `  ${normalizedEmail.toUpperCase()}  `, password: E2E_PASSWORD },
  });
  expect(normalized.status()).toBe(201);
  await expect.poll(() => prisma.user.findUnique({ where: { email: normalizedEmail } })).not.toBeNull();

  const duplicate = await page.request.post("/api/auth/register", {
    data: { username: "Duplicate Email", email: normalizedEmail.toUpperCase(), password: E2E_PASSWORD },
  });
  expect(duplicate.status()).toBe(409);
  expect(await duplicate.json()).toEqual({ error: "An account with that email already exists." });
});

test("valid client registration still creates a normalized account", async ({ page }, testInfo) => {
  const normalizedEmail = `client-registration-${testInfo.workerIndex}@utech.edu.jm`;
  await page.goto("/register");
  await page.getByLabel("Username").fill("Client Registration Tester");
  await page.getByLabel("Email").fill(`  ${normalizedEmail.toUpperCase()}  `);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect.poll(() => prisma.user.findUnique({ where: { email: normalizedEmail } })).not.toBeNull();
});
