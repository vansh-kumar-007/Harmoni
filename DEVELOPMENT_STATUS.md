# Harmoni — Development Status

## 1. Project Overview
Harmoni is an open-source, personal-scale social music web application designed for a private circle of 5–15 friends. It combines music discovery, legal playback, listening history tracking, and direct music sharing at **₹0 INR recurring cost**.

- **Repository:** `https://github.com/vansh-kumar-007/Harmoni.git`
- **Default Branch:** `main`
- **License:** AGPL-3.0

---

## 2. Current Milestone
**Milestone 3C.0: Visual Foundation Research & Design Specification** (PROPOSED — AWAITING REVIEW & APPROVAL)

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
- [x] Corrected invitation redemption test suite in `scripts/verify-db.mjs` to rigorously test atomic conditional redemption semantics (Tests 5.1–5.5).
- [x] Documented mandatory architecture requirement for Milestone 3 authentication: user creation and invitation consumption MUST run within a single atomic database transaction with verification that exactly 1 row was updated.
- [x] Confirmed database schema and existing migration remain safe and unchanged.
- [x] Re-verified all checks: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 2D: Safe Database Integration Test Cleanup
- [x] Refactored `scripts/verify-db.mjs` to eliminate all unsafe wildcard deletions (`LIKE 'test_%'`, `LIKE 'hash_%'`).
- [x] Implemented dynamic test execution isolation using `crypto.randomUUID()`:
  - Every temporary user, invitation, conversation, friendship, and message utilizes a unique execution slug (`runSlug`).
  - Completely eliminated static identifier collisions (`test_u_dup`, `test_f_inv`, etc.).
- [x] Implemented strictly targeted array tracking:
  - Maintained `createdUserIds` and `createdInviteIds` populated immediately upon successful record creation.
  - Performed all database cleanups using parameterized array queries (`WHERE "id" = ANY($1::text[])`).
- [x] Implemented Sentinel Database Preservation Test:
  - Inserted untracked sentinel user (`test_sentinel_user_<uuid>`) and sentinel invite (`hash_sentinel_<uuid>`) not included in cleanup arrays.
  - Executed targeted cleanup on tracked IDs.
  - Verified that all tracked test records were deleted, while the sentinel user and invitation were preserved completely unharmed.
  - Explicitly cleaned up sentinel records by exact ID.
- [x] Eliminated silent empty catch blocks; added explicit cleanup error reporting and failure handling.
- [x] Verified test repeatability across multiple runs with 0 leftover test fixtures.
- [x] Re-verified full project pipeline: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 3A: Secure Authentication Backend & Administrator Bootstrap
- [x] Evaluated authentication architectures (Better Auth, Auth.js, custom minimal Next.js DAL) and selected custom minimal DAL:
  - Supports pure username + password without forcing synthetic email addresses.
  - Matches existing Prisma schema perfectly with zero migration overhead.
  - Uses native database-backed sessions with cryptographic SHA-256 token hashing.
  - Aligns with Next.js 16 asynchronous cookie model and React `cache()`.
- [x] Implemented password hashing security (`src/lib/auth/password.ts`) using `@node-rs/argon2`:
  - OWASP Recommended Minimum Parameters: 19 MiB memory cost (19456 KiB), 2 iterations, 1 parallelism, 32-byte output, Argon2id.
  - Zod schemas for username, display name, and password (min 8, max 1024, no arbitrary character rules).
  - Benchmarked locally at ~13ms per hash.
- [x] Implemented database-backed session engine (`src/lib/auth/session.ts`):
  - 256-bit cryptographically secure raw token generation (`crypto.randomBytes(32)`).
  - SHA-256 token hashing before PostgreSQL storage (raw token never saved in database).
  - 30-day session lifetime.
  - Session revocation on logout and multi-session revocation support.
- [x] Implemented secure HTTP-only cookie utilities (`src/lib/auth/cookies.ts`):
  - `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production via Next.js 16 async `cookies()`.
- [x] Implemented Centralized Data Access Layer (`src/lib/auth/dal.ts`):
  - Request-memoized `getCurrentUser()` via React `cache()`.
  - `requireUser()` and `requireAdmin()` with strict role verification and typed `AuthError`.
  - Sensitive field redaction via `SafeUser` DTO.
- [x] Built interactive Administrator Bootstrap CLI (`scripts/bootstrap-admin.mjs` / `pnpm auth:bootstrap-admin`):
  - Idempotent: checks for existing `ADMIN` and refuses duplicate creation.
  - Interactive masked password prompts with confirmation in terminal.
  - Strict input validation via Zod before Argon2id hashing.

### Milestone 3A.1: Authentication Implementation Audit & Hardening
- [x] Replaced duplicate test scripts with a direct source-importing Vitest TypeScript test suite (`tests/auth/password.test.ts`, `tests/auth/session.test.ts`, `tests/auth/dal.test.ts`, `tests/auth/bootstrap.test.ts`):
  - Imported real application modules directly from `@/lib/auth/password`, `@/lib/auth/session`, `@/lib/auth/dal`, `@/lib/auth/cookies`, and `scripts/bootstrap-admin.mjs`.
  - Removed obsolete `tests/auth.test.mjs` that duplicated logic instead of testing source code.
  - Added `vitest.config.mts` configuring `@/*` aliases and test mock for `server-only`.
- [x] Fixed session expiration semantics:
  - Enforced a fixed 30-day session lifetime from creation.
  - Removed incomplete sliding-window database mutations and unused constants (`SESSION_REFRESH_THRESHOLD_MS`).
  - Guaranteed safe date parsing and comparison (`new Date(expiresAt).getTime() <= Date.now()`).
- [x] Hardened DAL cookie handling for Next.js 16 Server Components:
  - Removed cookie deletion from read-only `getCurrentUser()` in `src/lib/auth/dal.ts` (Next.js Server Components disallow mutating cookies during render).
  - Cookie deletion is strictly reserved for Server Actions and Route Handlers on logout or rejection.
- [x] Hardened Administrator Bootstrap CLI (`scripts/bootstrap-admin.mjs`):
  - Added PostgreSQL session-level advisory locks (`SELECT pg_advisory_lock(847291048172901::bigint)`) with guaranteed cleanup via `finally { SELECT pg_advisory_unlock(...) }`.
  - Guaranteed serialized execution across concurrent CLI invocations; verified via integration test that exactly one bootstrap succeeds and concurrent attempts are rejected with `ALREADY_EXISTS`.
  - Rejected non-interactive execution immediately when `process.stdin.isTTY` is false (never accepts unmasked fallback).
  - Ensured terminal raw mode is cleanly restored via `restoreRawMode()` on all exit paths, exceptions, and Ctrl+C.
  - Guaranteed no real administrator account is created in tests or development (database confirmed at 0 users and 0 admins).
- [x] Re-verified full project pipeline: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm test:auth` (33 tests passing), `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 3B: Invitation Registration & Session Authentication Endpoints
- [x] Extended `createSession` in `src/lib/auth/session.ts` to be transaction-aware (`createSession(userId, tx?)`), enabling atomic registration + session creation within one transaction.
- [x] Built invitation engine (`src/lib/auth/invites.ts`):
  - `generateInviteCode()` generating 256 bits (32 bytes) of cryptographic entropy (64 hex characters).
  - Deterministic SHA-256 code hashing via `hashInviteCode()`.
  - `createInviteCode()` supporting bounded expiration periods (1 to 30 days, default 7 days) and persisting only the hash.
- [x] Implemented atomic registration service (`src/lib/auth/register.ts`):
  - Strict input validation using Zod schemas (`inviteCode`, `username`, `displayName`, `password`).
  - Mandatory atomic invariant: user creation, conditional invitation redemption (`usedById IS NULL`, `expiresAt IS NULL OR expiresAt > NOW()`), and session creation run in a single `db.$transaction`.
  - Verifies `inviteUpdate.count === 1`; aborts and rolls back the entire transaction if the invitation is invalid, expired, or already consumed, leaving 0 orphaned users.
  - Safe error handling without leaking database internals (P2002 username collision mapping to `RegistrationError`).
- [x] Implemented Next.js App Router Route Handlers:
  - `POST /api/auth/register` ([`src/app/api/auth/register/route.ts`](file:///d:/Projects/Harmoni/src/app/api/auth/register/route.ts)): Validates JSON payload and size, invokes atomic registration, issues secure HTTP-only session cookie, returns sanitized `SafeUser` with status 201 Created and `Cache-Control: no-store`.
  - `POST /api/auth/login` ([`src/app/api/auth/login/route.ts`](file:///d:/Projects/Harmoni/src/app/api/auth/login/route.ts)): Case-insensitive username lookup, constant-time Argon2id password verification, identical generic 401 response for unknown usernames and incorrect passwords (anti-enumeration), session creation, and secure cookie issuance.
  - `POST /api/auth/logout` ([`src/app/api/auth/logout/route.ts`](file:///d:/Projects/Harmoni/src/app/api/auth/logout/route.ts)): Idempotently revokes active PostgreSQL session and clears session cookie.
  - `POST /api/admin/invites` ([`src/app/api/admin/invites/route.ts`](file:///d:/Projects/Harmoni/src/app/api/admin/invites/route.ts)): Protected by `requireAdmin()`, rejects non-admins with 403 Forbidden, generates 256-bit secure invite, stores hash in DB, and returns raw code exactly once with `Cache-Control: no-store`.
- [x] Implemented comprehensive Vitest test suites:
  - `tests/auth/invites.test.ts` (10 tests)
  - `tests/auth/register.test.ts` (11 tests)
  - `tests/auth/login.test.ts` (10 tests)
  - Full suite expanded to **7 test files, 64 tests passing** with `fileParallelism: false` to ensure test database isolation.
  - Tested transaction rollback, race condition concurrency on single-use invitations, role restrictions, and cookie issuance.
- [x] Confirmed database cleanliness: 0 users, 0 admins, 0 invites, 0 sessions left in PostgreSQL after testing.
- [x] Re-verified full project pipeline: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm test:auth` (64 tests passing), `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 3B.1: Authentication API Security Audit & Corrections
- [x] Implemented robust request-body size enforcement and stream cancellation (`src/lib/auth/http.ts`):
  - Strictly enforced a 64 KiB payload limit (`MAX_REQUEST_BODY_BYTES`) on the actual bytes read from `request.body` stream.
  - Early rejection using `Content-Length` header when present, while also enforcing the limit during stream reading even when `Content-Length` is absent.
  - Immediately cancels the input stream via `reader.cancel()` as soon as the byte limit is exceeded to prevent server resource exhaustion.
  - Safe malformed JSON parsing with generic error responses without leaking Node.js parser internals.
- [x] Strict `Content-Type` media-type validation (`src/lib/auth/http.ts`):
  - Replaced naive substring matching (`.includes("application/json")`) with RFC-compliant media-type parsing (`isContentType`).
  - Correctly accepts valid parameters (e.g. `application/json; charset=utf-8`).
  - Strictly rejects non-JSON formats (`application/jsonp`, `text/plain`, etc.).
  - Enforced strict JSON validation for `/api/auth/register` and `/api/auth/login`.
  - For `/api/admin/invites`, accepted genuinely empty body (0 bytes) with 7-day default expiration, but strictly enforced `application/json` whenever a body is provided (rejecting non-JSON payloads with 415).
- [x] Login input validation and timing-attack protection (`src/lib/auth/password.ts`, `src/app/api/auth/login/route.ts`):
  - Reused canonical Zod `usernameSchema` and `passwordSchema` from `src/lib/auth/password.ts`.
  - Preserved identical generic 401 response for both unknown usernames and invalid passwords to prevent user enumeration.
  - Eliminated timing discrepancies by executing a dummy Argon2id password verification against a precomputed dummy hash (`DUMMY_PASSWORD_HASH`) with matching production parameters (`m=19456, t=2, p=1, algorithm=2`) when the username does not exist.
- [x] Safe administrator invitation error responses (`src/app/api/admin/invites/route.ts`):
  - Caught unexpected errors and returned a safe generic 500 response (`"An unexpected error occurred while creating the invitation"`).
  - Explicitly avoided exposing database error objects, table names, SQL details, or stack traces.
  - Preserved `Cache-Control: no-store` header on all error responses.
- [x] Expanded Vitest test suite (`tests/auth/http.test.ts`, `tests/auth/login.test.ts`, `tests/auth/invites.test.ts`, `tests/auth/register.test.ts`):
  - Added `tests/auth/http.test.ts` (17 tests) covering all branches of `isContentType`, stream limits, early rejection, stream cancellation, and JSON parsing.
  - Expanded `tests/auth/login.test.ts` (16 tests) to test dummy Argon2id timing protection, canonical Zod validation, `application/json; charset=utf-8`, `application/jsonp` rejection, and 64 KiB stream limit.
  - Expanded `tests/auth/register.test.ts` (14 tests) to test strict media-type handling and stream size enforcement.
  - Expanded `tests/auth/invites.test.ts` (13 tests) to test non-empty body with unsupported Content-Type (415), `application/jsonp` rejection, and safe generic 500 error handling without leakage.
  - Full suite expanded to **8 test files, 93 tests passing**, with 0 database fixture leaks.
- [x] Re-verified full project pipeline: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm test:auth` (93 tests passing), `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 3B.2: Final Optional Request-Body Validation Fix
- [x] Closed `Content-Length: 0` bypass vulnerability in optional request body parser (`src/lib/auth/http.ts`):
  - Removed insecure shortcut trusting `Content-Length: 0`.
  - Always determines whether the request body is genuinely empty by reading the actual stream subject to the 64 KiB ceiling.
  - Returns fallback only when zero actual body bytes were received.
  - Early rejection for oversized bodies when `Content-Length` indicates an oversized request is strictly preserved.
  - Disguised requests with `Content-Length: 0` and non-empty `text/plain` are strictly rejected with HTTP 415.
- [x] Distinguished whitespace from an actually empty body (`src/lib/auth/http.ts`):
  - Updated `readRequestBodyText()` to return `null` strictly when zero actual bytes were received.
  - Preserved whitespace-only request content as non-empty strings.
  - Consequently: whitespace-only `text/plain` is rejected with 415; whitespace-only `application/json` is rejected with 400 as malformed JSON; a genuinely empty admin invitation request still receives the default 7-day expiration.
  - Verified at the route level that rejected requests do not create invitation records in PostgreSQL.
- [x] Tightened RFC 9110 media-type syntax validation without external dependencies (`src/lib/auth/http.ts`):
  - Validates type and subtype tokens (`TOKEN_REGEX`).
  - Supports valid parameters (`application/json; charset=utf-8`, case-insensitive tokens, quoted strings).
  - Handles quoted strings with semicolons and escaped characters per RFC 9110 (`qdtext` / `quoted-pair`).
  - Rejects malformed parameters (trailing semicolons, empty parameters, missing equals, missing names, missing values, unclosed quoted strings, trailing characters after quotes, unquoted spaces in tokens).
  - Rejects malformed media types (`application`, `application/`, `/json`, `application/json/extra`, comma lists, etc.) and `application/jsonp`.
- [x] Sanitized administrator invitation error logging (`src/app/api/admin/invites/route.ts`):
  - Replaced logging of raw exception objects with sanitized generic message (`[ERROR] Failed to create invitation: internal operation failed`).
  - Guaranteed that raw invitation codes, credentials, database connection strings, passwords, or request payloads are never serialized into hosted logs.
  - Preserved generic client-facing 500 error response with `Cache-Control: no-store`.
- [x] Expanded Vitest test suite (`tests/auth/http.test.ts`, `tests/auth/invites.test.ts`):
  - Expanded `tests/auth/http.test.ts` to 23 tests covering all media-type syntax edge cases, whitespace preservation, and `Content-Length: 0` bypass rejection.
  - Expanded `tests/auth/invites.test.ts` to 17 tests with route-level DB count checks verifying 0 invitations are created upon failed requests.
  - Total test suite expanded to **8 test files, 103 tests passing**.
- [x] Re-verified full project pipeline: `pnpm db:validate`, `pnpm db:migrate:status`, `pnpm db:test`, `pnpm test:auth` (103 tests passing), `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Milestone 3C.0: Visual Foundation Research & Design Specification
- [x] Conducted comprehensive architectural and legal audit of 5 open-source music player foundations:
  - `rajput-hemant/infinitunes` (MIT with non-commercial README note; unofficial JioSaavn scraping).
  - `sillyangel/mice` (No license file / All Rights Reserved default; Subsonic client).
  - `shadcn-ui/ui` Music Example (MIT; official reference; Radix UI accessibility; static presentation).
  - `antonioerdeljac/next13-spotify` (MIT; Zustand player store; tightly coupled to Supabase/Stripe).
  - `jeffvli/feishin` (GPL-3.0; Mantine UI CSS Modules incompatible with Tailwind v4).
- [x] Formulated 3 distinct visual directions with complete palettes, typography, surfaces, and component concepts:
  - Direction 1: "Obsidian Studio" (Warm Analog / High-Fidelity Hi-Fi with Amber Tube Glow).
  - Direction 2: "Nordic Aurora" (Ethereal Midnight Glass with Cyan/Emerald Gradient Bloom).
  - Direction 3: "Editorial Vinyl" (Swiss International Typographic with Acid Lime / Electric Cobalt).
- [x] Selected and justified **Direction 1 ("Obsidian Studio")** as Harmoni's core visual direction for its intimate social fit, battery/GPU efficiency, eye ergonomics, and native alignment with initialized shadcn/ui zinc tokens.
- [x] Defined complete design token system mapped to Tailwind CSS v4 `@theme inline` and CSS variables.
- [x] Specified application layout shell with non-remounting docked audio player for desktop (3-column) and mobile (bottom navigation + compact floating player bar).
- [x] Authored rigorous specification for Milestone 3C Profile Page (`/@username`) with 8 SVG avatar presets, bio editing, friendship relational state machine, and clean boundary between existing Prisma schema and future milestones.
- [x] Published proposal document: [`docs/design-foundation-proposal.md`](file:///d:/Projects/Harmoni/docs/design-foundation-proposal.md).
- [ ] Awaiting user review and explicit approval before initiating frontend implementation.

---

## 4. Remaining Milestones Roadmap
- **Milestone 3C: User Profile Page & Avatar Presets**
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
4. **Authentication Rate Limiting Status:** Process-local in-memory rate limiting was intentionally not introduced because it does not reliably protect serverless or multi-instance deployments. Per ₹0 budget requirements, platform-level protection (e.g. Vercel firewall rules, free edge middleware) will be evaluated during final deployment hardening without paid Redis or SaaS dependencies.

---

## 6. Current Dependencies & Licensing
- `next` (16.4.6) — MIT License
- `react` / `react-dom` (19.3.0) — MIT License
- `@node-rs/argon2` (2.2.2) — MIT License
- `zod` (4.6.7) — MIT License
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
- `vitest` (5.1.0) — MIT License
- `eslint` (9.39.5) / `eslint-config-next` (16.4.6) — MIT License

*Every dependency is strictly free, open-source, and compatible with AGPL-3.0.*

---

## 7. Budget & Cost Confirmation
- **Total Expenditure to Date:** **₹0.00 INR**
- **Permitted Future Expenditure:** **₹0.00 INR (Permanent)**
- **Paid Services Allowed:** None.
