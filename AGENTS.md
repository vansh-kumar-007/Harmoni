# Harmoni — Engineering & Agent Operational Guidelines (AGENTS.md)

This document contains mandatory, non-negotiable guidelines for all AI agents and human contributors working on **Harmoni**.

---

## 1. Absolute Budget: ₹0 INR (Permanent Constraint)

- **Total Expenditure:** Exactly **₹0 INR**. Never spend, configure, or recommend any paid service.
- **Prohibited:**
  - Paid hosting, paid databases, paid APIs, paid authentication, paid storage.
  - Paid domains, paid UI templates, paid libraries.
  - Free trials that convert to paid billing, usage-based metered billing, automatic paid upgrades.
  - Services requiring credit/debit card details that could result in accidental charges.
- **Permitted Free Services:**
  - Local development runtime (Node.js, PostgreSQL/SQLite).
  - Vercel Hobby tier (Free non-commercial hosting with hard usage caps, no payment card required).
  - Neon Serverless PostgreSQL Free tier (1 GB storage, scale-to-zero, auto-waking on query, no payment card required).
  - Free developer API keys with strictly non-commercial terms (e.g., Jamendo, MusicBrainz).
- **Graceful Degradation:** If any free tier limit is reached, the application must degrade or throttle gracefully. Never recommend a paid upgrade.

---

## 2. Target Scale & Product Philosophy

- **Intended Audience:** Built for a personal circle of 5 to 15 friends.
- **Priorities:**
  1. Exceptional, clean UI/UX and visual polish.
  2. Simplicity, reliability, and maintainability.
  3. Functional, legal music playback and discovery.
  4. Music sharing and social interaction.
  5. Zero recurring operating costs.
- **Design Philosophy:** Avoid speculative enterprise architecture, microservices, Kubernetes, Redis, or distributed message queues. Build a clean, modular monolith.

---

## 3. Technology Stack & Architectural Decisions

- **Framework:** Next.js 16 (App Router, React 19, TypeScript 5).
- **Styling & UI:** Tailwind CSS v4, PostCSS (`@tailwindcss/postcss`), and shadcn/ui primitives.
- **Persistent State:** Zustand for global audio player, queue, volume, and playback state.
- **Database:** PostgreSQL for both local and production environments via Prisma ORM. No dual-provider schema complexity.
- **Authentication:** Closed-circle invitation code system with secure session cookies (Argon2id password hashing). No paid email or SMS dependencies.
- **Google Drive Storage Policy:** Do NOT integrate Google Drive SDKs, OAuth, or automated backup/streaming integrations into Harmoni.

---

## 4. Music Architecture & Licensing Integrity

- **Decoupled Architecture:** Strict separation between:
  1. Track Metadata (Title, Artist, Album, MBID).
  2. Artwork (Remote CDN URLs).
  3. Playback Sources (`AudioSource` model with provider IDs, format, bitrate, availability).
  4. Licensing & Attribution (Creative Commons license type, artist attribution string).
- **No Temporary Streaming URLs as Canonical Data:** Streaming URLs from CDNs expire or change. Always store the provider's permanent ID (e.g., Jamendo Track ID) and resolve stream URLs dynamically.
- **Verified Rights & Attribution:** Never treat copyrighted artwork as open domain. Display required Creative Commons attribution badges and artist links for every playable track.
- **No Fake Functionality:** Never mock, fabricate, or hardcode fake music playback or simulated streaming data.

---

## 5. Security & Secret Management

- **Zero Secrets in Version Control:** Never commit `.env`, credentials, private keys, or API tokens.
- **Backend Isolation:** All external API keys (e.g., Jamendo Client ID) must remain on the server side in Route Handlers or Server Actions. Never expose secrets to client browser bundles.
- **Validation:** Enforce strict runtime schema validation (Zod) on all API endpoints and mutations.
- **Session Protection:** Auth session cookies must always be `HttpOnly`, `SameSite=Lax`, and `Secure` in production.

---

## 6. Git Workflow & Version Control Standards

- **Default Branch:** `main`.
- **Target Remote:** `https://github.com/vansh-kumar-007/Harmoni.git`.
- **Inspection First:** Always inspect local and remote branches before pushing. Never overwrite existing remote work.
- **No Force Pushes:** `git push --force` is strictly forbidden.
- **Commit Messages:** Follow conventional commit formatting (e.g., `chore: ...`, `feat: ...`, `fix: ...`).
- **Milestone Verification:** Every completed milestone must pass linting, typechecking, production build, and local verification before being committed and pushed.
- **Reporting Truthfulness:** If a git push or command fails, report the exact error truthfully. Never claim code was pushed unless Git confirms success.

---

## 7. Development Discipline & Error Handling

- **No Endless Loops:** If a command or check fails, inspect the error, make one targeted fix, and retry once. If it fails a second time, stop and report the exact blocker.
- **No Premature Feature Building:** Implement only what is scoped in the approved milestone.
- **No Unnecessary Dependencies:** Do not install speculative libraries or third-party packages unless strictly required by the active milestone.
