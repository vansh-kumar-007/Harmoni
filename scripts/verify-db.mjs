import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

/**
 * Isolated cleanup targeting strictly explicit, tracked record IDs.
 * Never uses wildcard patterns (e.g. LIKE 'test_%' or LIKE 'hash_%').
 */
async function cleanupTrackedRecords(client, userIds, inviteIds) {
  if (inviteIds && inviteIds.length > 0) {
    await client.query(`DELETE FROM "InviteCode" WHERE "id" = ANY($1::text[]);`, [inviteIds]);
  }
  if (userIds && userIds.length > 0) {
    await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [userIds]);
  }
}

async function runTests() {
  console.log("=== Harmoni PostgreSQL Integration Verification ===");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();

  // Unique run identifier to prevent any collision across executions
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  // Explicit tracking arrays for all records created by this test run
  const createdUserIds = [];
  const createdInviteIds = [];

  // Track sentinel records separately for preservation testing
  let sentinelUserId = null;
  let sentinelInviteId = null;

  try {
    // -------------------------------------------------------------
    // 1. Connection & Safe Metadata Test
    // -------------------------------------------------------------
    const infoRes = await client.query(`
      SELECT 
        current_database() as db_name,
        current_user as db_user,
        version() as pg_version;
    `);
    const info = infoRes.rows[0];
    console.log(`[PASS] Connected to Database: "${info.db_name}" as User: "${info.db_user}"`);
    console.log(`[INFO] PostgreSQL Version: ${info.pg_version.split(",")[0]}`);
    console.log(`[INFO] Test Execution UUID: ${runId}`);

    // -------------------------------------------------------------
    // 2. Table Existence Test
    // -------------------------------------------------------------
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`[PASS] Discovered ${tables.length} tables in public schema: ${tables.join(", ")}`);

    const expectedTables = [
      "User",
      "Session",
      "InviteCode",
      "Friendship",
      "Track",
      "AudioSource",
      "LikedTrack",
      "Playlist",
      "PlaylistTrack",
      "Scrobble",
      "Conversation",
      "Message",
      "_prisma_migrations"
    ];

    for (const exp of expectedTables) {
      if (!tables.includes(exp)) {
        throw new Error(`Missing expected table: ${exp}`);
      }
    }
    console.log("[PASS] All 13 expected tables verified.");

    // -------------------------------------------------------------
    // 3. Custom CHECK Constraints Verification
    // -------------------------------------------------------------
    const constraintsRes = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'c'
      ORDER BY conname;
    `);

    const constraintMap = new Map(constraintsRes.rows.map(r => [r.conname, r.definition]));
    const expectedConstraints = [
      "friendship_canonical_ordering_check",
      "friendship_no_self_check",
      "friendship_initiator_check",
      "conversation_canonical_ordering_check",
      "conversation_no_self_check"
    ];

    for (const cName of expectedConstraints) {
      if (!constraintMap.has(cName)) {
        throw new Error(`Missing custom constraint: ${cName}`);
      }
      console.log(`[PASS] Constraint verified: ${cName} -> ${constraintMap.get(cName)}`);
    }

    // -------------------------------------------------------------
    // 4. User Creation & Uniqueness Test
    // -------------------------------------------------------------
    const u1Id = `u1_${runSlug}`;
    const u2Id = `u2_${runSlug}`;
    const u3Id = `u3_${runSlug}`;
    const u4Id = `u4_${runSlug}`;
    const u5Id = `u5_${runSlug}`;

    const username1 = `alice_${runSlug}`;
    const username2 = `bob_${runSlug}`;
    const username3 = `charlie_${runSlug}`;
    const username4 = `dana_${runSlug}`;
    const username5 = `evan_${runSlug}`;

    await client.query(`
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
      VALUES 
        ($1, $2, 'Alice Tester', '$argon2id$v=19$dummy1', NOW()),
        ($3, $4, 'Bob Tester', '$argon2id$v=19$dummy2', NOW()),
        ($5, $6, 'Charlie Tester', '$argon2id$v=19$dummy3', NOW()),
        ($7, $8, 'Dana Tester', '$argon2id$v=19$dummy4', NOW()),
        ($9, $10, 'Evan Tester', '$argon2id$v=19$dummy5', NOW());
    `, [u1Id, username1, u2Id, username2, u3Id, username3, u4Id, username4, u5Id, username5]);

    // Register all created user IDs immediately
    createdUserIds.push(u1Id, u2Id, u3Id, u4Id, u5Id);
    console.log(`[PASS] Created and registered test users: ${username1}, ${username2}, ${username3}, ${username4}, ${username5}`);

    // Duplicate username test with unique collision-safe ID
    const dupUserId = `dup_u_${runSlug}`;
    let duplicateRejected = false;
    try {
      await client.query(`
        INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
        VALUES ($1, $2, 'Duplicate Alice', '$argon2id$dummy', NOW());
      `, [dupUserId, username1]);
    } catch (err) {
      if (err.code === "23505") { // unique_violation
        duplicateRejected = true;
      } else {
        throw err;
      }
    }
    if (!duplicateRejected) {
      throw new Error("Unique username violation was not caught!");
    }
    console.log("[PASS] Unique username constraint successfully prevented duplicate user creation (SQLSTATE 23505).");

    // -------------------------------------------------------------
    // 5. ATOMIC SINGLE-USE INVITATION REDEMPTION INTEGRITY TESTS
    // -------------------------------------------------------------
    // Architecture Requirement for Milestone 3:
    // Registration must perform user creation and invitation redemption
    // in one single database transaction. The invitation MUST be consumed
    // atomically via a conditional UPDATE:
    //   UPDATE "InviteCode"
    //   SET "usedById" = $1
    //   WHERE "codeHash" = $2
    //     AND "usedById" IS NULL
    //     AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    //   RETURNING "id";
    // Exactly 1 row returned indicates success. 0 rows indicates failure/expiration/reuse,
    // requiring the registration transaction to roll back immediately.
    // Never implement invitation validation using a prior SELECT query.
    // -------------------------------------------------------------

    const atomicRedeemSql = `
      UPDATE "InviteCode"
      SET "usedById" = $1
      WHERE "codeHash" = $2
        AND "usedById" IS NULL
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      RETURNING "id";
    `;

    // --- Test 5.1: Unused invitation can be redeemed successfully ---
    const invId1 = `inv1_${runSlug}`;
    const codeHash1 = `hash_inv1_${runSlug}`;

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "createdAt")
      VALUES ($1, $2, $3, NOW());
    `, [invId1, codeHash1, u1Id]);
    createdInviteIds.push(invId1);

    const redeemRes1 = await client.query(atomicRedeemSql, [u2Id, codeHash1]);
    if (redeemRes1.rowCount !== 1 || redeemRes1.rows[0].id !== invId1) {
      throw new Error(`Expected 1 row returned for valid redemption, got ${redeemRes1.rowCount}`);
    }

    const checkDb1 = await client.query(`SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`, [invId1]);
    if (checkDb1.rows[0].usedById !== u2Id) {
      throw new Error(`Expected usedById to be ${u2Id}, got ${checkDb1.rows[0].usedById}`);
    }
    console.log(`[PASS] Test 5.1: Unused invitation redeemed successfully by ${username2} (returned 1 row).`);

    // --- Test 5.2: The same invitation cannot be redeemed by another user ---
    const redeemRes2 = await client.query(atomicRedeemSql, [u3Id, codeHash1]);
    if (redeemRes2.rowCount !== 0 || redeemRes2.rows.length !== 0) {
      throw new Error(`Expected 0 rows returned for duplicate redemption attempt, got ${redeemRes2.rowCount}`);
    }

    const checkDb2 = await client.query(`SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`, [invId1]);
    if (checkDb2.rows[0].usedById !== u2Id) {
      throw new Error(`Invitation usedById was modified on failed re-redemption!`);
    }
    console.log(`[PASS] Test 5.2: Sequential re-redemption of consumed invitation rejected atomically (returned 0 rows; preserved original redeemer).`);

    // --- Test 5.3: Simultaneous concurrent attempts to redeem the same invitation ---
    // Genuine concurrency test using two distinct database client connections
    const invConcurrentId = `inv_conc_${runSlug}`;
    const codeHashConcurrent = `hash_conc_${runSlug}`;

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "createdAt")
      VALUES ($1, $2, $3, NOW());
    `, [invConcurrentId, codeHashConcurrent, u1Id]);
    createdInviteIds.push(invConcurrentId);

    const clientA = await pool.connect();
    const clientB = await pool.connect();

    let concurrentResults;
    try {
      concurrentResults = await Promise.all([
        clientA.query(atomicRedeemSql, [u3Id, codeHashConcurrent]),
        clientB.query(atomicRedeemSql, [u4Id, codeHashConcurrent]),
      ]);
    } finally {
      clientA.release();
      clientB.release();
    }

    const [resA, resB] = concurrentResults;
    const totalSuccessful = (resA.rowCount === 1 ? 1 : 0) + (resB.rowCount === 1 ? 1 : 0);
    const totalRejected = (resA.rowCount === 0 ? 1 : 0) + (resB.rowCount === 0 ? 1 : 0);

    if (totalSuccessful !== 1 || totalRejected !== 1) {
      throw new Error(`Concurrent race condition failed! Successful: ${totalSuccessful}, Rejected: ${totalRejected}`);
    }

    const winnerId = resA.rowCount === 1 ? u3Id : u4Id;
    const winnerUsername = resA.rowCount === 1 ? username3 : username4;
    const loserUsername = resA.rowCount === 1 ? username4 : username3;

    const checkConcurrentDb = await client.query(`SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`, [invConcurrentId]);
    if (checkConcurrentDb.rows[0].usedById !== winnerId) {
      throw new Error(`Database state mismatch: expected winner ${winnerId}, got ${checkConcurrentDb.rows[0].usedById}`);
    }
    console.log(`[PASS] Test 5.3: Concurrent simultaneous redemption race test succeeded across independent DB connections! Winner: ${winnerUsername} (1 row), Loser: ${loserUsername} rejected (0 rows).`);

    // --- Test 5.4: An expired invitation cannot be redeemed ---
    const invExpiredId = `inv_exp_${runSlug}`;
    const codeHashExpired = `hash_exp_${runSlug}`;

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour', NOW());
    `, [invExpiredId, codeHashExpired, u1Id]);
    createdInviteIds.push(invExpiredId);

    const redeemExpiredRes = await client.query(atomicRedeemSql, [u5Id, codeHashExpired]);
    if (redeemExpiredRes.rowCount !== 0) {
      throw new Error(`Expired invitation was redeemed! Expected 0 rows, got ${redeemExpiredRes.rowCount}`);
    }

    const checkExpiredDb = await client.query(`SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`, [invExpiredId]);
    if (checkExpiredDb.rows[0].usedById !== null) {
      throw new Error(`Expired invitation usedById is not null!`);
    }
    console.log(`[PASS] Test 5.4: Expired invitation redemption rejected atomically (returned 0 rows; usedById remained NULL).`);

    // --- Test 5.5: An account cannot be associated with multiple redeemed invitations (unique usedById policy) ---
    // User 2 already redeemed codeHash1 in Test 5.1.
    const invPolicyId = `inv_pol_${runSlug}`;
    const codeHashPolicy = `hash_pol_${runSlug}`;

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "createdAt")
      VALUES ($1, $2, $3, NOW());
    `, [invPolicyId, codeHashPolicy, u1Id]);
    createdInviteIds.push(invPolicyId);

    let policyViolationCaught = false;
    try {
      // User 2 tries to redeem a second invite code
      await client.query(atomicRedeemSql, [u2Id, codeHashPolicy]);
    } catch (err) {
      if (err.code === "23505") { // unique_violation on usedById
        policyViolationCaught = true;
      } else {
        throw err;
      }
    }

    if (!policyViolationCaught) {
      throw new Error("Multiple invite redemption by the same user was not rejected by unique usedById constraint!");
    }

    const checkPolicyDb = await client.query(`SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`, [invPolicyId]);
    if (checkPolicyDb.rows[0].usedById !== null) {
      throw new Error(`Failed policy redemption left usedById populated!`);
    }
    console.log(`[PASS] Test 5.5: Single-user multiple-redemption rejected by PostgreSQL unique constraint on usedById (SQLSTATE 23505; usedById remained NULL).`);

    // -------------------------------------------------------------
    // 6. Friendship Canonical Ordering & Self-Friendship Prevention
    // -------------------------------------------------------------
    // Canonical order: userAId must be strictly less than userBId
    const [userA, userB] = u1Id < u2Id ? [u1Id, u2Id] : [u2Id, u1Id];

    // Valid canonical friendship
    const fId = `f_val_${runSlug}`;
    await client.query(`
      INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
      VALUES ($1, $2, $3, $4, 'PENDING', NOW());
    `, [fId, userA, userB, userA]);
    console.log(`[PASS] Canonical friendship created (${userA} -> ${userB})`);

    // Inverted ordering violation test with unique collision-safe ID
    const fInvId = `f_inv_${runSlug}`;
    let invertedFriendshipRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ($1, $2, $3, $2, 'PENDING', NOW());
      `, [fInvId, userB, userA]); // Inverted! userB > userA
    } catch (err) {
      if (err.message && err.message.includes("friendship_canonical_ordering_check")) {
        invertedFriendshipRejected = true;
      } else {
        throw err;
      }
    }
    if (!invertedFriendshipRejected) {
      throw new Error("Friendship canonical ordering CHECK constraint failed to reject inverted userAId/userBId!");
    }
    console.log("[PASS] PostgreSQL CHECK constraint 'friendship_canonical_ordering_check' rejected inverted pair.");

    // Self-friendship violation test with unique collision-safe ID
    const fSelfId = `f_self_${runSlug}`;
    let selfFriendshipRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ($1, $2, $2, $2, 'PENDING', NOW());
      `, [fSelfId, userA]);
    } catch (err) {
      if (err.message && (err.message.includes("friendship_no_self_check") || err.message.includes("friendship_canonical_ordering_check"))) {
        selfFriendshipRejected = true;
      } else {
        throw err;
      }
    }
    if (!selfFriendshipRejected) {
      throw new Error("Self-friendship CHECK constraint failed to reject identical user IDs!");
    }
    console.log("[PASS] PostgreSQL CHECK constraint rejected self-friendship.");

    // Invalid initiator test (initiator not part of pair) with unique collision-safe ID
    const fBadInitId = `f_bad_init_${runSlug}`;
    const outsiderId = `outsider_${runSlug}`;
    let invalidInitiatorRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ($1, $2, $3, $4, 'PENDING', NOW());
      `, [fBadInitId, userA, userB, outsiderId]);
    } catch (err) {
      if (err.message && err.message.includes("friendship_initiator_check")) {
        invalidInitiatorRejected = true;
      } else {
        throw err;
      }
    }
    if (!invalidInitiatorRejected) {
      throw new Error("Friendship initiator CHECK constraint failed to reject non-participant initiator!");
    }
    console.log("[PASS] PostgreSQL CHECK constraint 'friendship_initiator_check' rejected outsider initiator.");

    // -------------------------------------------------------------
    // 7. Conversation Canonical Ordering & Self-Conversation Prevention
    // -------------------------------------------------------------
    const convId = `c_val_${runSlug}`;
    await client.query(`
      INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
      VALUES ($1, $2, $3, NOW());
    `, [convId, userA, userB]);
    console.log(`[PASS] Canonical conversation created between ${userA} and ${userB}`);

    // Inverted conversation test with unique collision-safe ID
    const cInvId = `c_inv_${runSlug}`;
    let invertedConvRejected = false;
    try {
      await client.query(`
        INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
        VALUES ($1, $2, $3, NOW());
      `, [cInvId, userB, userA]);
    } catch (err) {
      if (err.message && err.message.includes("conversation_canonical_ordering_check")) {
        invertedConvRejected = true;
      } else {
        throw err;
      }
    }
    if (!invertedConvRejected) {
      throw new Error("Conversation canonical ordering CHECK constraint failed to reject inverted user IDs!");
    }
    console.log("[PASS] PostgreSQL CHECK constraint 'conversation_canonical_ordering_check' rejected inverted pair.");

    // Self-conversation test with unique collision-safe ID
    const cSelfId = `c_self_${runSlug}`;
    let selfConvRejected = false;
    try {
      await client.query(`
        INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
        VALUES ($1, $2, $2, NOW());
      `, [cSelfId, userA]);
    } catch (err) {
      if (err.message && (err.message.includes("conversation_no_self_check") || err.message.includes("conversation_canonical_ordering_check"))) {
        selfConvRejected = true;
      } else {
        throw err;
      }
    }
    if (!selfConvRejected) {
      throw new Error("Self-conversation CHECK constraint failed to reject identical user IDs!");
    }
    console.log("[PASS] PostgreSQL CHECK constraint rejected self-conversation.");

    // -------------------------------------------------------------
    // 8. Message & Sender Relationships
    // -------------------------------------------------------------
    const msgId = `m_val_${runSlug}`;
    await client.query(`
      INSERT INTO "Message" ("id", "conversationId", "senderId", "content", "createdAt")
      VALUES ($1, $2, $3, 'Hey, check out this track on Harmoni!', NOW());
    `, [msgId, convId, userA]);
    console.log(`[PASS] Message created (${msgId}) by ${userA} in conversation (${convId})`);

    const msgQueryRes = await client.query(`
      SELECT 
        c.id as conv_id, 
        m.id as msg_id, 
        m.content, 
        u."displayName" as sender_name
      FROM "Conversation" c
      JOIN "Message" m ON m."conversationId" = c.id
      JOIN "User" u ON u.id = m."senderId"
      WHERE c.id = $1;
    `, [convId]);

    if (msgQueryRes.rows.length !== 1 || msgQueryRes.rows[0].sender_name !== "Alice Tester") {
      throw new Error("Failed to query conversation with joined message and sender");
    }
    console.log(`[PASS] Successfully queried conversation with message and sender relationship: "${msgQueryRes.rows[0].sender_name}: ${msgQueryRes.rows[0].content}"`);

    // -------------------------------------------------------------
    // 9. Cascade Behaviour Verification
    // -------------------------------------------------------------
    // Deleting user 1 (Alice) must cascade delete friendship, conversation, messages, and created invites
    await client.query(`DELETE FROM "User" WHERE "id" = $1;`, [u1Id]);
    console.log(`[PASS] Deleted user 1 (${u1Id}) via targeted ID deletion`);

    const convCheck = await client.query(`SELECT id FROM "Conversation" WHERE id = $1;`, [convId]);
    if (convCheck.rows.length !== 0) {
      throw new Error("Conversation was not cascade deleted!");
    }

    const msgCheck = await client.query(`SELECT id FROM "Message" WHERE id = $1;`, [msgId]);
    if (msgCheck.rows.length !== 0) {
      throw new Error("Message was not cascade deleted!");
    }

    const fCheck = await client.query(`SELECT id FROM "Friendship" WHERE id = $1;`, [fId]);
    if (fCheck.rows.length !== 0) {
      throw new Error("Friendship was not cascade deleted!");
    }

    const invCheck = await client.query(`SELECT id FROM "InviteCode" WHERE id = $1;`, [invId1]);
    if (invCheck.rows.length !== 0) {
      throw new Error("InviteCode was not cascade deleted!");
    }
    console.log("[PASS] Cascade deletion verified across Conversation, Message, Friendship, and InviteCode.");

    // -------------------------------------------------------------
    // 10. SENTINEL DATABASE PRESERVATION TEST
    // -------------------------------------------------------------
    // Prove that legitimate records beginning with 'test_' or 'hash_'
    // that are NOT in the test cleanup arrays are completely preserved.
    sentinelUserId = `sent_u_${runSlug}`;
    const sentinelUsername = `test_sentinel_user_${runSlug}`;
    sentinelInviteId = `sent_inv_${runSlug}`;
    const sentinelCodeHash = `hash_sentinel_${runSlug}`;

    // Create sentinel records (deliberately NOT added to createdUserIds / createdInviteIds)
    await client.query(`
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
      VALUES ($1, $2, 'Sentinel Legitimate User', '$argon2id$v=19$dummy', NOW());
    `, [sentinelUserId, sentinelUsername]);

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "createdAt")
      VALUES ($1, $2, $3, NOW());
    `, [sentinelInviteId, sentinelCodeHash, sentinelUserId]);

    console.log(`[PASS] Created untracked sentinel user (${sentinelUsername}) and sentinel invite (${sentinelCodeHash})`);

    // Execute targeted cleanup of the test's tracked records (remaining users u2, u3, u4, u5 and invites)
    await cleanupTrackedRecords(client, createdUserIds, createdInviteIds);
    console.log("[PASS] Executed targeted cleanup on tracked IDs (createdUserIds and createdInviteIds)");

    // Verification 10A: Confirm tracked test records are deleted
    const trackedUsersCheck = await client.query(`SELECT id FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
    const trackedInvitesCheck = await client.query(`SELECT id FROM "InviteCode" WHERE "id" = ANY($1::text[]);`, [createdInviteIds]);
    if (trackedUsersCheck.rows.length !== 0 || trackedInvitesCheck.rows.length !== 0) {
      throw new Error(`Tracked test records failed to delete: ${trackedUsersCheck.rows.length} users, ${trackedInvitesCheck.rows.length} invites remaining.`);
    }
    console.log("[PASS] All tracked test users and test invitations were successfully removed.");

    // Verification 10B: Confirm sentinel user and sentinel invite STILL EXIST
    const sentinelUserCheck = await client.query(`SELECT id, username FROM "User" WHERE "id" = $1;`, [sentinelUserId]);
    const sentinelInviteCheck = await client.query(`SELECT id, "codeHash" FROM "InviteCode" WHERE "id" = $1;`, [sentinelInviteId]);

    if (sentinelUserCheck.rows.length !== 1) {
      throw new Error("PRESERVATION FAILURE: Sentinel user was erroneously deleted during test cleanup!");
    }
    if (sentinelInviteCheck.rows.length !== 1) {
      throw new Error("PRESERVATION FAILURE: Sentinel invite was erroneously deleted during test cleanup!");
    }
    console.log(`[PASS] PRESERVATION PROVEN: Sentinel user (${sentinelUserCheck.rows[0].username}) and invite (${sentinelInviteCheck.rows[0].codeHash}) were preserved unharmed.`);

    // Clean up sentinel records explicitly by exact ID
    await client.query(`DELETE FROM "User" WHERE "id" = $1;`, [sentinelUserId]);
    sentinelUserId = null;
    sentinelInviteId = null;
    console.log("[PASS] Explicitly removed sentinel records by exact ID.");

    // -------------------------------------------------------------
    // 11. Final Cleanliness Verification
    // -------------------------------------------------------------
    const finalUserCheck = await client.query(`SELECT count(*) as count FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
    const finalInvCheck = await client.query(`SELECT count(*) as count FROM "InviteCode" WHERE "id" = ANY($1::text[]);`, [createdInviteIds]);

    if (parseInt(finalUserCheck.rows[0].count, 10) !== 0 || parseInt(finalInvCheck.rows[0].count, 10) !== 0) {
      throw new Error("Final cleanliness check failed: tracked records still exist!");
    }
    console.log("[PASS] Database cleanliness confirmed: 0 tracked test records remain in PostgreSQL.");

    console.log("=== ALL INTEGRATION & INTEGRITY TESTS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("[CRITICAL] Test execution failed:", err);
    // Explicit, targeted cleanup in case of failure — without silent catch blocks
    try {
      if (createdUserIds.length > 0 || createdInviteIds.length > 0) {
        await cleanupTrackedRecords(client, createdUserIds, createdInviteIds);
        console.log("[INFO] Cleaned up tracked test records after test failure.");
      }
      if (sentinelUserId) {
        await client.query(`DELETE FROM "User" WHERE "id" = $1;`, [sentinelUserId]);
        console.log("[INFO] Cleaned up sentinel user after test failure.");
      }
    } catch (cleanupErr) {
      console.error("[CRITICAL] Secondary cleanup encountered an error:", cleanupErr);
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("[FAIL] Integration test failed with error:", err.message);
  process.exit(1);
});
