# Harmoni — Development Status

## 1. Project Overview
Harmoni is an open-source, personal-scale social music web application designed for a private circle of 5–15 friends. It combines music discovery, legal playback, listening history tracking, and direct music sharing at **₹0 INR recurring cost**.

- **Repository:** `https://github.com/vansh-kumar-007/Harmoni.git`
- **Default Branch:** `main`
- **License:** AGPL-3.0

---

## 2. Current Milestone
**Milestone 4.2: Strict Music License Validation & Jamendo Provider Readiness** (COMPLETED & VERIFIED — AWAITING USER REVIEW & EXPLICIT APPROVAL FOR MILESTONE 5)

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
- [x] Corrected invitation redemption test suite in `scripts/verify-db.mjs` to test atomic conditional redemption semantics (Tests 5.1–5.5).
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

### Milestone 3C.0.1: Design Proposal Refinement & Visual Exploration
- [x] Verified working tree and branch synchronization with `origin/main` at `fa21bc6a88d712072eade5bc903931300793ba11`.
- [x] Audited Figma environment via remote MCP server `figma_figma` under user Vansh Kumar (`vanshkumar.fds@gmail.com`), Student tier.
- [x] Initialized remote Figma file: `Harmoni — Visual Design Exploration` ([https://www.figma.com/design/tde7tKDtxqTwhqJQko989H](https://www.figma.com/design/tde7tKDtxqTwhqJQko989H)).
- [x] Authored initial HTML visual exploration prototype in `docs/visual-design-exploration.html`.
- [x] Refined and updated Design Foundation Proposal ([`docs/design-foundation-proposal.md`](file:///d:/Projects/Harmoni/docs/design-foundation-proposal.md)) covering Next.js profile rewrite routing, strict Milestone 3C boundary, presence model clarification, 2-column studio layout, and glare reduction ergonomics.

### Milestone 3C.0.2: Prototype Accuracy & Verification Cleanup
- [x] **Accurate Figma Status Record:**
  - Audited and documented that the remote Figma file (`https://www.figma.com/design/tde7tKDtxqTwhqJQko989H`) is an **empty document canvas shell** containing only an empty "Page 1".
  - Corrected previous report: no native design frames or layers were generated in Figma.
  - Documented tool boundaries: remote MCP server lacks `use_figma` plugin script execution, `send_code_to_figma` targets code layers only, and native generative AI tools consume paid credits prohibited under the ₹0 INR budget rule.
  - Confirmed no duplicate empty files created and zero paid credits consumed.
  - Established that `docs/visual-design-exploration.html` serves as the canonical high-fidelity visual deliverable.
- [x] **Replaced Emoji Placeholders with 8 Handcrafted Inline SVGs:**
  - Replaced all emoji placeholders with eight original inline SVG illustrations (`avatar_1` to `avatar_8`) matching the Obsidian Studio palette.
  - Each SVG features consistent `viewBox="0 0 64 64"`, `role="img"`, `<title>`, accessible labels, clean vector geometry, and zero external icon or font dependencies.
  - Integrated SVGs into View 5 (preset showcase cards), desktop profile hero (104px), mobile profile hero (80px), desktop sidebar user pill (34px), and mobile discover header (28px).
- [x] **WAI-ARIA Tab Navigation & Script Hardening:**
  - Completely eliminated reliance on deprecated global `event` / `window.event`.
  - Refactored view switching into an accessible WAI-ARIA tablist pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `tabindex`).
  - Added full keyboard arrow navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) with roving tabindex and focus management.
  - Verified 0 browser console errors.
- [x] **Prototype Scope & Limitations Banner:**
  - Added prominent banner clearly distinguishing functional interactive features (view switching, comparison cards, token inspection) from non-functional visual mockups (decorative audio player controls, illustrative tracks without Jamendo API, fictional user profiles without DB).
  - Fully preserved the three visual direction comparisons (Obsidian Studio, Nordic Aurora, Editorial Vinyl) and all 5 view stages.
- [x] **Authentication Test Suite Investigation:**
  - Documented exact failure mode in sandboxed environment (`connect EACCES 127.0.0.1:5432` across the 6 database test files) caused by agent sandbox network isolation blocking loopback TCP socket connections.
  - Verified that pure unit tests (`tests/auth/password.test.ts`, `tests/auth/http.test.ts`) pass 100% in sandbox (33 tests passed).
  - Verified that with network unblocked (`BypassSandbox: true`), all 8 test suites and **all 103 tests pass completely with 0 errors in 4.37s**.
  - Classified as **Environmental Problem (Sandbox TCP Loopback Network Isolation)**.

### Milestone 3C.0.3: Multi-Theme Design System & Appearance Selector
- [x] **Multi-Theme Platform Architecture Decision:**
  - Evolved Harmoni into a multi-theme platform where each individual member selects their own visual theme independently.
  - Maintained zero cross-user interference: one user may enjoy Obsidian Studio while another chooses Crimson Vigil or Cobalt Web.
- [x] **Catalog of 5 Production-Grade Themes:**
  1. **Obsidian Studio (Default):** Warm analog hi-fi, brushed slate, vacuum-tube amber glow (`#f59e0b`).
  2. **Nordic Aurora:** Atmospheric midnight glass, icy fjord slate, bioluminescent cyan (`#06b6d4`) and mint emerald (`#10b981`).
  3. **Editorial Vinyl:** Swiss typographic record club, matte vinyl black, structural crate borders, electric acid-lime (`#bef264`).
  4. **Crimson Vigil (Daredevil-inspired):** Shadow noir black, dark asphalt, oxblood leather borders (`#381418`), blind-justice crimson red (`#e11d48`).
  5. **Cobalt Web (Spider-Man-inspired):** Midnight navy (`#080b14`), royal cobalt (`#2563eb`), dynamic vermilion red (`#dc2626` / `#ef4444` glow), electric sky cyan pips (`#38bdf8`).
- [x] **Strict IP Non-Infringement Boundary:**
  - Enforced 100% original chromatic interpretations based on atmospheric moods.
  - Strictly zero Marvel logos, webs, masks, spiders, double-D emblems, silhouettes, movie frames, or proprietary fonts.
  - Explicit inspired labeling: `(Daredevil-inspired)` and `(Spider-Man-inspired)`.
- [x] **Canonical Interactive Prototype Extended (`docs/visual-design-exploration.html`):**
  - Integrated complete CSS variable overrides across `:root` and all 5 `[data-theme="..."]` attributes.
  - Added global quick theme switcher dropdown in the sticky header for instant evaluation.
  - Added dedicated View 2 (**Appearance Settings**): 5 interactive theme cards with 4-chip swatches, aesthetic descriptions, WCAG contrast verification badges, live preview triggers, and commit/reset buttons.
  - Added simulated mobile appearance screen (390×844) with 48px+ touch targets.
  - Live Discover (View 3), Live Profile (View 4), and Mobile (View 5) views dynamically transform in real-time when any theme is selected.
  - Retained all 8 handcrafted inline SVG avatar presets and the Prototype Boundary Banner.
- [x] **Database & Backend Persistence Architecture Specification:**
  - Designed Prisma schema extension: `themeKey String @default("obsidian-studio") @db.VarChar(50)` on `User` model.
  - Enforced type safety via `THEME_REGISTRY` constant allowlist.
  - Designed Zero-FOUC (Flash of Unstyled Content) server-rendering in `src/app/layout.tsx` via `getCurrentUser()` DAL.
  - Designed `PATCH /api/users/me/theme` endpoint with strict Zod validation and 64 KiB request body limit.
  - Verified ₹0 INR operating cost with pure PostgreSQL storage.

### Milestone 3C.0.4: Theme System Accuracy & Design Specification Audit (THIS MILESTONE — COMPLETED & AUDITED)
- [x] **Rigorous WCAG 2.1 / 2.2 Relative Luminance Contrast Audit:**
  - Computed exact mathematical contrast ratios using the W3C relative luminance formula for all 5 themes.
  - Identified that Cobalt Web's primary button (`#ffffff` on `#ef4444`) failed the 4.5:1 normal-sized text AA threshold at 3.76:1.
  - Adjusted Cobalt Web primary accent to `#dc2626` (Red-600) with `#ef4444` active glow, achieving a fully compliant 4.83:1 (WCAG AA).
  - Recorded exact tested element pairs across canvas body text, card body text, primary buttons, and secondary buttons.
  - Removed all inaccurate blanket "WCAG AAA" theme claims.
- [x] **Root-Level `html[data-theme="..."]` Architecture Unification:**
  - Unified HTML prototype (`docs/visual-design-exploration.html`) and design specification to attach `data-theme` exclusively to `<html>` (root element), eliminating body attribute conflicts and aligning directly with the Next.js 16 `RootLayout` zero-FOUC contract.
  - Eliminated hardcoded colors across prototype components (header, view tabs, chips, dropdowns, cards), making all UI elements react dynamically to theme switching.
- [x] **Appearance Settings Keyboard Accessibility:**
  - Upgraded prototype Appearance theme selection cards to accessible WAI-ARIA `<button type="button" role="radio">` with `role="radiogroup"`, roving `tabindex`, `aria-checked`, and keyboard arrow navigation (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`).
  - Added mobile radio inputs for touch and screen reader parity.
  - Added explicit simulation notice clarifying in-memory live preview vs. future Milestone 3C.1 persistent storage.
- [x] **Database Schema Documentation Correction:**
  - Audited and corrected Prisma documentation snippet to `role Role @default(USER)` (matching `enum Role { USER, ADMIN }` in `prisma/schema.prisma` and resolving previous typo referencing `MEMBER`).
  - Verified full `User` model fields and relations (`invitationCodes`, `sessions`, `invitationUsed`).
  - Evaluated `themeKey` indexing and formally rejected a secondary index: lookups occur by primary key (`id`) or unique index (`username`), meaning an index on `themeKey` would add write overhead with zero query performance benefit.
- [x] **Roadmap Separation & Clarification:**
  - Split frontend roadmap into two distinct sequential milestones:
    1. **Milestone 3C.1: Multi-Theme Engine & User Preference Persistence**
    2. **Milestone 3C.2: User Profiles & Avatar Presets**
### Milestone 3C.1: Multi-Theme Engine & Per-User Theme Preference Persistence (THIS MILESTONE — COMPLETED & VERIFIED)
- [x] **Centralized Five-Theme Registry (`src/lib/theme/constants.ts`):**
  - Single source of truth defining `THEME_REGISTRY` (`obsidian-studio`, `nordic-aurora`, `editorial-vinyl`, `crimson-vigil`, `cobalt-web`).
  - Strongly-typed `ThemeKey` and `DEFAULT_THEME` (`obsidian-studio`).
  - Complete metadata registry `THEMES_META` with names, subtitles, aesthetic descriptions, 4-chip swatches, and contrast metrics.
  - Type guard `isThemeKey()` and safe fallback helper `getValidThemeKey()` returning `obsidian-studio` for null, undefined, or unknown values.
  - 100% original visual styling with zero Marvel logos, character artwork, copyrighted promo images, or masks.
- [x] **Database Schema & Migration (`20261115070000_add_user_theme_key`):**
  - Extended `User` model in `prisma/schema.prisma` with `themeKey String @default("obsidian-studio") @db.VarChar(50)`.
  - Preserved all existing fields, relations, and the `Role` enum.
  - Deployed migration to local PostgreSQL (`harmoni` database) using Prisma 7 migration deploy workflow.
  - Verified `themeKey` column properties in PostgreSQL: `VARCHAR(50)`, `NOT NULL`, `DEFAULT 'obsidian-studio'`.
  - Intentionally did not add an index on `themeKey` (lookups occur by primary key `id` or unique `username`).
- [x] **SafeUser Interface & Authentication Propagation:**
  - Extended `SafeUser` in `src/lib/auth/session.ts` with non-sensitive `themeKey: string`.
  - Updated `toSafeUser()` to pass `themeKey` through with safe fallback.
  - Verified zero exposure of sensitive authentication credentials or tokens.
- [x] **Centralized CSS Theme System (`src/app/globals.css`):**
  - Root-level `html[data-theme="..."]` token mapping for all five themes.
  - Seamless integration with Tailwind CSS v4 `@theme inline` and shadcn/ui semantic variables (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, `--ring`, etc.).
  - Preserved exact contrast fixes (Cobalt Web primary button `#dc2626` at 4.83:1 WCAG AA).
- [x] **Zero-FOUC Server-Side Theme Loading (`src/app/layout.tsx`):**
  - Converted RootLayout to asynchronous Server Component.
  - Fetches current authenticated user via React 19 memoized `getCurrentUser()` DAL.
  - Resolves theme via `getValidThemeKey()` and injects `<html lang="en" data-theme={themeKey}>` directly into initial HTML response.
  - Defaults safely to `obsidian-studio` for unauthenticated visitors.
- [x] **Authenticated Theme Preference Endpoint (`PATCH /api/users/me/theme`):**
  - Enforces user authentication via `requireUser()` DAL (returns 401 if unauthenticated).
  - Validates request body with strict 64 KiB size limit and `application/json` Content-Type via `parseJsonBody()`.
  - Validates payload against `THEME_REGISTRY` with Zod (returns 400 for unknown/missing keys).
  - Mutates `themeKey` strictly for the authenticated user (`db.user.update({ where: { id: currentUser.id } })`).
  - Returns sanitized response `{ success: true, themeKey }` with `Cache-Control: no-store`.
- [x] **Appearance Settings Page (`/settings/appearance`):**
  - Standalone, authenticated settings page at `src/app/settings/appearance/page.tsx`.
  - Interactive two-stage client component `src/app/settings/appearance/appearance-form.tsx`:
    1. Instant live preview on `document.documentElement.setAttribute('data-theme', ...)` upon selecting any theme card.
    2. Persistent database update on clicking "Save Theme Preference".
    3. "Reset to Obsidian Studio" and "Revert Preview" controls.
    4. Real-time visual feedback for unsaved changes, saving spinners, success toasts, and error alerts.
    5. Reverts DOM preview back to persisted theme if API call fails.
  - Full keyboard accessibility with `role="radiogroup"`, `role="radio"`, roving `tabIndex`, and arrow key navigation (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`).
  - Clear unauthenticated gate when accessed without an active session.
- [x] **Comprehensive Automated Test Coverage:**
  - Added `tests/theme/constants.test.ts` (7 tests).
  - Added `tests/theme/route.test.ts` (9 tests).
  - Added `tests/theme/db-theme.test.ts` (3 tests).
  - Full Vitest suite passes: **11 test files, 122 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` creates all 8 static and dynamic routes.
- [x] Awaiting user review and explicit approval before initiating Milestone 3C.2.

### Milestone 3C.2: User Profiles & Avatar Presets (THIS MILESTONE — COMPLETED & VERIFIED)
- [x] **Preflight & Milestone 3C.1 Regression Correction (`1f939bf`):**
  - Resolved theme-save interaction race condition in `src/app/settings/appearance/appearance-form.tsx`.
  - Disabled theme selection cards, keyboard selection, and reset button during in-flight save requests (`status === "saving"`).
  - Verified with 19 theme and auth tests; committed as `fix(ui): prevent theme changes during save` and pushed to `origin/main`.
- [x] **Clean Profile URL Rewriting (`next.config.ts`):**
  - Configured Next.js 16 server-side rewrite mapping `/@:username` to `/users/:username`.
  - Ensures clean, modern vanity profile routing while keeping code organized under standard Next.js route segments.
- [x] **Bundled SVG Avatar Presets & Registry (`src/lib/profile/constants.ts` & `src/components/profile/avatar-preset.tsx`):**
  - Created strongly-typed avatar registry with 8 presets: `avatar_1` (Midnight Resonance), `avatar_2` (Neon Groove), `avatar_3` (Analog Warmth), `avatar_4` (Emerald Drift), `avatar_5` (Sunset Frequency), `avatar_6` (Cyber Pulse), `avatar_7` (Solar Flare), and `avatar_8` (Deep Horizon).
  - Implemented 100% original inline SVG artwork without external fonts, icons, or CDNs (preserving permanent ₹0 INR cost).
  - Provided responsive size tiers (`xs`, `sm`, `md`, `lg`, `xl`), halo lighting effects, and accessible `<title>` and `aria-label` elements.
  - Added robust validation helpers: `isAvatarKey()` and `getValidAvatarKey()`.
- [x] **Self-Service Edit Profile Dialog (`src/components/profile/edit-profile-dialog.tsx`):**
  - Accessible modal dialog for authenticated account owners to customize their profile.
  - Interactive 8-avatar selection grid with visual selection rings and checkmark indicators.
  - Biography textarea with real-time character counting against a strict 250-character limit (`MAX_BIO_LENGTH`).
  - Automatically normalizes empty or whitespace-only biographies to `null`.
  - Full keyboard accessibility with Escape key dismissal, backdrop click closing, and focus traps.
- [x] **Authenticated Profile Update Endpoint (`PATCH /api/users/me/profile`):**
  - Protected via `requireUser()` DAL; enforces user authentication.
  - Enforces strict 64 KiB streaming request-body limit and `application/json` Content-Type via `parseJsonBody()`.
  - Validates request payload with Zod against valid avatar keys and maximum 250 characters.
  - Modifies strictly the authenticated user's record (`where: { id: currentUser.id }`).
  - Returns sanitized `SafeUser` object without exposing password hashes or session tokens; sets `Cache-Control: no-store`.
- [x] **Real Database-Backed Public Profile (`src/app/users/[username]/page.tsx`):**
  - Server Component with Next.js 16 awaited `params`.
  - Normalizes username and executes selective Prisma query preventing any sensitive column leaks.
  - Renders user display name, `@username`, role badge (`USER` or `ADMIN`), member-since date, avatar preset, and bio.
  - Dynamic page metadata: title `[displayName] (@[username]) • Harmoni` and custom description.
  - Strictly distinguishes profile owner from visitors:
    - Profile owner: renders the `EditProfileDialog` button.
    - Other users: renders a neutral "Harmoni Member" status badge with zero deceptive/mocked action buttons (no fake add-friend or chat buttons).
  - Handles non-existent users gracefully via Next.js `notFound()`.
- [x] **Tabbed Content & Privacy Enforcement (`src/app/users/[username]/profile-tabs.tsx`):**
  - Accessible WAI-ARIA tabbed interface (`role="tablist"`, `role="tab"`, `role="tabpanel"`) with Overview, Playlists, and History tabs.
  - Strict privacy enforcement: filters playlists with `isPublic: true` so private playlists are never exposed to others.
  - Displays completed listening history (`Scrobble` where `isCompleted === true`) with scrobble timestamps and duration formatting.
  - Polished empty states when users have no public playlists or scrobbles.
- [x] **Comprehensive Automated Test Coverage:**
  - Added `tests/profile/constants.test.ts` (8 tests).
  - Added `tests/profile/route.test.ts` (12 tests).
  - Added `tests/profile/page.test.ts` (6 tests).
  - Full Vitest suite passes: **14 test files, 148 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` generates all dynamic routes including `/users/[username]` and `/api/users/me/profile`.
- [x] Awaiting user review and explicit approval before initiating Milestone 4.

### Milestone 3C.2.1: Profile Accessibility, Artwork & Test Coverage Correction
- [x] **Genuine Keyboard Focus Trap & Dismissal Guard (`src/components/profile/edit-profile-dialog.tsx`):**
  - Implemented keyboard focus trap without external dependencies: Tab wraps from the last focusable element back to the first, and Shift+Tab wraps from the first focusable element to the last.
  - Automatically moves focus to the dialog close button upon opening via accessible timeout.
  - Centralized modal close behavior (`closeModal`) across the Escape key handler, backdrop overlay click, Cancel button, and Close (X) button.
  - Strictly prevents dismissal and closing while a profile update request is in flight (`status === "saving"`).
  - Preserves and restores keyboard focus to the originating "Edit Profile" trigger button whenever the dialog is dismissed or closed.
- [x] **Safe Avatar Normalization & Radiogroup Accessibility (`src/components/profile/edit-profile-dialog.tsx` & `src/lib/profile/constants.ts`):**
  - Removed unsafe `as AvatarKey` type assertion; initial state and dialog opening safely normalize any unknown or invalid avatar keys to `avatar_1` using `getValidAvatarKey()`.
  - Added full keyboard arrow navigation across the 8-avatar preset grid (`ArrowRight` / `ArrowDown` to advance with wrap-around, `ArrowLeft` / `ArrowUp` to reverse with wrap-around, `Home` to jump to first, and `End` to jump to last).
  - Implemented roving tabindex (`tabIndex={0}` on the currently selected preset, `tabIndex={-1}` on all other 7 presets), providing exactly one tab stop within the radiogroup per WAI-ARIA standards.
  - Added distinct focus-visible rings (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`).
- [x] **Profile Tabs WAI-ARIA Navigation & Panel Persistence (`src/app/users/[username]/profile-tabs.tsx`):**
  - Implemented arrow-key navigation (`ArrowRight` / `ArrowDown`, `ArrowLeft` / `ArrowUp`, `Home`, `End`) across the three tabs ("Overview", "Playlists", "Listening History").
  - Implemented roving tabindex: the active tab has `tabIndex={0}`, while inactive tabs have `tabIndex={-1}`.
  - Rendered all three tab panels simultaneously in the DOM with matching `id`, `aria-controls`, and `aria-labelledby` attributes, using the HTML `hidden` attribute and CSS hidden classes on inactive panels to satisfy WAI-ARIA accessibility requirements.
- [x] **Safe Artwork Display & Protocol Security (`src/components/profile/artwork-image.tsx` & `src/lib/profile/constants.ts`):**
  - Created reusable, accessible `ArtworkImage` component displaying actual playlist covers (`Playlist.coverUrl`) and track artwork (`Track.coverUrl`).
  - Implemented strict protocol validation (`isValidImageUrl`) permitting only `http:` and `https:` URLs, rejecting `javascript:`, `data:`, `file:`, and malformed payloads.
  - Preserved fixed aspect ratio and dimensions (`w-9 h-9`, `w-10 h-10`, `w-12 h-12`) with `loading="lazy"` and `decoding="async"` to eliminate cumulative layout shifts (CLS).
  - Handled network errors and missing images gracefully with client-side `onError` fallback to design-system icons (`♪` and `♫`).
  - Preserved the ₹0 operating-cost constraint without arbitrary remote pattern wildcards or third-party image CDNs.
- [x] **Deterministic UTC Date Formatting & Hydration Safety:**
  - Audited date formatting in `src/app/users/[username]/profile-tabs.tsx` and `src/app/users/[username]/page.tsx`.
  - Configured deterministic `timeZone: "UTC"` across all `Intl.DateTimeFormat` calls (`formatListenedDate`, `formatMonthYear`, `memberSinceFormatted`), eliminating timezone mismatches between server rendering and browser hydration.
- [x] **Real Server Component Testing & Accessibility Coverage (`tests/profile/page.test.ts` & `tests/profile/components.test.ts`):**
  - Upgraded `tests/profile/page.test.ts` (12 tests) to directly import and execute the actual `UserProfilePage` Server Component and `generateMetadata` function against live PostgreSQL test fixtures.
  - Created `tests/profile/components.test.ts` (14 tests) covering `ArtworkImage` protocol security, fallback symbols, `ProfileTabs` roving tabindex, panel DOM persistence, UTC formatting, avatar normalization, focus trap wrapping, and save in-flight dismissal guards.
  - Full Vitest suite passes: **15 test files, 171 tests passed (100% pass rate)**.
- [x] Completed and verified.

### Milestone 3D: Invitation-Only Authentication Experience & Admin Invitation Management (THIS MILESTONE — COMPLETED & VERIFIED)
- [x] **Safe Destination Redirect Protection (`src/lib/auth/redirect.ts`):**
  - Created `getSafeRedirectUrl(target, fallback)` enforcing strict relative URL paths.
  - Mitigates open-redirect vulnerabilities by rejecting protocol-relative URLs (`//evil.com`), absolute URLs (`https://evil.com`), backslash bypasses (`/\evil.com`), whitespace, and control characters.
- [x] **Sign In Experience (`/login`, `src/app/login/page.tsx`, `src/app/login/login-form.tsx`):**
  - Responsive, accessible sign-in page styled with design system variables.
  - Server-side redirect to dashboard (`/`) if the user is already authenticated.
  - Preserves safe return destination via `?returnTo=...`.
  - Accessible password visibility toggle (`aria-label`, `aria-pressed`, `tabIndex={0}`).
  - Loading states, disabled inputs during request, and generic anti-enumeration error feedback ("Invalid username or password").
- [x] **Invitation Registration Experience (`/register`, `src/app/register/page.tsx`, `src/app/register/register-form.tsx`):**
  - Responsive registration page styled with design system tokens.
  - Automatically prefills invitation code from query param (`?code=...`).
  - Client-side validation matching backend constraints (username format, display name length, min 8 char password, password confirmation matching).
  - Integrates atomically with `POST /api/auth/register`, redeeming code, creating user, and establishing session in one transaction.
  - Direct link to `/login` for existing members.
- [x] **Admin Invitation Portal (`/admin/invitations`, `src/app/admin/invitations/page.tsx`, `src/app/admin/invitations/invite-generator.tsx`):**
  - Server-side access control with `requireAdmin()` redirecting unauthenticated users to `/login` and rendering a clean 403 Forbidden screen for non-admin members.
  - Configurable expiration selector (1, 3, 7, 14, or 30 days).
  - Calls `POST /api/admin/invites`, creating a 256-bit cryptographically secure invitation code.
  - Single-use raw code display with one-click copy to clipboard and explicit warning that codes cannot be recovered once navigated away (only SHA-256 hash is persisted).
- [x] **Client Logout Component (`src/components/auth/logout-button.tsx`):**
  - Reusable, accessible sign-out button calling `POST /api/auth/logout`.
  - Clears session cookie and redirects to `/` or specified destination.
  - Accessible loading spinner and error feedback if network fails.
- [x] **Navigation Bar & Session-Aware Home (`src/components/layout/navbar.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`):**
  - Responsive top navigation bar displaying Harmoni branding, navigation links, current user avatar, username, role badges, and logout button.
  - Session-aware Home Landing Page:
    - Unauthenticated: Hero landing screen with branding, invitation messaging, Sign In, and Join with Invitation Code links.
    - Authenticated: Member dashboard with personalized greeting, profile card with AvatarPreset, theme info, quick links to Profile, Appearance Settings, Admin Portal (for Admins), and Logout.
- [x] **Comprehensive Automated Test Coverage:**
  - Added `tests/auth/redirect.test.ts` (6 tests).
  - Added `tests/auth/login-page.test.ts` (5 tests).
  - Added `tests/auth/register-page.test.ts` (4 tests).
  - Added `tests/auth/logout-component.test.ts` (2 tests).
  - Added `tests/auth/admin-invitations-page.test.ts` (4 tests).
  - Added `tests/auth/home-navigation.test.ts` (6 tests).
  - Full Vitest suite passes: **21 test files, 198 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` generates all routes including `/login`, `/register`, `/admin/invitations`, and `/`.
- [x] **Zero Admin Creation & Zero Cost Maintained:**
  - No real administrator account created; `pnpm auth:bootstrap-admin` remains documented for the developer to run manually when desired.
  - ₹0 INR expenditure permanently maintained.
- [x] Completed and verified.

### Milestone 4: Music Discovery Engine & Jamendo Read-Only API Integration (COMPLETED & VERIFIED)
- [x] **Typed Server-Side Jamendo API Client (`src/lib/music/providers/jamendo/client.ts`):**
  - Built typed, read-only Jamendo API client targeting official base URL `https://api.jamendo.com/v3.0/`.
  - Enforced strict server-only execution (`import "server-only"`) isolating the `JAMENDO_CLIENT_ID` credential from client bundles and log outputs.
  - Constructed query parameters securely with `URLSearchParams`.
  - Implemented 8-second request timeouts using `AbortSignal.timeout(8000)`.
  - Structured error hierarchy (`JamendoError`) categorizing `NOT_CONFIGURED` (503), `RATE_LIMITED` (429), `TIMEOUT` (504), `NETWORK_ERROR` (502), and `API_ERROR` (502).
  - Provided `isJamendoConfigured()` utility reporting whether a valid, non-placeholder developer client ID is set.
- [x] **Upstream Validation & Normalization Mapper (`src/lib/music/providers/jamendo/types.ts` & `mapper.ts`):**
  - Defined strict Zod schemas for upstream Jamendo response headers, tracks, artists, and albums.
  - Mapped upstream payloads to clean application DTOs: `NormalizedTrack`, `NormalizedArtist`, and `NormalizedAlbum`.
  - Strictly stripped upstream audio stream URLs (`audio`), direct download links (`audiodownload`), and album archives (`zip`) to enforce discovery-only scope.
  - Supported both standalone singles (`albumTitle: null`) and album tracks without making invalid album assumptions.
- [x] **Creative Commons Licensing & Attribution Engine (`src/lib/music/licenses.ts` & `src/components/music/license-badge.tsx`):**
  - Integrated required `include=licenses` parameter in all Jamendo track queries.
  - Built robust `parseCcLicense` parser verifying `creativecommons.org` URLs, mapping standard codes (`CC BY-NC-SA 3.0`, `CC BY 4.0`, `CC0 1.0`), and extracting permission tags: `NC` (Non-Commercial), `SA` (Share-Alike), and `ND` (No-Derivatives).
  - Unverified or missing license URLs are explicitly designated as "Unknown License" and not claimed as verified playable.
  - Created accessible `LicenseBadge` linking directly to the verified Creative Commons legal deed with `rel="noopener noreferrer"`.
  - Built `formatDuration` converting duration seconds to standard `m:ss` and `h:mm:ss` display strings.
- [x] **Protected Music Search API (`GET /api/music/search`, `src/app/api/music/search/route.ts`):**
  - Protected via `getCurrentUser()` DAL requiring an authenticated Harmoni session (401 Unauthorized for guests).
  - Validates and bounds query parameters via Zod: `q` (non-empty, max 100 chars), `type` (`tracks`, `artists`, or `albums`), `limit` (clamped 1..50, default 20), and `offset` (>= 0, default 0).
  - Strictly complies with Jamendo Terms of Use by keeping all search results ephemeral in memory; emits `Cache-Control: no-store, no-cache, must-revalidate, private` and persists 0 database records.
  - Returns friendly 503 response with `configured: false` when `JAMENDO_CLIENT_ID` is unconfigured.
  - Sanitized error handling ensuring internal exceptions, upstream keys, and stack traces are never leaked.
- [x] **Interactive Search UI (`/search`, `src/app/search/page.tsx`, `search-view.tsx`):**
  - Protected page redirecting unauthenticated visitors to `/login?returnTo=/search`.
  - Responsive search bar with instant query suggestions ("Ambient", "Jazz", "Electronic", etc.), clear button, and accessible submit trigger.
  - WAI-ARIA tab navigation across **Tracks**, **Artists**, and **Albums** with keyboard arrow switching and roving tabindex.
  - Dedicated UI states:
    - Initial discovery state with catalog guidance.
    - Friendly "Jamendo API Not Configured" banner with clear steps to add `JAMENDO_CLIENT_ID` to `.env.local` without errors.
    - Animated loading skeleton placeholders (`aria-busy="true"`).
    - Friendly empty state when no results match a query.
    - Error state with "Retry Search" button.
    - "Load More" pagination button fetching subsequent offsets.
  - Seamlessly styled for all 5 visual themes using existing design tokens.
- [x] **Responsive Content Cards (`src/components/music/`):**
  - `TrackCard`: Displays cover artwork with lazy-loading and fallback icon (`♫`), track title, artist name, album name or "Single" badge, formatted duration, CC license badge, and direct Jamendo backlink (`rel="noopener noreferrer"`).
  - `ArtistCard`: Displays artist avatar, name, join year, website link, and direct Jamendo Profile link.
  - `AlbumCard`: Displays cover artwork, album title, artist name, release year, and direct Jamendo Album link.
- [x] **Navigation & Dashboard Integration:**
  - Added "Search" navigation link to top header (`Navbar`) for authenticated users.
  - Added "Discover Music" quick action card to authenticated dashboard (`HomePage`).
- [x] **Comprehensive Automated Test Coverage:**
  - Added `tests/music/licenses.test.ts` (9 tests covering formatting and CC URL parsing).
  - Added `tests/music/jamendo-provider.test.ts` (14 tests covering API client, query parameters, singles, rate limits, timeouts, and secret isolation).
  - Added `tests/music/search-route.test.ts` (10 tests covering auth guard, parameter validation, provider dispatch, 503 unconfigured state, and error handling).
  - Added `tests/music/search-ui.test.ts` (8 tests covering server rendering, unconfigured state, and Track/Artist/Album card rendering).
  - Full Vitest suite passes: **25 test files, 239 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` generates all routes including `/search` and `/api/music/search`.
- [x] **Zero Admin Creation & Zero Cost Maintained:**
  - No real administrator account or user created; database remains clean with 0 records.
  - ₹0 INR expenditure permanently maintained.
- [x] Completed and verified.

### Milestone 4.1: Jamendo API Correctness & Track Discovery Fixes (COMPLETED & VERIFIED)
- [x] **Standalone Singles Inclusion in Track Discovery (`src/lib/music/providers/jamendo/index.ts`):**
  - Updated outgoing track search requests to explicitly send `type: "single albumtrack"`.
  - Ensures both standalone singles and album tracks are returned in search results per official Jamendo API documentation, overriding the default behavior which only returns album tracks.
  - Preserved existing parameter validation, pagination, licensing metadata, and discovery-only constraints.
- [x] **Official Jamendo API Response-Code Mapping (`src/lib/music/providers/jamendo/client.ts`):**
  - Aligned API error code handling with the official Jamendo specification (https://developer.jamendo.com/v3.0/response-codes):
    - Code 0: Success (safely accepting both `"success"` and `"succeed"` status strings).
    - Code 1: Generic upstream exception (`API_ERROR`, 502).
    - Code 2: Unsupported HTTP method (`API_ERROR`, 502).
    - Code 3: Invalid query parameter value (`API_ERROR`, 502).
    - Code 4: Required parameter missing (`API_ERROR`, 502).
    - Code 5: Invalid client ID (`INVALID_CREDENTIALS`, 503).
    - Code 6: Rate limit exceeded (`RATE_LIMITED`, 429).
    - Code 7: Requested method not found (`API_ERROR`, 502).
    - Code 8: Required conditional parameter missing (`API_ERROR`, 502).
    - Code 9: Invalid response format (`API_ERROR`, 502).
    - Code 10: Invalid API entry point (`API_ERROR`, 502).
    - Code 11: Suspended developer application (`INVALID_CREDENTIALS`, 503).
  - Removed previous incorrect assumption that codes 2 and 4 indicated rate-limiting.
  - Code 6 correctly maps to `RATE_LIMITED` and HTTP 429.
  - Codes 5 and 11 map to `INVALID_CREDENTIALS` and HTTP 503 with `configured: false`, allowing the UI to present the configuration guide safely.
  - Ensured HTTP OK responses inspect `headers.code` and failure status before accepting the response.
  - Handled malformed upstream headers without crashing or leaking sensitive credentials or URLs.
- [x] **Expanded Test Suite Coverage (`tests/music/`):**
  - Updated `tests/music/jamendo-provider.test.ts` (expanded to 23 tests):
    - Verified track searches include decoded parameter `type=single albumtrack`.
    - Verified genuine singles with null album fields are normalized cleanly.
    - Verified code 0 success with `"success"` and `"succeed"`.
    - Verified codes 2, 3, 4 map to `API_ERROR` (502).
    - Verified code 5 and code 11 map to `INVALID_CREDENTIALS` (503).
    - Verified code 6 maps to `RATE_LIMITED` (429).
    - Verified code 7 maps to `API_ERROR` (502).
    - Verified missing/malformed headers map to `API_ERROR` (502).
    - Verified zero credential leakage across all error scenarios.
  - Updated `tests/music/search-route.test.ts` (expanded to 11 tests):
    - Verified 503 response and `configured: false` when `INVALID_CREDENTIALS` is thrown.
  - Full Vitest suite passes: **25 test files, 249 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` succeeds.
- [x] **Zero Admin Creation & Zero Cost Maintained:**
  - Database remains clean with 0 records.
  - ₹0 INR expenditure permanently maintained.
- [x] Completed and verified.

### Milestone 4.2: Strict Music License Validation & Jamendo Provider Readiness (THIS MILESTONE — COMPLETED & VERIFIED)
- [x] **Strict Creative Commons License Validation (`src/lib/music/licenses.ts`):**
  - Implemented strict protocol and hostname validation: accepts only `http:` and `https:`, exact hostnames `creativecommons.org` and `www.creativecommons.org`.
  - Rejects lookalike hostnames (e.g. `creativecommons.org.attacker.com`, `evil-creativecommons.org`, `creativecommons.net`), non-standard ports, and embedded credentials.
  - Standardizes valid URLs to canonical `https:` without query params or fragments.
  - Explicitly recognizes the 6 officially supported Creative Commons license identifiers per official specification:
    - `by` (Attribution)
    - `by-sa` (Attribution-ShareAlike)
    - `by-nd` (Attribution-NoDerivatives)
    - `by-nc` (Attribution-NonCommercial)
    - `by-nc-sa` (Attribution-NonCommercial-ShareAlike)
    - `by-nc-nd` (Attribution-NonCommercial-NoDerivatives)
  - Explicitly recognizes officially supported CC license versions: `1.0`, `2.0`, `2.5`, `3.0`, and `4.0`. Rejects non-existent versions (e.g. `0.5`, `5.0`, `99.0`).
  - Correctly validates CC0 public domain dedication (`/publicdomain/zero/1.0/`), requiring exact version `1.0`.
  - Rejects fake license slugs on valid domain (e.g. `commercial`, `gpl`, `bsd`, `fake-by`), malformed paths (missing version, missing slug, arbitrary non-license paths), and unsupported protocols (`ftp:`, `javascript:`).
  - Enforces strict consistency between canonical license definitions and raw Jamendo license flags (`rawLicensesObj` with `ccnc`, `ccsa`, `ccnd`):
    - Any contradictory raw flag immediately causes the parser to reject the license and return `Unknown License` with `isVerified: false`.
    - Contradictory raw flags can never override a canonical license.
    - An unknown or contradictory license is guaranteed to never be presented as a verified playable license.
  - Preserved the existing `LicenseInfo` interface without regression.
- [x] **Jamendo Response-Header Validation (`src/lib/music/providers/jamendo/client.ts`):**
  - Enforces that response headers contain a valid finite integer `code` and a non-empty `status` string.
  - Accepts a successful response only when `code === 0` AND `status` is either documented `"succeed"` or official example `"success"` (evaluated case-insensitively).
  - Explicitly rejects `status === "failed"` when code is 0 as an upstream failure.
  - Explicitly rejects missing, blank, or whitespace status values (`API_ERROR`, 502).
  - Explicitly rejects unrecognized status values (e.g. `"pending"`, `"ok"`, `"unknown"`) (`API_ERROR`, 502).
  - Explicitly rejects missing, non-numeric, or non-integer response codes (`API_ERROR`, 502).
  - Preserves sanitized error code mapping for codes 1–11 (mapping codes 5 and 11 to `INVALID_CREDENTIALS`, code 6 to `RATE_LIMITED`).
  - Guarantees zero credential or URL leakage in error messages and client bundles.
- [x] **Comprehensive Automated Test Coverage:**
  - Expanded `tests/music/licenses.test.ts` to **29 tests** (up from 9 tests):
    - All 6 supported license identifiers.
    - Supported versions (1.0, 2.0, 2.5, 3.0, 4.0) and unsupported versions (0.5, 5.0, 99.0).
    - CC0 1.0 and invalid CC0 2.0.
    - Fake license slugs on legitimate hostname.
    - Malformed paths (missing version, arbitrary paths).
    - Lookalike or attacker hostnames, ports, credentials, and protocols.
    - Missing and null URLs.
    - Contradictory license URL vs raw flags (e.g., CC BY with ccnc: true, CC BY-NC with ccnc: false, CC0 with restrictions).
    - Consistent raw flags matching canonical license definition.
    - Strict `Unknown License` verification guarantee (`isVerified: false`).
  - Expanded `tests/music/jamendo-provider.test.ts` to **33 tests** (up from 23 tests):
    - Valid code 0 with "succeed" and "success", including case variations ("SUCCEED", "Success").
    - Rejection of code 0 with "failed".
    - Rejection of blank, whitespace, or null status.
    - Rejection of unrecognized status values ("pending", "ok", "unknown").
    - Rejection of non-integer, non-numeric, or missing codes.
    - Complete API code 1–11 mappings, including generic code 99 fallback.
    - Standalone singles compatibility, 429 rate limit, 500 error, 504 timeout, malformed JSON, and credential privacy.
  - Full Vitest suite passes: **25 test files, 279 tests passed (100% pass rate)**.
  - Full PostgreSQL integration test passes: `pnpm db:test` (25 assertions passed).
  - Full static checks pass: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings).
  - Production build passes: `pnpm build` succeeds.
- [x] **Live Provider Readiness Check:**
  - Environment inspection confirms `JAMENDO_CLIENT_ID` is unconfigured (`.env.local` is absent; `.env` retains non-functional placeholder `your_free_jamendo_client_id_here`).
  - Genuine live Jamendo requests were not executed to avoid using demo keys, fabricating results, or violating rate limits.
  - The mocked test suite remains 100% independent of live credentials.
- [x] **Zero Admin Creation & Zero Cost Maintained:**
  - Database remains completely clean with 0 records.
  - ₹0 INR expenditure permanently maintained.
- [ ] Awaiting user review and explicit approval before initiating Milestone 5.

---

## 4. Remaining Milestones Roadmap
- **Milestone 5: Persistent Audio Player & Queue Controller (Next Pending Milestone)**
  - Implement global Zustand player store coordinating HTML5 audio state.
  - Build docked root-layout player bar (play/pause, seek scrubber, volume control, queue drawer).
  - Resolve ephemeral stream URLs dynamically without persisting transient CDN URLs as canonical data.
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
2. **Windows Sandbox Network Isolation for Database Tests:** The agent's standard execution sandbox blocks all TCP network communication, including loopback connections to `127.0.0.1:5432`. As a result, running `pnpm test:auth` inside the sandbox fails with `connect EACCES 127.0.0.1:5432` for test files requiring a live PostgreSQL connection (`dal.test.ts`, `session.test.ts`, `register.test.ts`, `login.test.ts`, `invites.test.ts`, `bootstrap.test.ts`, `route.test.ts`, `db-theme.test.ts`, `tests/profile/route.test.ts`, `tests/profile/page.test.ts`), while pure unit and rendered component tests pass (160 tests across `password.test.ts`, `http.test.ts`, `constants.test.ts`, `tests/profile/constants.test.ts`, `tests/profile/components.test.ts`, `tests/auth/redirect.test.ts`, `tests/auth/login-page.test.ts`, `tests/auth/register-page.test.ts`, `tests/auth/logout-component.test.ts`, `tests/auth/admin-invitations-page.test.ts`, `tests/auth/home-navigation.test.ts`, `tests/music/licenses.test.ts`, `tests/music/jamendo-provider.test.ts`, `tests/music/search-route.test.ts`, `tests/music/search-ui.test.ts`). When unsandboxed, all 25 test files and **all 279 tests pass cleanly with 0 errors in ~9s**.
3. **Turbopack IPC Loader on Windows:** Stable webpack compilation (`--webpack`) is configured and verified for both dev and production builds.
4. **Neon PostgreSQL Free Scale-to-Zero:** Neon compute pauses after 5 minutes of idle time; the first incoming connection auto-wakes in ~300–500ms.
5. **Authentication Rate Limiting Status:** Process-local in-memory rate limiting was intentionally not introduced because it does not reliably protect serverless or multi-instance deployments. Per ₹0 budget requirements, platform-level protection (e.g. Vercel firewall rules, free edge middleware) will be evaluated during final deployment hardening without paid Redis or SaaS dependencies.
6. **Figma MCP Server Capabilities:** Remote Figma MCP server (`figma_figma`) creates files and queries metadata, but lacks `use_figma` scene-graph script execution. Native generative AI tools consume paid credits and are strictly prohibited. The canonical visual prototype is maintained in HTML.
7. **Jamendo API Terms & Developer Credentials:** Jamendo developer API access operates under published Developer Terms of Use last updated on September 17, 2013, governing non-commercial usage, direct content backlinks, attribution, and restrictions on caching and offline access. Search results are strictly ephemeral and not persisted in PostgreSQL. In development and production, the user supplies their own free `JAMENDO_CLIENT_ID` in `.env.local`; when unconfigured, the UI displays a helpful setup guide.

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
