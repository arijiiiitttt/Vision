#!/usr/bin/env node

const readline = require("node:readline");
const crypto = require("node:crypto");

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  console.error(
    "\nbcryptjs isn't installed at the repo root yet.\n" +
    "Run this first:  cd server && npm install\n" +
    "then re-run this script from the repo root.\n"
  );
  process.exit(1);
}

const SALT_ROUNDS = 12; // must match server/src/auth/PasswordService.ts

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    let input = "";
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input.trim());
        return;
      }
      if (char === "\u0003") { process.exit(1); } // Ctrl+C
      if (char === "\u007f") { input = input.slice(0, -1); return; } // backspace
      input += char;
    };
    stdin.on("data", onData);
  });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) out[key] = argv[i + 1];
  }
  return out;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 12) issues.push("at least 12 characters (this is an admin account — hold it to a higher bar than the 8-char user minimum)");
  if (!/[A-Z]/.test(pw)) issues.push("an uppercase letter");
  if (!/[a-z]/.test(pw)) issues.push("a lowercase letter");
  if (!/[0-9]/.test(pw)) issues.push("a digit");
  return issues;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let name = args.name;
  while (!name) {
    name = await ask("Admin full name: ");
    if (!name) console.log("  Name can't be empty.");
  }

  let email = args.email;
  while (!email || !isValidEmail(email)) {
    email = await ask("Admin email: ");
    if (!isValidEmail(email)) console.log("  That doesn't look like a valid email.");
  }
  email = email.toLowerCase();

  let password = args.password;
  while (true) {
    if (!password) password = await askHidden("Admin password (input hidden): ");
    const issues = passwordIssues(password);
    if (issues.length === 0) break;
    console.log(`  Password needs: ${issues.join(", ")}.`);
    password = null;
  }

  let confirm = args.password ? password : await askHidden("Confirm password (input hidden): ");
  if (confirm !== password) {
    console.error("\nPasswords didn't match. Nothing was generated — run the script again.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const nameEscaped = name.replace(/'/g, "''");
  const emailEscaped = email.replace(/'/g, "''");

  const sql = `-- Admin account for ${nameEscaped} <${emailEscaped}>
-- Generated ${new Date().toISOString()} — safe to run more than once (idempotent upsert).
-- Paste into Neon's SQL Editor and run.
INSERT INTO users (name, email, password_hash, role, is_verified, is_active)
VALUES ('${nameEscaped}', '${emailEscaped}', '${passwordHash}', 'ADMIN', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = 'ADMIN',
    is_active = TRUE,
    updated_at = now();`;

  console.log("\n" + "=".repeat(72));
  console.log("Copy everything between the lines into Neon's SQL Editor and run it:");
  console.log("=".repeat(72) + "\n");
  console.log(sql);
  console.log("\n" + "=".repeat(72));
  console.log(`Done. ${emailEscaped} can now log in at /login with the password you just entered.`);
  console.log("The plaintext password was never written to disk — store it in your team's");
  console.log("password manager now, this terminal won't show it again.");
  console.log("=".repeat(72) + "\n");
}

main();
