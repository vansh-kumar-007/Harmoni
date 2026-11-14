# Harmoni — Development Status

## 1. Project Overview
Harmoni is an open-source, personal-scale social music web application designed for a private circle of 5–15 friends. It combines music discovery, legal playback, listening history tracking, and direct music sharing at **₹0 INR recurring cost**.

- **Repository:** `https://github.com/vansh-kumar-007/Harmoni.git`
- **Default Branch:** `main`
- **License:** AGPL-3.0

---

## 2. Current Milestone
**Milestone 2C: Invitation Redemption Integrity Test Correction** (COMPLETED & VERIFIED)

---

## 3. Completed Work

### Milestone 1: Project Foundation & GitHub Initialization
- [x] Initialized Git repository on `main` branch with remote configured to `origin`.
- [x] Scaffolded Next.js 16.4.6 project using `pnpm` with App Router, React 19.3.0, and TypeScript strict mode.
- [x] Integrated Tailwind CSS v4 using `@tailwindcss/postcss` and PostCSS.
- [x] Initialized shadcn/ui configuration (`components.json`) and core utilities (`src/lib/utils.ts`).
- [x] Created strict `.gitignore` blocking node modules, build artifacts, environment files, local databases, and secrets.
- [x] Established `AGENTS.md`, `README.md`, `DEVELOPMENT_STATUS.md`, and `LICENSE` (AGPL-3.0).
- [x] Verified build and runtime; pushed initial commit (`5597976`) to `origin/main`.

### Milestone 2A: Database Architecture & Prisma Foundation
- [x] Installed Prisma ORM `7.10.1`, `@prisma/client` `7.10.1`, `@prisma/adapter-pg` `7.10.1`, `pg` `8.23.1`, and `server-only`.
- [x] Configured Prisma 7 central configuration file (`prisma.config.ts`) using `defineConfig` from `prisma/config`.
- [x] Designed normalized, decoupled database schema (`prisma/schema.prisma`):
  - **Identity & Sessions:** `User` (with `avatarKey`, `bio`, `role`), `Session` (stores `sessionTokenHash`), `InviteCode` (stores `codeHash`, audit links).
  - **Social Relationships:** `Friendship` with strict canonical pair uniqueness (`userAId < userBId`) and `initiatorId`.
  - **Music Catalog:** `Track` (canonical metadata independent of audio streams) and `AudioSource` (pluggable providers, permanent provider IDs, transient stream URLs, CC license and attribution tracking).
  - **Personal Library:** `LikedTrack`, `Playlist`, `PlaylistTrack` (ordered tracks).
  - **Listening History:** `Scrobble` (genuine playback events at >= 50% duration or 30s).
  - **Direct Messaging:** `Conversation` (canonical pair uniqueness `userAId < userBId`), `Message` (with optional `sharedTrackId`).
- [x] Created reusable server-side database client (`src/lib/db.ts`) with development singleton caching and PostgreSQL connection pooling (`pg.Pool` + `PrismaPg`).
- [x] Ignored generated Prisma client directory (`/src/generated/`) in `.gitignore`.
- [x] Configured package build hooks (`"postinstall": "prisma generate"`, `"build": "prisma generate && next build --webpack"`).
- [x] Verified schema validation (`pnpm db:validate`), client generation (`pnpm db:generate`), typechecking (`pnpm typecheck`), linting (`pnpm lint`), and production build (`pnpm build`).

### Milestone 2B: PostgreSQL Migration, Schema Audit & Database Verification
- [x] Audited and refactored Prisma schema:
  - Simplified `InviteCode` to strictly single-use redemption derived from `@unique usedById` (removed `maxUses`, `timesUsed`, and `isUsed`).
  - Streamlined `Conversation` to canonical pair (`userAId < userBId`) with `userALastReadAt` and `userBLastReadAt` read receipts; removed redundant `ConversationParticipant` join table.
  - Verified relational integrity, unique indexes, and cascade delete rules across all models.
- [x] Generated initial migration (`20261115021000_init/migration.sql`) and created `prisma/migrations/migration_lock.toml` for PostgreSQL.
- [x] Embedded custom PostgreSQL CHECK constraints directly in migration SQL:
  - `friendship_canonical_ordering_check` (`"userAId" < "userBId"`)
  - `friendship_no_self_check` (`"userAId" <> "userBId"`)
  - `friendship_initiator_check` (`"initiatorId" = "userAId" OR "initiatorId" = "userBId"`)
  - `conversation_canonical_ordering_check` (`"userAId" < "userBId"`)
  - `conversation_no_self_check` (`"userAId" <> "userBId"`)
- [x] Applied migration to local PostgreSQL 18.4 database (`harmoni`) using `prisma migrate deploy` under dedicated role `harmoni_app`.
- [x] Created automated database integration test suite (`scripts/verify-db.mjs`, executable via `pnpm db:test`).
- [x] Added `db:migrate:status`, `db:migrate:deploy`, and `db:test` scripts to `package.json`.
- [x] Confirmed `.env` is properly gitignored and credentials remain secret.
- [x] Verified full pipeline: `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 2C: Invitation Redemption Integrity Test Correction
- [x] Corrected invitation redemption test suite in `scripts/verify-db.mjs` to rigorously test atomic conditional redemption semantics:
  - **Test 5.1 (Unused Invitation):** Atomic conditional `UPDATE ... WHERE "codeHash" = $2 AND "usedById" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > NOW()) RETURNING "id"` updates exactly 1 row and associates `usedById`.
  - **Test 5.2 (Sequential Re-Redemption):** Attempt by a second user to redeem an already-consumed invitation matches 0 rows (returns 0 rows), rejecting consumption while preserving the original redeemer.
  - **Test 5.3 (Simultaneous Concurrent Redemption Race):** Genuine concurrency test using two independent PostgreSQL client connections via `Promise.all` confirms row-level locks serialize redemption: exactly 1 user succeeds (returns 1 row) and the other is atomically rejected (returns 0 rows).
  - **Test 5.4 (Expired Invitation):** Attempt to redeem an invitation where `expiresAt < NOW()` matches 0 rows (returns 0 rows; `usedById` remains `NULL`).
  - **Test 5.5 (Multi-Redemption Policy):** Attempt by a user who already redeemed an invitation to redeem another is blocked by PostgreSQL unique constraint on `usedById` (SQLSTATE 23505; second invite `usedById` remains `NULL`).
- [x] Documented mandatory architecture requirement for Milestone 3 authentication: user creation and invitation consumption MUST run within a single atomic database transaction with verification that exactly 1 row was updated.
- [x] Confirmed database schema and existing migration remain safe and unchanged.
- [x] Re-verified all checks: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

---

## 4. Remaining Milestones Roadmap
- **Milestone 3: Invitation-Based Authentication & User Profiles**
  - **Atomic Registration Transaction:** Combine user record creation, Argon2id password hashing, and atomic conditional invitation consumption in one single database transaction. If the invitation redemption returns 0 rows (expired/already used/invalid), automatically roll back the transaction.
  - Set up secure HTTP-only cookie session management and auth middleware.
  - Build public user profile page (`/@username`) with customizable preset SVG avatars.
- **Milestone 4: Music Discovery Engine & Jamendo API Integration**
  - Implement server-side Jamendo API client keeping credentials secret.
  - Create track, artist, and album search endpoints with server-side caching.
  - Parse and display verified Creative Commons license badges and artist attribution links.
- **Milestone 5: Persistent Audio Player & Queue Controller**
  - Implement global Zustand player store coordinating HTML5 audio state.
  - Build docked root-layout player bar (play/pause, seek scrubber, volume control, queue drawer).
  - Ensure audio playback persists uninterrupted across all route transitions.
- **Milestone 6: Personal Library, Playlists & Local Scrobbling**
  - Liked tracks collection and user playlist CRUD with track reordering.
  - Build internal 50%-rule / 30-second listening history engine.
  - Personal listening statistics dashboard (top tracks, top artists).
- **Milestone 7: Friendship Network & Direct Track-Sharing Chat**
  - Friend request sending, accepting, and mutual friend presence sidebar.
  - 1-on-1 direct messaging drawer using lightweight HTTP polling (zero paid sockets).
  - Share track functionality embedding an interactive **Track Card** in chat that plays directly inside the message.
- **Milestone 8: Final UI Polish, Free Deployment & Production Verification**
  - Responsive layout audit, dark studio theme polish, and accessibility pass.
  - Deployment verification on Vercel Hobby + Neon PostgreSQL Free tier at ₹0 INR.
  - Complete end-to-end user journey test.

---

## 5. Known Technical Limitations & Status
1. **Local PostgreSQL Service State:** PostgreSQL 18.4 is installed at `E:\Win_Softwares\PostgreSQL` (Windows service `postgresql-x64-18`), running and connected on `127.0.0.1:5432` with database `harmoni` and role `harmoni_app`. Initial migration and constraint verifications are complete and passed.
2. **Turbopack IPC Loader on Windows:** Stable webpack compilation (`--webpack`) is configured and verified for both dev and production builds.
3. **Neon PostgreSQL Free Scale-to-Zero:** Neon compute pauses after 5 minutes of idle time; the first incoming connection auto-wakes in ~300–500ms.

---

## 6. Current Dependencies & Licensing
- `next` (16.4.6) — MIT License
- `react` / `react-dom` (19.3.0) — MIT License
- `@prisma/client` / `prisma` (7.10.1) — Apache-2.0 License
- `@prisma/adapter-pg` (7.10.1) — Apache-2.0 License
- `pg` (8.23.1) / `@types/pg` (8.23.1) — MIT License
- `server-only` (0.0.1) — MIT License
- `dotenv` (18.0.10) — BSD-2-Clause License
- `tailwindcss` (4.3.3) / `@tailwindcss/postcss` (4.3.5) — MIT License
- `postcss` (8.5.32) — MIT License
- `clsx` (2.1.1) / `tailwind-merge` (3.7.0) — MIT License
- `class-variance-authority` (0.7.1) — Apache-2.0 License
- `lucide-react` (1.72.0) — ISC License
- `typescript` (5.9.3) — Apache-2.0 License
- `eslint` (9.39.5) / `eslint-config-next` (16.4.6) — MIT License

*Every dependency is strictly free, open-source, and compatible with AGPL-3.0.*

---

## 7. Budget & Cost Confirmation
- **Total Expenditure to Date:** **₹0.00 INR**
- **Permitted Future Expenditure:** **₹0.00 INR (Permanent)**
- **Paid Services Allowed:** None.
