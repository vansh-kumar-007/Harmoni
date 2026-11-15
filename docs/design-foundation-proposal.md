# Harmoni — Visual Foundation Research & Design Specification
**Milestone 3C.0.1: Refined Design Proposal & Figma Exploration Specification**  
*Document Version:* 1.1.0  
*Status:* Refined & Specified (Awaiting User Review & Explicit Approval)  
*Author:* Harmoni Engineering & Architecture Team  
*Target Stack:* Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · PostgreSQL  
*Figma Exploration File:* [https://www.figma.com/design/tde7tKDtxqTwhqJQko989H](https://www.figma.com/design/tde7tKDtxqTwhqJQko989H) (Key: `tde7tKDtxqTwhqJQko989H`)  
*Interactive Visual Prototype:* [`docs/visual-design-exploration.html`](file:///d:/Projects/Harmoni/docs/visual-design-exploration.html)

---

## 1. Executive Summary & Product Context

Harmoni is an open-source, personal-scale social music application crafted specifically for an intimate circle of **5 to 15 close friends**. The application unifies music discovery, legal audio playback, listening history tracking (scrobbling), and direct track-sharing conversations under an absolute, non-negotiable **₹0 INR lifetime budget constraint**.

To succeed, Harmoni avoids two critical pitfalls:
1. **The Sterile SaaS Clone:** Cluttered dashboard widgets, generic card walls, complex analytics tables, and cookie-cutter corporate aesthetics.
2. **The Direct Commercial Clone:** Shamelessly duplicating Spotify or Apple Music down to their signature accent colors and branding, which strips the product of identity and imports enterprise architecture inappropriate for a private friend group.

Harmoni's visual foundation is **warm, tactile, intentional, and high-fidelity**—evoking the feeling of a private listening lounge where friends share vinyl records and discover independent artists. Every component, surface, and transition serves the listening experience.

> [!NOTE]
> **Design Mockup Data Disclaimer:** All track titles, artist names, album art covers, timestamps, scrobble tallies, and user profiles featured in this specification, in the Figma exploration file, and in the HTML prototype are **illustrative design placeholders**. They demonstrate layout density, typography scale, and responsive behavior, and do not represent real production database records.

---

## 2. Research Findings & Open-Source Foundation Analysis

We investigated 5 prominent open-source music player applications, UI references, and templates to assess their architectural assumptions, licensing terms, and compatibility with Harmoni's stack.

### 2.1 Explicit Categorization of Sources

To maintain strict intellectual property compliance and architectural integrity, external references are formally categorized:

1. **Permissive Code Reuse (Permitted with Attribution):**
   - **Candidate 3 (Official shadcn/ui Music Example):** Standard MIT license. Code primitives, accessible Radix wrappers, and styling patterns may be adapted directly into Harmoni. **MIT Requirement:** All copied or adapted source files must retain the original copyright notice and MIT disclaimer in their headers.
2. **Architectural & Pattern Reference Only (No Direct UI Copying):**
   - **Candidate 4 (Antonio Erdeljac's Full-Stack Spotify Clone):** Standard MIT license. Evaluated strictly for its lightweight **Zustand global player store pattern** that coordinates audio playback across Next.js client-side route transitions without remounting. All Supabase cloud, S3 storage, and Stripe payment dependencies are discarded.
3. **Visual & Layout Inspiration Only (Zero Code Reuse):**
   - **Candidate 1 (Infinitunes):** MIT root license, but the project `README.md` includes a restrictive non-standard rider (*"Please refrain from duplicating the project for commercial purposes"*) and depends on reverse-engineered JioSaavn scraping APIs. Incompatible with Harmoni's legal streaming policy. Inspected purely for responsive player drawer ergonomics.
   - **Candidate 2 (Mice):** Unlicensed public repository (no `LICENSE` file; default **All Rights Reserved** under copyright law). Inspected solely for low-density tabular layout aesthetics. Zero code may be imported.
   - **Candidate 5 (Feishin):** GPL-3.0 license. Built on Mantine UI and Electron rather than Tailwind CSS. Incompatible with Tailwind v4 styling paradigms. Inspected solely for high-density music organization philosophy.

---

### 2.2 License & Compatibility Comparison Matrix

| Evaluation Dimension | 1. Infinitunes | 2. Mice | 3. shadcn/ui Music | 4. Next13-Spotify | 5. Feishin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Repository URL** | [rajput-hemant/infinitunes](https://github.com/rajput-hemant/infinitunes) | [sillyangel/mice](https://github.com/sillyangel/mice) | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | [antonioerdeljac/next13-spotify](https://github.com/antonioerdeljac/next13-spotify) | [jeffvli/feishin](https://github.com/jeffvli/feishin) |
| **Stated License** | MIT (with non-commercial README note) | None (All Rights Reserved) | **MIT** (Standard permissive) | **MIT** (Standard permissive) | **GPL-3.0** (Copyleft) |
| **Legal Safety for Harmoni** | ⚠️ Risky (Unofficial APIs & README rider) | ❌ Prohibited (No license) | ✅ **100% Safe** (Preserve notice) | ✅ **100% Safe** (Preserve notice) | ⚠️ Compatible with AGPL, but Mantine stack |
| **Permitted Role** | Visual inspiration only | Visual inspiration only | **Permissive code reuse** | **Architectural reference** | Visual inspiration only |
| **Next.js 16 Compatibility** | High (App Router) | High (App Router) | Native / Reference standard | High (App Router) | Low (Vite / Electron) |
| **Tailwind CSS v4 Match** | Moderate (Tailwind v3) | Moderate (Tailwind v3) | Native (`@tailwindcss/postcss`) | Moderate (Tailwind v3) | ❌ Incompatible (Mantine UI) |
| **shadcn/ui Alignment** | Direct match | Direct match | **Primary Source** | Partial match | Incompatible |
| **Persistent Player Design** | Docked bottom bar | Bottom bar | None (Static visual only) | Bottom bar + Zustand | Full pre-amp bar |
| **Mobile Responsiveness** | Good (Slide-over sheet) | Moderate | Basic desktop focus | Basic desktop focus | Desktop focused |
| **Zero-Cost Feasibility (₹0)**| Relies on unofficial API | Requires self-hosted daemon | ✅ **100% Free** | Tied to Supabase / Stripe | Free, but heavy |
| **Extractable Value** | Drawer interaction ideas | Tabular layout reference | Primitives & Typography | Zustand player pattern | Layout philosophy only |

---

## 3. Visual Direction Proposals

We evaluated three distinct, production-grade visual directions for Harmoni:

```
+---------------------------------------------------------------------------------------------------+
|                                      HARMONI VISUAL SPECTRUM                                      |
|                                                                                                   |
|  [ Direction 1: Obsidian Studio ]    [ Direction 2: Nordic Aurora ]    [ Direction 3: Editorial ] |
|  - Warm vinyl & analog preamp        - Midnight ink & glass washes     - Swiss grid & bold mono   |
|  - Amber & brushed brass glow        - Bioluminescent cyan/emerald     - Pure white & acid lime   |
|  - Tactile, intimate, cozy           - Modern, atmospheric, airy       - Sharp, confident, indie  |
+---------------------------------------------------------------------------------------------------+
```

---

### 3.1 Direction 1: "Obsidian Studio" (Warm Analog / High-Fidelity Hi-Fi) — RECOMMENDED

#### A. Aesthetic & Personality
Inspired by high-end analog audio preamps, brushed slate listening desks, vinyl record sleeves, and the warm, amber glow of vacuum tubes during a late-night listening session. It feels intimate, tactile, mature, and deeply musical.

#### B. Color Palette
- **Deep Canvas (Background):** `#0b0c10` (Warm obsidian charcoal with a slight organic undertone)
- **Primary Surface (Sidebar & Shell):** `#11131a` (Deep brushed slate)
- **Raised Card Surface:** `#161922` (Subtle elevated studio chassis)
- **Hover / Active Surface:** `#1e222e`
- **Machined Hairline Borders:** `#252936` (Low-contrast 1px divider)
- **Primary Accent (Tube Glow):** `#f59e0b` (Amber-500) / Active glow: `#fbbf24` (Amber-400)
- **Secondary Accent (Burnished Copper):** `#d97706` (Amber-600)
- **Text Primary (Foreground):** `#f3f4f6` (Warm off-white, optical grade)
- **Text Muted:** `#9ca3af` (Studio silver grey)
- **Status Badges (License / Success):** `#10b981` (Subdued emerald)
- **Alert / Destructive:** `#ef4444` (Indicator red)

#### C. Typography
- **Headings & Display:** `Plus Jakarta Sans` or `Outfit` (Warm geometric curves with humanist terminal endings).
- **Body & Controls:** `Inter` or `Geist Sans` (Maximum legibility at small UI sizes: 11px–14px).
- **Metadata, Timestamps & License Badges:** `JetBrains Mono` or `Geist Mono` (Precision monospace styling for track times, bitrates, and Creative Commons badges).

#### D. Component Styling & Surfaces
- **Album Artwork & Cards:** Subtle 10px rounded corners. Artwork is framed with a recessed 1px border (`#252936`). Active playing card displays a subtle amber vinyl groove badge on hover.
- **Sidebar & Navigation:** Vertical left panel with subtle 1px right border. Navigation items feature rounded indicator pills; active item displays a glowing amber pip.
- **Track List:** Sleek table with generous row height (52px). Track index number transitions into a 3-bar animated amber equalizer when actively playing. Monospace duration (`03:42`) and Creative Commons badge (`CC BY-SA`) rendered in muted text.
- **Persistent Player:** Docked full-width bottom bar (80px height). Designed like a hi-fi rack component: hairline amber scrubber bar across the top edge, smooth track scrub head with glowing amber aura, rotary-feel volume slider, and scrobble milestone ring indicating the 50% / 30-second listening mark.
- **Avatar & Profiles:** Circular frame with warm brushed-brass ring. Bio displayed in clean typography with a listening summary badge.

#### E. Motion & Ergonomics
- Micro-transitions: 150ms ease-out transitions on hover states.
- Scrobble progress: A subtle, satisfying amber pulse when a track passes the 50% threshold and records a valid scrobble.
- **Visual Ergonomics:** Deep charcoal (`#0b0c10`) reduces screen glare and visual fatigue in low-light environments compared to harsh pure blacks (`#000000`) or stark white interfaces, while maintaining compliant WCAG AA contrast (minimum 4.5:1 ratio for text).

---

### 3.2 Direction 2: "Nordic Aurora" (Ethereal Midnight Glass)

#### A. Aesthetic & Personality
Inspired by Scandinavian minimalist architecture, dark frosted glassmorphism, and the natural ambient illumination of the Aurora Borealis. It feels ethereal, modern, weightless, and spacious.

#### B. Color Palette & Typography
- **Canvas:** `#08090d` (Midnight ink)
- **Surfaces:** `rgba(18, 20, 30, 0.70)` with `backdrop-filter: blur(16px)`
- **Accents:** Dual gradient shifting from Cyan (`#06b6d4`) to Emerald (`#10b981`)
- **Typography:** `Space Grotesk` headings + `Inter` body + `Space Mono` metadata.

#### C. Evaluation Verdict
While visually striking, heavy use of full-screen `backdrop-filter: blur()` and continuous color gradient shifts triggers excessive GPU composition cycles and battery drain on low-end laptops and mobile browsers. Discarded in favor of Direction 1's lightweight CSS surfaces.

---

### 3.3 Direction 3: "Editorial Vinyl" (Swiss Typographic / Indie Record Club)

#### A. Aesthetic & Personality
Rooted in Swiss International Typographic Style and independent record label packaging (Factory Records, Blue Note, Ninja Tune). Characterized by high contrast, structural micro-borders, bold grid divisions, and anti-corporate authenticity.

#### B. Color Palette & Typography
- **Canvas:** `#0d0e11` (Matte vinyl black)
- **Surfaces:** `#15171e` with visible structural borders `#2d313f`
- **Accents:** Electric Lime (`#ccff00`) or Cobalt (`#3b82f6`)
- **Typography:** `Syne` / `Archivo Black` poster type + `JetBrains Mono` catalog numbers (`// CC-BY-4.0`, `// 320 KBPS`).

#### C. Evaluation Verdict
The monospace catalog discipline and precise micro-borders of Direction 3 provide outstanding data hierarchy. We borrow its monospace metadata styling and crisp dividers to enrich the warmth of Direction 1.

---

### 3.4 Summary Recommendation: Obsidian Studio + Monospace Discipline

**Recommendation:** Adopt **Direction 1: "Obsidian Studio"** as Harmoni's core visual foundation, enriched with the clean typographic discipline and monospace metadata styling of **Direction 3**.

#### Architectural & Product Justifications:
1. **Intimate Social Fit:** Built for 5–15 friends sharing music. A warm, analog studio lounge aesthetic creates an inviting, cozy atmosphere distinct from generic commercial green interfaces.
2. **Glare Reduction & Visual Ergonomics:** The deep obsidian charcoal background (`#0b0c10`) combined with raised slate surfaces (`#11131a`, `#161922`) significantly reduces glare in evening listening environments while letting album artwork pop vibrantly.
3. **Tailwind CSS v4 & Performance Compatibility:** Relies on solid CSS surface tokens, crisp hairline borders, and subtle opacity transitions. It avoids expensive full-viewport canvas blur filters, preserving 60fps performance on all devices.
4. **Native shadcn/ui "Zinc" Alignment:** Seamlessly aligns with our initialized shadcn/ui "new-york" style and zinc palette, allowing standard Radix primitives without framework fighting.

---

## 4. Design Token Specification (Tailwind CSS v4 & CSS Variables)

These design tokens will translate directly into `src/app/globals.css` using Tailwind CSS v4 `@theme inline`:

```css
:root {
  /* Core Obsidian Canvas & Surfaces */
  --background: #0b0c10;
  --foreground: #f3f4f6;

  /* Surfaces & Structural Containers */
  --card: #14161f;
  --card-foreground: #f3f4f6;
  --popover: #161924;
  --popover-foreground: #f3f4f6;

  /* Muted Surfaces & Micro-Borders */
  --muted: #1c202c;
  --muted-foreground: #9ca3af;
  --border: #252936;
  --input: #252936;

  /* Studio Amber Accents */
  --primary: #f59e0b;
  --primary-foreground: #0b0c10;
  --primary-hover: #fbbf24;
  --primary-subtle: rgba(245, 158, 11, 0.12);

  /* Secondary Brass / Copper Accents */
  --secondary: #222634;
  --secondary-foreground: #e5e7eb;
  --accent: #d97706;
  --accent-foreground: #ffffff;

  /* Functional & Semantic Status */
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --success: #10b981;
  --success-foreground: #ffffff;

  /* Geometry & Metrics */
  --radius: 0.625rem; /* 10px standard radius */
  --radius-sm: 0.375rem; /* 6px */
  --radius-lg: 0.875rem; /* 14px */
}
```

### Typography Scale
- **Display 1 (Hero / Profile):** `2.25rem` (36px), font-weight: 700, line-height: 1.15
- **Heading 1 (Page Title):** `1.5rem` (24px), font-weight: 600, line-height: 1.25
- **Heading 2 (Section Title):** `1.125rem` (18px), font-weight: 600, line-height: 1.3
- **Body Regular (Main text, titles):** `0.875rem` (14px), font-weight: 400 / 500, line-height: 1.5
- **Caption / Meta (Artist, timestamp):** `0.75rem` (12px), font-weight: 400, line-height: 1.4
- **Monospace Tags (License, Duration):** `0.6875rem` (11px), font-family: monospace, font-weight: 500, letter-spacing: 0.05em

---

## 5. Application Information Architecture & Layout Shell

Harmoni's application shell coordinates continuous, uninterrupted audio playback while users browse playlists, inspect profiles, and navigate between routes.

### 5.1 Reassessed Desktop Layout: 2-Column Default with On-Demand Social Drawer

In Milestone 3C.0, a permanent 3-column desktop layout was initially considered. However, for a private circle of 5 to 15 friends, a permanent third column permanently sacrifices valuable track list and cover art space.

**Refined Architecture:** Adopt a clean **2-column default layout** (Fixed left sidebar + spacious fluid main content), complemented by an **on-demand collapsible social slide-over drawer** (`z-40`, 300px) triggered via a top header or sidebar button.

```
+---------------------------------------------------------------------------------------------------+
|                                     DESKTOP APPLICATION SHELL                                     |
+---------------------+-------------------------------------------------------+---------------------+
| LEFT SIDEBAR        | MAIN SCROLLABLE VIEWPORT                              | (ON-DEMAND DRAWER)  |
| (Fixed: 240px)      | (Fluid: flex-1 · Dedicated bottom padding pb-28)      | (Collapsible: 300px)|
|                     |                                                       |                     |
| [H] Harmoni Logo    | Top Header: [Breadcrumbs / Search]      [Friends 👥]  | Listening Circle    |
|                     |                                                       | - Friend A          |
| > Discover          | Main Content Area:                                    | - Friend B          |
| > Search            | - Music recommendations / Hero vinyl card             |                     |
|                     | - Track listing table (generous multi-column layout)  | Shared Tracks Chat  |
| // LIBRARY          | - Profile headers & tabs                              | (Deferred to M7)    |
| > Liked Tracks      |                                                       |                     |
| > Playlists         |                                                       |                     |
| > History           |                                                       |                     |
|                     |                                                       |                     |
| [User Badge / Nav]  |                                                       |                     |
+---------------------+-------------------------------------------------------+---------------------+
| PERSISTENT HI-FI AUDIO PLAYER (Fixed: Bottom 0 · Full Width · Height: 80px · z-50)               |
| [Cover] Title - Artist  |  [⏮] [ ▶ / ⏸ ] [⏭]  [== Scrobble Scrubber ===]  |  [🔊 Vol] [Queue ☰] |
+---------------------------------------------------------------------------------------------------+
```

#### Detailed Desktop Structure:
1. **Left Navigation Sidebar (Fixed 240px width, `z-30`):**
   - **Header:** Harmoni brandmark with warm amber indicator dot.
   - **Primary Navigation:** Discover (`/`), Search (`/search`).
   - **Personal Library:** Liked Tracks (`/library/liked`), Playlists (`/library/playlists`), History & Scrobbles (`/library/history`).
   - **Footer:** Active user profile badge (`/@username`), role indicator (`ADMIN` / `USER`), and sign-out button.
2. **Main Scrollable Content Viewport (Fluid `flex-1`):**
   - Houses the active route (`page.tsx`).
   - Maintains dedicated bottom padding (`pb-28`, 112px) so long lists or footer elements are never obscured by the docked player.
3. **On-Demand Collapsible Social Drawer (Collapsible 300px slide-over, `z-40`):**
   - Slides smoothly over the right canvas edge when toggled by the user.
   - When closed, 100% of the viewport width is available for album artwork, tables, and playlists.
4. **Docked Audio Player (Fixed `bottom: 0`, full width, 80px height, `z-50`):**
   - Mounts at the root layout shell outside the page routing tree.
   - Preserves active HTML5 audio element and playback state across all client-side page transitions.

---

### 5.2 Mobile Layout Structure

On mobile devices (`< 768px`), screen real estate requires strict prioritization:

```
+------------------------------------+
| MOBILE VIEWPORT                    |
+------------------------------------+
| Top App Bar: [H] Harmoni  [🔍] [👤]|
+------------------------------------+
| Main Scrollable Content Viewport   |
| (Dedicated bottom padding: pb-36)  |
|                                    |
| - Discover / Track List / Profile  |
|                                    |
+------------------------------------+
| Compact Floating Player Bar (56px) |
| [Cover] Title - Artist    [ ▶ ] [⏭]|
+------------------------------------+
| Bottom Navigation Bar (56px)       |
| [ 🏠 ]     [ 🔍 ]   [ 📚 ]   [ 👤 ] |
| Home     Search   Library  Profile |
+------------------------------------+
```

1. **Top Minimal App Bar (48px height):** Logo, search icon shortcut, and profile avatar shortcut.
2. **Main Scrollable Viewport (`pb-36`):** Dedicated bottom padding of 144px accommodates both the floating mini-player and the fixed bottom navigation bar.
3. **Touch Target Sizing:** All mobile buttons, navigation icons, and track list actions enforce a minimum **48px × 48px interactive touch bounding box**, complying with WCAG 2.5.5 accessibility recommendations.
4. **Compact Floating Mini-Player Bar (56px height):**
   - Docked immediately above the bottom navigation bar (`bottom: 56px`).
   - Shows 40px album thumbnail, track title, and large touch-friendly Play/Pause and Next buttons.
   - Tapping anywhere on the mini-player expands an animated full-screen player sheet.
5. **Bottom Mobile Navigation Bar (56px height, `z-50`):**
   - 4 primary touch targets: Home (`/`), Search (`/search`), Library (`/library`), Profile (`/@username`).

---

## 6. Profile Page Specification (`/@username`)

Milestone 3C will implement user profiles and customizable preset avatars. This section defines the routing architecture, strict scope boundaries, and presentation specifications.

### 6.1 Next.js App Router Architecture: Clean `/@username` URLs

In Next.js App Router, directory names beginning with `@` (e.g. `src/app/@username`) are **parallel route slots**, not dynamic URL parameters. Attempting to create an `app/@username/page.tsx` folder will not match the URL `/@username`.

**Architectural Solution:**
Harmoni uses a standard dynamic segment backed by a Next.js rewrite rule in `next.config.ts`:

1. **Backing Route:** The profile page is authored at `src/app/users/[username]/page.tsx`.
2. **URL Rewrite in `next.config.ts`:**
   ```ts
   // next.config.ts
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     async rewrites() {
       return [
         {
           source: "/@:username",
           destination: "/users/:username",
         },
       ];
     },
   };

   export default nextConfig;
   ```
3. **Result:** Users and links access clean, elegant handles such as `/@alice` or `/@bob`. Next.js transparently resolves these requests to the underlying `users/[username]` route handler without URL redirects or parallel-slot naming conflicts.
4. **Asynchronous Parameter Awaiting (Next.js 16 / React 19):** In Next.js 16, route params must be explicitly awaited:
   ```ts
   interface ProfilePageProps {
     params: Promise<{ username: string }>;
   }

   export default async function ProfilePage({ params }: ProfilePageProps) {
     const { username } = await params;
     // Fetch user from DB using DAL
   }
   ```

---

### 6.2 Strict Milestone Scope Boundary (M3C vs Milestone 7)

To maintain development discipline, avoid premature feature creep, and honor the milestone plan:

- **What Milestone 3C Implements (Profile & Identity):**
  1. Profile presentation page at `/@username` (display name, handle, role badge, member since date).
  2. Biography display and self-service editing modal (up to 250 characters stored in `User.bio`).
  3. Avatar preset selection modal allowing the user to pick one of the **8 handcrafted SVG avatar presets** (updating `User.avatarKey`).
  4. Display of public playlists authored by the user (`Playlist.isPublic = true`).
  5. Read-only listening history and scrobble statistics summary.
- **What is Strictly Deferred to Milestone 7 (Social Networking & Chat):**
  1. Dispatching friend requests (`POST /api/friends/request`).
  2. Accepting or declining incoming friend requests.
  3. Unfriending, blocking, or muting relationships.
  4. Real-time direct messaging or track-sharing chat drawers.
- **Deceptive UI Prevention:** Milestone 3C mockups and implementation will **NOT** render fake or non-functional "Add Friend", "Accept Request", or "Send Message" buttons. When viewing another user's profile during Milestone 3C, the profile renders a neutral member tag (e.g. `[ Harmoni Member ]`) or self-service `[ Edit Profile ]` button if viewing one's own profile.

---

### 6.3 Real-Time Presence Clarification

> [!IMPORTANT]
> **No Presence Model in Schema:** Harmoni's PostgreSQL Prisma schema (`prisma/schema.prisma`) contains models for `User`, `Session`, `InviteCode`, `Track`, `AudioSource`, `Artist`, `Album`, `Playlist`, `PlaylistItem`, `LikedTrack`, `Scrobble`, and `Friendship`.
> 
> There is **no database table or schema model for live user presence, socket status, or now-playing broadcast**.
> 
> Any concept of displaying "Alice is listening to Track X right now" is an exploratory idea for future milestones (potentially via lightweight polling in Milestone 7). It must **not** be documented or treated as existing database functionality today.

---

### 6.4 Profile Wireframe & Data Mapping

```
+---------------------------------------------------------------------------------------------------+
| USER PROFILE SPECIFICATION: /@username                                                            |
+---------------------------------------------------------------------------------------------------+
| [ PRESET AVATAR ]  Display Name  [ ADMIN / USER Badge ]                                           |
| (112px Circle)     @username · Member since November 2026                                         |
|                    "Curating late-night jazz, ambient beats and indie electronica."               |
|                                                                                                   |
|                    [ Self View: Edit Profile Button ] / [ Other View: Member Tag ]                |
+---------------------------------------------------------------------------------------------------+
| [ Overview Tab ]         [ Playlists Tab ]         [ Liked Tracks Tab ]         [ History Tab ]   |
+---------------------------------------------------------------------------------------------------+
| RECENT LISTENING ACTIVITY (Design Placeholder)     | TOP ARTISTS (Design Placeholder)             |
| 1. Solar Drift — Tycho (Played 12m ago)            | 1. Tycho (142 scrobbles)                     |
| 2. Kiasmos — Looped (Played 1h ago)                | 2. Kiasmos (98 scrobbles)                    |
|                                                    |                                              |
| PUBLIC PLAYLISTS (Created by User)                 | LISTENING MILESTONES (Design Placeholder)    |
| [Card: Ambient Study]  [Card: Weekend Chill]       | Total Scrobbles: 1,420 · Total Tracks: 384   |
+---------------------------------------------------------------------------------------------------+
```

| Profile UI Element | Database Field / Source | Status in Harmoni Today |
| :--- | :--- | :--- |
| **Avatar Graphic** | `User.avatarKey` (`String`, default `"avatar_1"`) | Supported in DB · UI picker target for M3C |
| **Display Name** | `User.displayName` (`String`) | Supported in DB & Auth |
| **Username Handle** | `User.username` (`String @unique`, slug `/@username`) | Supported in DB & Auth |
| **Role Badge** | `User.role` (`Role`: `USER` or `ADMIN`) | Supported in DB & Auth |
| **Member Since** | `User.createdAt` (`DateTime`, formatted e.g. "Nov 2026") | Supported in DB & Auth |
| **User Biography** | `User.bio` (`String? @db.VarChar(250)`) | Supported in DB · Edit bio target for M3C |
| **Public Playlists** | `Playlist` model (`userId`, `isPublic = true`) | Supported in DB · Read display in M3C |
| **Liked Tracks Count** | `LikedTrack` count (`userId`) | Supported in DB · Read display in M3C |
| **Recent Scrobbles** | `Scrobble` model (`userId`, `listenedAt`) | Supported in DB · Display in M3C / Engine in M6 |
| **Friendship Mutations** | `Friendship` model | Supported in DB · **Deferred to Milestone 7** |
| **Live Presence** | None (No schema model) | **Unsupported** · Future exploration only |

---

### 6.5 The 8 Handcrafted SVG Avatar Presets

To honor the **₹0 INR budget** and avoid recurring S3 or cloud image hosting charges, Harmoni provides **8 handcrafted, distinctive SVG preset avatars** stored as lightweight client-side assets:

1. `avatar_1`: **Amber Studio Turntable** — Minimalist vinyl turntable with golden needle and spinning grooves.
2. `avatar_2`: **Golden Tube Preamp** — Vacuum tube filament glowing warmly inside an audio amplifier chassis.
3. `avatar_3`: **Obsidian Waveform** — Intersecting audio sine waves in copper and amber tones.
4. `avatar_4`: **Geometric Vinyl Disc** — Concentric disc tracks with a central label and brushed brass spindle.
5. `avatar_5`: **Nordic Aurora Prism** — Geometric crystal refracting cyan and emerald acoustic light.
6. `avatar_6`: **Neon Cassette Tape** — Retro studio cassette shell with dual tape spools.
7. `avatar_7`: **Soundwave Equalizer** — Five-band vertical studio frequency spectrum with peak indicators.
8. `avatar_8`: **Acoustic Reverberation** — Concentric sound propagation rings expanding across a dark canvas.

- **Avatar Presentation:** 112px diameter circle on desktop (80px on mobile) enclosed in a 2px hairline brass ring (`#d97706`) with an amber ambient halo.
- **Editing Modal:** When an authenticated user views their own profile (`getCurrentUser().id === profileUser.id`), an "Edit Profile" button opens an accessible modal with an 8-item visual avatar grid and a character-counted bio textarea.

---

## 7. Figma Integration Audit & Exploration Findings

### 7.1 Figma Environment & Permissions Audit
We conducted a thorough capability audit of Antigravity's connected Figma integration using the remote MCP server (`figma_figma`):

- **Connected User:** Vansh Kumar (`vanshkumar.fds@gmail.com`)
- **Team Workspace:** "Vansh Kumar's team" (`team::1697927119598855106`)
- **Account Tier:** `student` (Verified Figma Student/Education Account)
- **Role & Seat:** `admin` role, `View` seat.
- **Enabled Capabilities:** `code_layers_enabled: true`, `specs_enabled: true`.
- **Cost Audit at Execution Time:** Zero-cost execution confirmed for standard file creation, inspection, metadata querying, and code layer transmission.
- **Strict Budget Safeguard:** Native Figma AI generation tools (`generate_vector_illustration`, `generate_image`) consume paid credits; under Harmoni's ₹0 INR rule, these tools are **strictly prohibited and never executed**.

### 7.2 MCP Server Capabilities & Tool Boundaries
1. **File Creation & Session Tools:**
   - `create_new_file`: Successfully creates new Figma Design files under the student team workspace.
   - `create_session`: Creates persistent live sessions for Figma interactions.
   - `get_metadata` / `get_design_context` / `get_screenshot`: Fully functional for inspecting Figma file nodes and visual rendering.
2. **Tool Limitations Discovered:**
   - The remote MCP server does **not** expose `use_figma` (which executes arbitrary JavaScript inside the Figma plugin scene graph).
   - `send_code_to_figma` creates runnable Code Layers / Make files; its schema explicitly clarifies: *"Does not create native Design shapes"*.
3. **Dual Exploration Strategy:**
   - **Canonical Figma Design File:** Created and verified under Vansh Kumar's student team workspace:
     - **File Name:** `Harmoni — Visual Design Exploration`
     - **File Key:** `tde7tKDtxqTwhqJQko989H`
     - **File URL:** [https://www.figma.com/design/tde7tKDtxqTwhqJQko989H](https://www.figma.com/design/tde7tKDtxqTwhqJQko989H)
     - **Session ID:** `9ac1b3e9-1172-43d8-85ce-3d6b3ea7d042`
   - **Pixel-Accurate Interactive Visual Prototype:** Authored in [`docs/visual-design-exploration.html`](file:///d:/Projects/Harmoni/docs/visual-design-exploration.html), providing high-fidelity visual evaluation of all three directions, 1440×900 desktop screens, 390×844 mobile screens, and the complete token system.

---

## 8. High-Fidelity Prototype Specification

The interactive visual exploration is staged in [`docs/visual-design-exploration.html`](file:///d:/Projects/Harmoni/docs/visual-design-exploration.html) and contains five complete, inspectable sections:

1. **Direction Comparison Spectrum:** Interactive toggle comparing Direction 1 (Obsidian Studio), Direction 2 (Nordic Aurora), and Direction 3 (Editorial Vinyl) with token badges, typography metrics, and aesthetic rationales.
2. **Desktop Discover Screen (1440 × 900 Viewport):**
   - 240px fixed left sidebar with Harmoni logo, amber pulse pip, primary routes, and current user card.
   - Fluid main scroll area with hero vinyl card (*"Late Night Studio Sessions"*), play button, and track metadata.
   - High-density track listing table with index-to-equalizer animation, album thumbnail, monospace duration, and Creative Commons badges (`CC BY-SA 4.0`).
   - Docked 80px hi-fi persistent player bar with hairline top scrubber, scrobble threshold milestone dot, rotary volume control, and queue button.
3. **Desktop Profile Screen (1440 × 900 Viewport · `/@username`):**
   - 112px circular preset avatar (`avatar_1: Amber Turntable`) in hairline brass ring.
   - Display name, `@alex_beats` handle, `ADMIN` badge, member since date, and 250-character biography.
   - `[ Edit Profile ]` trigger modal (avatar preset picker + bio textarea).
   - Zero deceptive action buttons (explicit note indicating friendship mutations are deferred to Milestone 7).
   - Tabbed layout: Overview, Playlists, Liked Tracks, History.
   - Public playlists grid and recent listening scrobble list (design placeholders).
4. **Mobile Discover & Profile Screens (390 × 844 Viewport):**
   - Minimum 48px touch bounding boxes across all controls.
   - 56px floating compact player bar docked at `bottom: 56px`.
   - 56px fixed bottom navigation bar (Home, Search, Library, Profile) with `z-50`.
   - Main content viewport with dedicated `pb-36` (144px) clearance.
5. **Design System Tokens & 8 SVG Avatar Presets:**
   - Complete CSS variable token palette with color chips and contrast values.
   - Interactive 8-avatar preset gallery with copyable SVG keys and detailed musical descriptions.

---

## 9. Recommended Component Foundation

All components will be built as accessible primitives using `shadcn/ui` (Radix UI) and Tailwind CSS v4:

### 9.1 Core shadcn/ui Primitives to Scaffold
- `Button` (`@/components/ui/button`): Tactile buttons with amber highlight and studio dark variants.
- `Card` (`@/components/ui/card`): Raised obsidian containers with 1px hairline border.
- `Dialog` / `Sheet` (`@/components/ui/dialog`, `@/components/ui/sheet`): Modal and slide-over drawers for mobile player, avatar selector, and on-demand social drawer.
- `DropdownMenu` (`@/components/ui/dropdown-menu`): Context menus for track actions (Add to Playlist, Share, Like).
- `Slider` (`@/components/ui/slider`): Precision scrubber and volume controls with amber fill.
- `Tabs` (`@/components/ui/tabs`): Segmented navigation across profile views and library categories.
- `Tooltip` (`@/components/ui/tooltip`): Keyboard shortcut hints and license information previews.
- `Badge` (`@/components/ui/badge`): Creative Commons licenses (`CC BY-SA 4.0`), admin roles, and bitrate indicators.

### 9.2 Custom Harmoni Music Components to Author
- `TrackRow`: High-density track listing item with track number, cover art thumbnail, title, artist, album, duration, animated playing equalizer, and hover action menu.
- `PlayerBar`: Docked bottom controller coordinating HTML5 audio playback, scrobble thresholds, seek scrubber, volume control, and queue toggle.
- `AvatarPreset`: Component mapping `avatarKey` (`avatar_1` .. `avatar_8`) to inline SVGs with custom sizing.
- `LicenseBadge`: Accessible pill badge rendering legal Creative Commons license types with outbound attribution links.
- `ScrobbleRing`: Visual circular progress ring indicating proximity to the 50% / 30-second listening mark required for a legitimate scrobble.

---

## 10. Technical & Implementation Considerations

### 10.1 Tailwind CSS v4 CSS-First Architecture
- Harmoni utilizes Tailwind CSS v4 with `@tailwindcss/postcss`.
- Unlike legacy Tailwind v3 which used `tailwind.config.js`, Tailwind v4 configures themes directly inside CSS using `@theme inline`.
- All custom colors, font families, and animation tokens must be declared within `src/app/globals.css` using `@theme inline` to prevent build warnings.

### 10.2 React 19 & Next.js 16 Asynchronous Patterns
- Next.js 16 strictly requires awaiting asynchronous request parameters (`params = await props.params`).
- The rewrite from `/@:username` to `/users/:username` maps cleanly to `src/app/users/[username]/page.tsx`.
- Server Components leverage `getCurrentUser()` from `src/lib/auth/dal.ts` (memoized via React `cache()`).

### 10.3 Zero-Cost Cloud & Performance Budget
- **No Upload Storage:** Avoid Cloudinary, AWS S3, or UploadThing. Avatars are strictly selected from built-in SVG presets.
- **Client-Side Stream Directing:** Jamendo audio streams are delivered directly to the client browser from Jamendo CDN; our Next.js server never proxies heavy binary audio streams, keeping server bandwidth at ₹0.
- **Self-Hosted / Google Fonts:** Free Google Fonts (`Plus Jakarta Sans` or `Inter`) loaded via `next/font/google` for zero-layout-shift font delivery.

---

## 11. Frontend Implementation Roadmap

```
+---------------------------------------------------------------------------------------------------+
| HARMONI FRONTEND IMPLEMENTATION ROADMAP                                                           |
+---------------------------------------------------------------------------------------------------+
|  [ M3C.0.1: Refined Spec ] --> [ M3C: Profiles & Avatars ]  -->  [ M4: Music Engine & Jamendo ]   |
|  (Current Milestone)           - Rewrite /@username to /users    - Server Jamendo API client      |
|  - Figma File Linked           - 8 SVG avatar presets            - Creative Commons validation    |
|  - HTML Prototype Staged       - Bio editing & modal             - Search & discovery endpoints   |
|                                                                                                   |
|  [ M5: Audio Player ]    -->  [ M6: Library & Scrobble ]   -->  [ M7: Friendship & Social Chat ]  |
|  - Zustand player store       - Liked tracks & playlists        - Friend request workflows        |
|  - Docked hi-fi player bar    - 50%/30s scrobble engine         - Collapsible social drawer       |
|  - Queue management drawer    - History & statistics            - Track-sharing conversations     |
|                                                                                                   |
|  [ M8: Polish & ₹0 Deploy ]                                                                       |
|  - Responsive mobile audit · Accessibility pass · Vercel Hobby + Neon DB production deploy        |
+---------------------------------------------------------------------------------------------------+
```

1. **Milestone 3C.0.1: Refined Design Specification & Figma Prototype (THIS MILESTONE)**
   - Reassess layout to 2-column default + on-demand social drawer.
   - Detail Next.js `/@username` rewrite routing architecture.
   - Formalize strict Milestone 3C scope boundary (defer social mutations to M7).
   - Clarify lack of presence model in Prisma schema.
   - Link verified Figma exploration file and stage interactive HTML prototype.
2. **Milestone 3C: User Profile Page & Avatar Presets**
   - Implement `next.config.ts` rewrite and `src/app/users/[username]/page.tsx`.
   - 8 SVG avatar presets component.
   - Bio editing modal and self-service profile update action.
   - Zero deceptive friendship action buttons.
3. **Milestone 4: Music Discovery Engine & Jamendo API Integration**
   - Server-side Jamendo client, search endpoints, and legal Creative Commons attribution badges.
4. **Milestone 5: Persistent Audio Player & Queue Controller**
   - Global Zustand audio player store, root layout player bar, and responsive mobile player sheet.
5. **Milestone 6: Personal Library, Playlists & Local Scrobbling**
   - Liked tracks, playlist CRUD, and the 50%/30-second local scrobble history engine.
6. **Milestone 7: Friendship Network & Direct Track-Sharing Chat**
   - Friend request workflows, on-demand social drawer, and lightweight polling chat with embedded playable track cards.
7. **Milestone 8: Final UI Polish, Free Deployment & Production Verification**
   - End-to-end responsiveness, dark studio theme polish, and deployment verification on Vercel Hobby + Neon at ₹0 INR.
