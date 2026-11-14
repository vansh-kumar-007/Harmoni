import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function runTests() {
  console.log("=== Harmoni PostgreSQL Integration Verification ===");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();

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
    const timestamp = Date.now();
    const u1Id = `test_u1_${timestamp}`;
    const u2Id = `test_u2_${timestamp}`;
    const username1 = `test_alice_${timestamp}`;
    const username2 = `test_bob_${timestamp}`;

    await client.query(`
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
      VALUES ($1, $2, 'Alice Tester', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash1', NOW());
    `, [u1Id, username1]);
    console.log(`[PASS] Created user 1: ${username1} (${u1Id})`);

    await client.query(`
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
      VALUES ($1, $2, 'Bob Tester', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash2', NOW());
    `, [u2Id, username2]);
    console.log(`[PASS] Created user 2: ${username2} (${u2Id})`);

    // Duplicate username test
    let duplicateRejected = false;
    try {
      await client.query(`
        INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "updatedAt")
        VALUES ('test_u_dup', $1, 'Duplicate Alice', '$argon2id$dummy', NOW());
      `, [username1]);
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
    // 5. Single-Use Invitation Code Test
    // -------------------------------------------------------------
    const invId1 = `test_inv1_${timestamp}`;
    const invId2 = `test_inv2_${timestamp}`;
    const codeHash1 = `hash_inv1_${timestamp}`;
    const codeHash2 = `hash_inv2_${timestamp}`;

    await client.query(`
      INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "createdAt")
      VALUES ($1, $2, $3, NOW());
    `, [invId1, codeHash1, u1Id]);
    console.log(`[PASS] Created single-use invite code created by ${username1}`);

    // User 2 redeems the invite
    await client.query(`
      UPDATE "InviteCode"
      SET "usedById" = $1
      WHERE "id" = $2;
    `, [u2Id, invId1]);
    console.log(`[PASS] Invite code redeemed successfully by ${username2}`);

    // Attempt second redemption: user 2 tries to redeem a second invite code
    let reusePrevented = false;
    try {
      await client.query(`
        INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "usedById", "createdAt")
        VALUES ($1, $2, $3, $4, NOW());
      `, [invId2, codeHash2, u1Id, u2Id]);
    } catch (err) {
      if (err.code === "23505") { // unique_violation on usedById
        reusePrevented = true;
      } else {
        throw err;
      }
    }
    if (!reusePrevented) {
      throw new Error("Invite code @unique usedById was not enforced!");
    }
    console.log("[PASS] Single-use invite constraint: each user can only redeem at most one invite code (SQLSTATE 23505).");

    // -------------------------------------------------------------
    // 6. Friendship Canonical Ordering & Self-Friendship Prevention
    // -------------------------------------------------------------
    // Canonical order: userAId must be strictly less than userBId
    const [userA, userB] = u1Id < u2Id ? [u1Id, u2Id] : [u2Id, u1Id];

    // Valid canonical friendship
    const fId = `test_f_${timestamp}`;
    await client.query(`
      INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
      VALUES ($1, $2, $3, $4, 'PENDING', NOW());
    `, [fId, userA, userB, userA]);
    console.log(`[PASS] Canonical friendship created (${userA} -> ${userB})`);

    // Inverted ordering violation test
    let invertedFriendshipRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ('test_f_inv', $1, $2, $1, 'PENDING', NOW());
      `, [userB, userA]); // Inverted! userB > userA
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

    // Self-friendship violation test
    let selfFriendshipRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ('test_f_self', $1, $1, $1, 'PENDING', NOW());
      `, [userA]);
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

    // Invalid initiator test (initiator not part of pair)
    let invalidInitiatorRejected = false;
    try {
      await client.query(`
        INSERT INTO "Friendship" ("id", "userAId", "userBId", "initiatorId", "status", "updatedAt")
        VALUES ('test_f_bad_init', $1, $2, 'some_outsider_id', 'PENDING', NOW());
      `, [userA, userB]);
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
    const convId = `test_c_${timestamp}`;
    await client.query(`
      INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
      VALUES ($1, $2, $3, NOW());
    `, [convId, userA, userB]);
    console.log(`[PASS] Canonical conversation created between ${userA} and ${userB}`);

    // Inverted conversation test
    let invertedConvRejected = false;
    try {
      await client.query(`
        INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
        VALUES ('test_c_inv', $1, $2, NOW());
      `, [userB, userA]);
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

    // Self-conversation test
    let selfConvRejected = false;
    try {
      await client.query(`
        INSERT INTO "Conversation" ("id", "userAId", "userBId", "updatedAt")
        VALUES ('test_c_self', $1, $1, NOW());
      `, [userA]);
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
    const msgId = `test_m_${timestamp}`;
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
    console.log(`[PASS] Deleted user 1 (${u1Id})`);

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

    // Delete user 2 (Bob)
    await client.query(`DELETE FROM "User" WHERE "id" = $1;`, [u2Id]);
    console.log(`[PASS] Deleted user 2 (${u2Id})`);

    // -------------------------------------------------------------
    // 10. Cleanliness Verification
    // -------------------------------------------------------------
    const cleanCheck = await client.query(`
      SELECT count(*) as count FROM "User" WHERE "id" IN ($1, $2);
    `, [u1Id, u2Id]);
    if (parseInt(cleanCheck.rows[0].count, 10) !== 0) {
      throw new Error("Temporary test users were not completely cleaned up!");
    }
    console.log("[PASS] Database cleanliness verified: 0 temporary test records remain.");

    console.log("=== ALL INTEGRATION & INTEGRITY TESTS PASSED SUCCESSFULLY ===");
  } finally {
    // Ensure any leftover test records starting with test_ are safely wiped
    try {
      await client.query(`DELETE FROM "User" WHERE "id" LIKE 'test_%' OR "username" LIKE 'test_%';`);
    } catch {}
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("[FAIL] Integration test failed:", err);
  process.exit(1);
});
