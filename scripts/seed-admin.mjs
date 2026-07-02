import { hash } from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "prisma", "dev.db");
const username = process.env.ISSUEFLOW_ADMIN_USERNAME?.trim();
const email = process.env.ISSUEFLOW_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ISSUEFLOW_ADMIN_PASSWORD ?? "";

if (!username || !email || !password) {
  console.error("Set ISSUEFLOW_ADMIN_USERNAME, ISSUEFLOW_ADMIN_EMAIL, and ISSUEFLOW_ADMIN_PASSWORD before running db:seed-admin.");
  process.exit(1);
}

if (!email.includes("@") || password.length < 8) {
  console.error("Admin email must be valid and password must be at least 8 characters.");
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
const passwordHash = await hash(password, 12);

if (existingUser) {
  db.prepare("UPDATE users SET username = ?, password_hash = ?, role = 'ADMIN' WHERE email = ?").run(username, passwordHash, email);
  console.log(`Updated existing admin user: ${email}`);
} else {
  db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'ADMIN')").run(username, email, passwordHash);
  console.log(`Created admin user: ${email}`);
}

db.close();
