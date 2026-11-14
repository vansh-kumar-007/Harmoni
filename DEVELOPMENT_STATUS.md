# Harmoni — Development Status

## 1. Project Overview
Harmoni is an open-source, personal-scale social music web application designed for a private circle of 5–15 friends. It combines music discovery, legal playback, listening history tracking, and direct music sharing at **₹0 INR recurring cost**.

- **Repository:** `https://github.com/vansh-kumar-007/Harmoni.git`
- **Default Branch:** `main`
- **License:** AGPL-3.0

---

## 2. Current Milestone
**Milestone 1: Project Foundation & GitHub Initialization** (COMPLETED & VERIFIED)

---

## 3. Completed Work (Milestone 1)
- [x] Initialized Git repository on `main` branch with remote configured to `origin`.
- [x] Scaffolded Next.js 16.4.6 project using `pnpm` with App Router, React 19.3.0, and TypeScript strict mode.
- [x] Integrated Tailwind CSS v4 using `@tailwindcss/postcss` and PostCSS.
- [x] Initialized shadcn/ui configuration (`components.json`) and core utilities (`src/lib/utils.ts` with `clsx` and `tailwind-merge`).
- [x] Implemented minimal placeholder home view demonstrating verified app initialization without committing to premature UI templates.
- [x] Created strict `.gitignore` blocking node modules, build artifacts, environment files, local databases, and secrets.
- [x] Configured template `.env.example` with zero credentials.
- [x] Established `AGENTS.md`, `README.md`, `DEVELOPMENT_STATUS.md`, and `LICENSE` (AGPL-3.0).
- [x] Verified TypeScript compilation (`pnpm typecheck`), ESLint (`pnpm lint`), production build (`pnpm build`), and dev server runtime HTTP response (HTTP 200).

---

## 4. Remaining Milestones Roadmap
- **Milestone 2: Database Layer & Decoupled Schema Setup**
  - Configure Prisma ORM with PostgreSQL.
  - Implement decoupled `Track` metadata and `AudioSource` models.
  - Set up `User`, `InviteCode`, `Friendship`, `Playlist`, `Scrobble`, and `Conversation` models.
  - Create database seed script with sample legal Creative Commons tracks.
- **Milestone 3: Invitation-Based Authentication & User Profiles**
  - Implement invite code validation and Argon2id password hashing.
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

## 5. Known Technical Limitations
1. **Turbopack IPC Loader on Windows:** Next.js 16 Turbopack build currently encounters IPC communication issues with child process webpack loaders on Windows. The project is configured to use the stable webpack bundler (`next build --webpack`, `next dev --webpack`), which builds and runs reliably.
2. **Server Port Sandbox Isolation:** On Windows environments inside the development sandbox, local HTTP loopback connections to listening ports require elevated network access or explicit host binding.
3. **Neon PostgreSQL Free Scale-to-Zero:** Neon compute pauses after 5 minutes of inactivity; the very first request after an idle period experiences a ~300–500ms cold start latency while compute auto-wakes.

---

## 6. Current Dependencies & Licensing
- `next` (16.4.6) — MIT License
- `react` / `react-dom` (19.3.0) — MIT License
- `tailwindcss` (4.3.3) / `@tailwindcss/postcss` (4.3.5) — MIT License
- `postcss` (8.5.32) — MIT License
- `clsx` (2.1.1) / `tailwind-merge` (3.7.0) — MIT License
- `class-variance-authority` (0.7.1) — Apache-2.0 License
- `lucide-react` (1.72.0) — ISC License
- `typescript` (5.9.3) — Apache-2.0 License
- `eslint` (9.39.5) / `eslint-config-next` (16.4.6) — MIT License

*Every dependency is strictly free and open-source with permissive licensing compatible with AGPL-3.0.*

---

## 7. Budget & Cost Confirmation
- **Total Expenditure to Date:** **₹0.00 INR**
- **Permitted Future Expenditure:** **₹0.00 INR (Permanent)**
- **Paid Services Allowed:** None. No billing-enabled services, subscriptions, or automatic upgrade mechanisms will ever be introduced.
