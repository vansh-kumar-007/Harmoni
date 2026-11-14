import "dotenv/config";
import readline from "node:readline";
import crypto from "node:crypto";
import pg from "pg";
import { hash, Algorithm } from "@node-rs/argon2";
import { z } from "zod";

const { Pool } = pg;

const ARGON2ID_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: Algorithm.Argon2id,
};

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/,
    "Username may only contain letters, numbers, underscores, and hyphens, and cannot start or end with a symbol"
  )
  .transform((val) => val.toLowerCase());

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name must be at least 1 character long")
  .max(50, "Display name must be at most 50 characters long");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(1024, "Password cannot exceed 1024 characters");

/**
 * Prompts for normal text input using standard readline.
 */
function promptText(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts for masked password input in the terminal (outputs asterisks instead of characters).
 */
function promptMasked(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    let input = "";
    const stdin = process.stdin;

    // Handle non-interactive environments (e.g. piped input in tests)
    if (!stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      rl.question("", (answer) => {
        resolve(answer.trim());
      });
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function onData(ch) {
      const charCode = ch.charCodeAt(0);
      if (ch === "\r" || ch === "\n" || charCode === 13 || charCode === 10) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (ch === "\u0003") {
        // Ctrl+C
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        process.exit(130);
      } else if (ch === "\b" || charCode === 127 || charCode === 8) {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        input += ch;
        process.stdout.write("*");
      }
    }

    stdin.on("data", onData);
  });
}

/**
 * Main administrator bootstrap procedure.
 */
async function bootstrapAdmin() {
  console.log("=================================================");
  console.log(" Harmoni — Administrator Account Bootstrap CLI   ");
  console.log("=================================================\n");

  if (!process.env.DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL is not defined in the environment.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();

  try {
    // 1. Check whether an administrator account already exists
    const adminCheck = await client.query(
      `SELECT "id", "username" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;`
    );

    if (adminCheck.rows.length > 0) {
      console.log("[INFO] An administrator account already exists in this database.");
      console.log(`[INFO] Existing admin username: @${adminCheck.rows[0].username}`);
      console.log("[INFO] Additional administrator accounts cannot be bootstrapped via this CLI.");
      return;
    }

    console.log("No administrator account was found. Beginning initial administrator setup.\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 2. Interactively collect credentials
    let username = "";
    let displayName = "";
    let password = "";

    try {
      // Username input & validation
      while (!username) {
        const rawUsername = await promptText(rl, "Enter administrator username (3-30 chars): ");
        const parseResult = usernameSchema.safeParse(rawUsername);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }

        // Check if username is already taken by a regular user
        const userExistsCheck = await client.query(
          `SELECT "id" FROM "User" WHERE LOWER("username") = LOWER($1) LIMIT 1;`,
          [parseResult.data]
        );

        if (userExistsCheck.rows.length > 0) {
          console.log("  [INVALID] This username is already registered. Please choose another.");
          continue;
        }

        username = parseResult.data;
      }

      // Display name input & validation
      while (!displayName) {
        const rawDisplayName = await promptText(rl, "Enter administrator display name: ");
        const parseResult = displayNameSchema.safeParse(rawDisplayName);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }
        displayName = parseResult.data;
      }

      // Close readline before masked password prompts
      rl.close();

      // Password input & confirmation
      while (!password) {
        const rawPass = await promptMasked("Enter administrator password (min 8 chars): ");
        const parseResult = passwordSchema.safeParse(rawPass);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }

        const confirmPass = await promptMasked("Confirm administrator password: ");
        if (rawPass !== confirmPass) {
          console.log("  [INVALID] Passwords do not match. Please re-enter.");
          continue;
        }

        password = parseResult.data;
      }
    } finally {
      rl.close();
    }

    // 3. Hash password using Argon2id with OWASP parameters
    console.log("\nHashing password using Argon2id (OWASP recommended parameters)...");
    const passwordHash = await hash(password, ARGON2ID_OPTIONS);

    // 4. Create the administrator user
    const userId = `admin_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "updatedAt")
      VALUES ($1, $2, $3, $4, 'ADMIN', 'avatar_1', NOW());
      `,
      [userId, username, displayName, passwordHash]
    );

    console.log(`\n[SUCCESS] Administrator account '@${username}' successfully created with ADMIN privileges.`);
    console.log("[INFO] You may now use these credentials to sign in once authentication interfaces are deployed.\n");
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute when run directly as CLI
if (process.argv[1] && process.argv[1].endsWith("bootstrap-admin.mjs")) {
  bootstrapAdmin().catch((err) => {
    console.error("\n[CRITICAL] Bootstrap failed:", err.message);
    process.exit(1);
  });
}

export { bootstrapAdmin };
