# Harmoni 🎵

Harmoni is an open-source, personal-scale social music web application designed for a private circle of friends. It combines Spotify-inspired music discovery and persistent audio playback, Last.fm-inspired listening history and statistics, and sleek direct messaging with interactive track sharing.

Harmoni operates under a permanent **₹0 INR budget constraint** — utilizing 100% free, open-source technologies, community-tier hosting, and legal Creative Commons streaming sources.

---

## Technology Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19, TypeScript strict mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + PostCSS (`@tailwindcss/postcss`)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives + Lucide icons)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (persistent audio player and queue)
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io/) (Local PostgreSQL or free [Neon](https://neon.tech/))
- **Audio Playback:** Client-side HTML5 Audio streaming legal Creative Commons audio via [Jamendo API](https://developer.jamendo.com/)
- **Hosting (Future):** [Vercel Hobby Tier](https://vercel.com/) (Free, non-commercial)

---

## Prerequisites (Windows & Cross-Platform)

Ensure you have the following installed on your machine:

- **Node.js:** v20.x or v22.x+ (Tested on v24.16.0)
- **Package Manager:** `pnpm` (v11+ recommended)
- **Git:** Git version 2.40+ installed and configured with your GitHub credentials

---

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vansh-kumar-007/Harmoni.git
   cd Harmoni
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Copy the example environment configuration template:
   ```bash
   cp .env.example .env.local
   ```
   *(Note: For Milestone 1, no environment variables are strictly required to run the placeholder app).*

4. **Start the local development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Quality, Test & Build Commands

- **Run unit and integration test suite:**
  ```bash
  pnpm test:auth
  ```

- **Run database integrity verification:**
  ```bash
  pnpm db:test
  ```

- **Run all automated tests:**
  ```bash
  pnpm test
  ```

- **Run linter:**
  ```bash
  pnpm lint
  ```

- **Run TypeScript check:**
  ```bash
  pnpm typecheck
  ```

- **Create production build:**
  ```bash
  pnpm build
  ```

- **Run production server locally:**
  ```bash
  pnpm start
  ```

---

## Authentication & API Endpoints (Milestones 3B, 3B.1 & 3B.2)

Harmoni implements a hardened, invitation-only authentication backend with strict 64 KiB streaming request-body size enforcement, RFC-compliant media-type validation, and timing-attack protected endpoints:

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public (Requires Invite) | Atomic user registration and conditional single-use invitation redemption with strict payload validation. Issues session cookie. |
| `POST` | `/api/auth/login` | Public | Username/password authentication with dummy Argon2id verification for anti-enumeration and timing protection. |
| `POST` | `/api/auth/logout` | Authenticated | Idempotent session revocation in PostgreSQL and cookie clearance. |
| `POST` | `/api/admin/invites` | Admin Only | Generates 256-bit cryptographically secure single-use invitation codes. Returns code once. Rejects unsupported payloads. |
| `PATCH` | `/api/users/me/theme` | Authenticated | Updates personal visual theme preference (`obsidian-studio`, `nordic-aurora`, `editorial-vinyl`, `crimson-vigil`, `cobalt-web`). |

---

## Appearance Settings & Multi-Theme Engine (Milestone 3C.1)

Harmoni provides five distinct selectable visual themes with independent, per-user persistent storage:
1. **Obsidian Studio (Default):** Warm Analog Hi-Fi (Brushed slate, warm charcoal, amber glow).
2. **Nordic Aurora:** Atmospheric Midnight Glass (Midnight ink glass, bioluminescent cyan and mint emerald).
3. **Editorial Vinyl:** Swiss Typographic Record Club (Matte vinyl black, Swiss grid typography, acid-lime).
4. **Crimson Vigil:** Daredevil-inspired Shadow Noir (Deep shadow black, dark oxblood leather, blind-justice crimson).
5. **Cobalt Web:** Spider-Man-inspired Midnight Navy (Midnight navy, royal cobalt, kinetic red-600, sky cyan pips).

Users can preview and save preferences at `/settings/appearance`. The theme is rendered server-side via Next.js 16 App Router for zero-FOUC (Flash of Unstyled Content).

---

## Project Structure Foundation

```
Harmoni/
├── public/                 # Static public assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── favicon.ico
│   │   ├── globals.css     # Tailwind CSS v4 design tokens
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Milestone 1 verified home view
│   ├── components/         # Reusable UI components
│   └── lib/                # Shared utilities (cn helper, etc.)
├── components.json         # shadcn/ui configuration
├── eslint.config.mjs       # ESLint v9 configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── pnpm-lock.yaml          # Pnpm lockfile
├── postcss.config.mjs      # PostCSS Tailwind v4 configuration
├── tsconfig.json           # TypeScript strict configuration
├── AGENTS.md               # Mandatory agent instructions & ₹0 budget rules
├── DEVELOPMENT_STATUS.md   # Current milestone & roadmap tracking
├── LICENSE                 # AGPL-3.0 open-source license
└── README.md               # Project documentation
```

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](LICENSE) file for details.
