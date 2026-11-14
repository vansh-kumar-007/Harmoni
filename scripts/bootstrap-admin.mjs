import "dotenv/config";
import readline from "node:readline";
import crypto from "node:crypto";
import pg from "pg";
import { hashPassword, usernameSchema, displayNameSchema, passwordSchema } from "../src/lib/auth/password.ts";

const { Pool } = pg;

/**
 * 64-bit unique constant for PostgreSQL advisory lock.
 * Serializes administrator bootstrap across concurrent CLI processes.
 */
export const HARMONI_BOOTSTRAP_LOCK_ID = "847291048172901";

/**
 * Ensures terminal raw mode is safely disabled and stdin resumed/paused cleanly.
 */
export function restoreRawMode() {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    try {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Prompts for standard text input using readline.
 */
function promptText(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts for masked password input in the terminal (echoes asterisks).
 * Strictly requires a genuine interactive TTY. Non-interactive input is rejected.
 */
export function promptMasked(query) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      return reject(
        new Error(
          "Interactive terminal (TTY) is strictly required for secure password entry. Non-interactive execution is rejected."
        )
      );
    }

    process.stdout.write(query);
    let input = "";
    const stdin = process.stdin;

    function cleanup() {
      restoreRawMode();
      stdin.removeListener("data", onData);
    }

    function onData(ch) {
      try {
        const charCode = ch.charCodeAt(0);
        if (ch === "\r" || ch === "\n" || charCode === 13 || charCode === 10) {
          cleanup();
          process.stdout.write("\n");
          resolve(input);
        } else if (ch === "\u0003") {
          // Ctrl+C
          cleanup();
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
      } catch (err) {
        cleanup();
        reject(err);
      }
    }

    try {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      stdin.on("data", onData);
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

/**
 * Checks whether an administrator account already exists in the database.
 */
export async function checkAdminExists(client) {
  const res = await client.query(
    `SELECT "id", "username" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;`
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Atomically creates an administrator user while holding a PostgreSQL advisory lock.
 * Serializes concurrent executions and guarantees at most one bootstrap succeeds.
 */
export async function createAdminWithLock(client, { username, displayName, password, customId }) {
  // Acquire session-level advisory lock
  await client.query(`SELECT pg_advisory_lock($1::bigint);`, [HARMONI_BOOTSTRAP_LOCK_ID]);

  try {
    // 1. Re-check admin existence under lock protection
    const existingAdmin = await checkAdminExists(client);
    if (existingAdmin) {
      return {
        success: false,
        reason: "ALREADY_EXISTS",
        existingAdmin,
      };
    }

    // 2. Check if username is already taken by any user
    const userExistsCheck = await client.query(
      `SELECT "id" FROM "User" WHERE LOWER("username") = LOWER($1) LIMIT 1;`,
      [username]
    );
    if (userExistsCheck.rows.length > 0) {
      return {
        success: false,
        reason: "USERNAME_TAKEN",
      };
    }

    // 3. Hash password using actual Argon2id implementation
    const passwordHash = await hashPassword(password);

    // 4. Insert new administrator
    const userId = customId || `admin_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "updatedAt")
      VALUES ($1, $2, $3, $4, 'ADMIN', 'avatar_1', NOW());
      `,
      [userId, username, displayName, passwordHash]
    );

    return {
      success: true,
      userId,
      username,
    };
  } finally {
    // Always release advisory lock
    await client.query(`SELECT pg_advisory_unlock($1::bigint);`, [HARMONI_BOOTSTRAP_LOCK_ID]).catch(() => {});
  }
}

/**
 * Interactive CLI runner.
 */
async function bootstrapAdmin() {
  console.log("=================================================");
  console.log(" Harmoni — Administrator Account Bootstrap CLI   ");
  console.log("=================================================\n");

  if (!process.stdin.isTTY) {
    console.error("[ERROR] Non-interactive execution is rejected.");
    console.error("[ERROR] An interactive terminal (TTY) is required to securely bootstrap an administrator.");
    process.exit(1);
  }

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
    // Pre-check for existing admin before prompting
    const existingAdmin = await checkAdminExists(client);
    if (existingAdmin) {
      console.log("[INFO] An administrator account already exists in this database.");
      console.log(`[INFO] Existing admin username: @${existingAdmin.username}`);
      console.log("[INFO] Additional administrator accounts cannot be bootstrapped via this CLI.");
      return;
    }

    console.log("No administrator account found. Beginning initial administrator setup.\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let username = "";
    let displayName = "";
    let password = "";

    try {
      // Username prompt
      while (!username) {
        const rawUsername = await promptText(rl, "Enter administrator username (3-30 chars): ");
        const parseResult = usernameSchema.safeParse(rawUsername);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }

        const userExists = await client.query(
          `SELECT "id" FROM "User" WHERE LOWER("username") = LOWER($1) LIMIT 1;`,
          [parseResult.data]
        );
        if (userExists.rows.length > 0) {
          console.log("  [INVALID] This username is already registered. Please choose another.");
          continue;
        }

        username = parseResult.data;
      }

      // Display name prompt
      while (!displayName) {
        const rawDisplayName = await promptText(rl, "Enter administrator display name: ");
        const parseResult = displayNameSchema.safeParse(rawDisplayName);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }
        displayName = parseResult.data;
      }

      // Close readline before masked password entry
      rl.close();

      // Masked password prompt
      while (!password) {
        let rawPass = "";
        try {
          rawPass = await promptMasked("Enter administrator password (min 8 chars): ");
        } catch (err) {
          restoreRawMode();
          throw err;
        }

        const parseResult = passwordSchema.safeParse(rawPass);
        if (!parseResult.success) {
          console.log(`  [INVALID] ${parseResult.error.issues[0].message}`);
          continue;
        }

        let confirmPass = "";
        try {
          confirmPass = await promptMasked("Confirm administrator password: ");
        } catch (err) {
          restoreRawMode();
          throw err;
        }

        if (rawPass !== confirmPass) {
          console.log("  [INVALID] Passwords do not match. Please re-enter.");
          continue;
        }

        password = parseResult.data;
      }
    } finally {
      restoreRawMode();
      rl.close();
    }

    console.log("\nAcquiring bootstrap advisory lock & creating administrator...");
    const result = await createAdminWithLock(client, { username, displayName, password });

    if (!result.success) {
      if (result.reason === "ALREADY_EXISTS") {
        console.log(`[INFO] Another process created an administrator (@${result.existingAdmin.username}) concurrently.`);
        return;
      }
      if (result.reason === "USERNAME_TAKEN") {
        console.log("[ERROR] The username was claimed concurrently by another user.");
        return;
      }
    }

    console.log(`\n[SUCCESS] Administrator account '@${result.username}' successfully created with ADMIN privileges.`);
    console.log("[INFO] You may now use these credentials to sign in once authentication interfaces are deployed.\n");
  } finally {
    restoreRawMode();
    client.release();
    await pool.end();
  }
}

// Execute when run directly as CLI
if (process.argv[1] && process.argv[1].endsWith("bootstrap-admin.mjs")) {
  bootstrapAdmin().catch((err) => {
    restoreRawMode();
    console.error("\n[CRITICAL] Bootstrap failed:", err.message);
    process.exit(1);
  });
}
