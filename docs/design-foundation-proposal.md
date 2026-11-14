# Harmoni — Visual Foundation Research & Design Specification
**Milestone 3C.0: Design Research & Planning Document**  
*Document Version:* 1.0.0  
*Status:* Proposed (Awaiting Review & Explicit Approval)  
*Author:* Harmoni Engineering & Architecture Team  
*Target Stack:* Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · PostgreSQL  

---

## 1. Executive Summary & Product Context

Harmoni is an open-source, personal-scale social music application crafted specifically for an intimate circle of **5 to 15 close friends**. The application unifies music discovery, legal audio playback, listening history tracking (scrobbling), and direct track-sharing conversations under an absolute, non-negotiable **₹0 INR lifetime budget constraint**.

To succeed, Harmoni must avoid two common pitfalls:
1. **The Sterile SaaS Clone:** Cluttered dashboard widgets, generic card walls, complex analytics tables, and cookie-cutter corporate aesthetics.
2. **The Direct Commercial Clone:** Shamelessly duplicating Spotify or Apple Music down to their signature accent colors and branding, which strips the product of personality and often imports architecture inappropriate for a private friend group.

Harmoni's visual foundation must feel **warm, tactile, intentional, and high-fidelity**—evoking the feeling of a private listening lounge where friends share vinyl records and discover independent artists. Every component, surface, and transition must serve the listening experience.

---

## 2. Research Findings & Open-Source Foundation Analysis

We investigated 5 prominent open-source music player applications, UI references, and templates to assess their architectural assumptions, licensing terms, and compatibility with Harmoni's stack.

### 2.1 Candidate 1: Infinitunes (`rajput-hemant/infinitunes`)
- **Upstream Repository:** [https://github.com/rajput-hemant/infinitunes](https://github.com/rajput-hemant/infinitunes)
- **Primary Tech Stack:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Drizzle ORM, TypeScript.
- **License & Legal Analysis:**
  - The repository root contains an **MIT License**.
  - **Critical Gotcha:** The project `README.md` includes an explicit non-standard rider: *"Please refrain from duplicating the project for commercial purposes"* and explains it is an educational scraper for the JioSaavn API.
  - **Verdict on Direct Reuse:** Legally ambiguous due to the README restriction conflicting with standard MIT terms. Furthermore, relying on an unofficial, reverse-engineered streaming API violates Harmoni's core licensing integrity guidelines (Section 4 of `AGENTS.md`).
- **UI & Architectural Takeaways:**
  - Excellent reference for how shadcn/ui primitives (`Slider`, `Button`, `Sheet`) can be styled into a compact dark-mode audio controller.
  - Responsive drawer patterns for queue and mobile playback are well-proportioned.

### 2.2 Candidate 2: Mice (`sillyangel/mice`)
- **Upstream Repository:** [https://github.com/sillyangel/mice](https://github.com/sillyangel/mice)
- **Primary Tech Stack:** Next.js, React, Tailwind CSS, shadcn/ui, TypeScript.
- **License & Legal Analysis:**
  - **Critical Issue:** The repository does **not contain a formal open-source license file** (no `LICENSE` or `LICENSE.md`). Under international copyright law and GitHub's Terms of Service, unlicensed public repositories remain **All Rights Reserved** by default.
  - **Verdict on Direct Reuse:** Zero code may be copied or imported directly into Harmoni.
- **UI & Architectural Takeaways:**
  - Mice is built as a web client for Navidrome / Subsonic API servers.
  - Demonstrates a clean, low-density tabular layout for large track lists.
  - Highlights the limitation of server-dependent architectures: without a running Subsonic daemon, the frontend has no offline or standalone capability.

### 2.3 Candidate 3: Official shadcn/ui Music Example (`shadcn-ui/ui`)
- **Upstream Repository:** [https://github.com/shadcn-ui/ui/tree/main/apps/www/app/(app)/examples/music](https://github.com/shadcn-ui/ui/tree/main/apps/www/app/(app)/examples/music)
- **Primary Tech Stack:** Next.js 14/15, React, Tailwind CSS, Radix UI Primitives, Lucide Icons.
- **License & Legal Analysis:**
  - 100% standard **MIT License**. Fully permissive, unrestricted reuse for both non-commercial and commercial projects.
  - Perfectly matches Harmoni's current `components.json` setup (`style: "new-york"`, `baseColor: "zinc"`, `iconLibrary: "lucide-react"`).
- **UI & Architectural Takeaways:**
  - Provides battle-tested accessibility (WAI-ARIA compliant keyboard focus, ARIA role mapping) via Radix UI primitives.
  - Clean modular components: `AlbumArtwork`, `Menu`, `PodcastEmptyPlaceholder`, `Sidebar`.
  - **Limitation:** Purely static presentation mockup. It contains zero state management for audio streams, no HTML5 Audio element binding, no persistent queue controller, and no scrobble event loops.

### 2.4 Candidate 4: Full-Stack Spotify Clone Reference (`antonioerdeljac/next13-spotify`)
- **Upstream Repository:** [https://github.com/antonioerdeljac/next13-spotify](https://github.com/antonioerdeljac/next13-spotify)
- **Primary Tech Stack:** Next.js 13/14 App Router, Tailwind CSS, React, Zustand, Supabase (PostgreSQL + Auth + Storage).
- **License & Legal Analysis:**
  - Standard **MIT License**. Permissive open-source code.
- **UI & Architectural Takeaways:**
  - Demonstrates a robust, lightweight **Zustand global player store** coordinating playback state across route transitions without remounting.
  - Implements modal-based music uploading and a bottom player bar.
  - **Limitation:** Heavy architectural coupling to Supabase cloud SaaS and Stripe payment webhooks (both strictly prohibited by Harmoni's ₹0 INR constraint). Visually, it is an unoriginal, direct carbon copy of Spotify's desktop client.

### 2.5 Candidate 5: Feishin (`jeffvli/feishin`)
- **Upstream Repository:** [https://github.com/jeffvli/feishin](https://github.com/jeffvli/feishin)
- **Primary Tech Stack:** React, Mantine UI, Electron, TanStack Query, TypeScript.
- **License & Legal Analysis:**
  - **GPL-3.0**. Copyleft license compatible with Harmoni's AGPL-3.0.
- **UI & Architectural Takeaways:**
  - World-class music organization UX with customizable sidebars, multi-format player controls, and lyrics displays.
  - **Incompatibility:** Relies entirely on Mantine component library and CSS Modules rather than Tailwind CSS. Direct component extraction would require rewriting CSS and importing incompatible styling paradigms into our Tailwind v4 environment.

---

## 3. License & Compatibility Comparison Matrix

| Evaluation Dimension | 1. Infinitunes | 2. Mice | 3. shadcn/ui Music | 4. Next13-Spotify | 5. Feishin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Repository URL** | [rajput-hemant/infinitunes](https://github.com/rajput-hemant/infinitunes) | [sillyangel/mice](https://github.com/sillyangel/mice) | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | [antonioerdeljac/next13-spotify](https://github.com/antonioerdeljac/next13-spotify) | [jeffvli/feishin](https://github.com/jeffvli/feishin) |
| **Stated License** | MIT (with non-commercial README note) | None (All Rights Reserved) | **MIT** (Unrestricted) | **MIT** (Unrestricted) | **GPL-3.0** (Copyleft) |
| **Legal Safety for Harmoni** | ⚠️ Risky (Unofficial APIs & README rider) | ❌ Prohibited (No license) | ✅ **100% Safe** | ✅ **100% Safe** | ⚠️ Compatible with AGPL, but code cannot be sublicensed |
| **Next.js 16 Compatibility** | High (App Router) | High (App Router) | Native / Reference standard | High (App Router) | Low (Vite / Electron) |
| **Tailwind CSS v4 Match** | Moderate (Tailwind v3) | Moderate (Tailwind v3) | Native (`@tailwindcss/postcss`) | Moderate (Tailwind v3) | ❌ Incompatible (Mantine UI) |
| **shadcn/ui Alignment** | Direct match | Direct match | **Primary Source** | Partial match | Incompatible |
| **Persistent Player Design** | Docked bottom bar | Bottom bar | None (Static visual only) | Bottom bar + Zustand | Full pre-amp bar |
| **Mobile Responsiveness** | Good (Slide-over sheet) | Moderate | Basic desktop focus | Basic desktop focus | Desktop focused |
| **Zero-Cost Feasibility (₹0)** | Relies on unofficial API | Requires self-hosted server | ✅ **100% Free** | Tied to Supabase / Stripe | Free, but heavy |
| **Extractable Component Value** | Player UI & Queue layout | Table layout reference | Primitives & Typography | Zustand player pattern | Layout philosophy only |

---

## 4. Visual Direction Proposals

We have formulated three distinct, production-grade visual directions for Harmoni.

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

### 4.1 Direction 1: "Obsidian Studio" (Warm Analog / High-Fidelity Hi-Fi)

#### A. Aesthetic & Personality
Inspired by high-end analog audio preamps, brushed slate listening desks, vinyl record sleeves, and the warm, amber glow of vacuum tubes during a late-night listening session. It feels intimate, tactile, mature, and deeply musical.

#### B. Color Palette
- **Deep Canvas (Background):** `#0b0c10` (Warm obsidian charcoal with a slight organic brown undertone)
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

#### E. Motion & Interactions
- Micro-transitions: 150ms ease-out transitions on hover states.
- Scrobble progress: A subtle, satisfying amber pulse when a track passes the 50% threshold and records a valid scrobble.

---

### 4.2 Direction 2: "Nordic Aurora" (Ethereal Midnight Glass)

#### A. Aesthetic & Personality
Inspired by Scandinavian minimalist architecture, dark frosted glassmorphism, and the natural ambient illumination of the Aurora Borealis. It feels ethereal, modern, weightless, and spacious.

#### B. Color Palette
- **Deep Canvas (Background):** `#08090d` (Pitch midnight ink)
- **Frosted Glass Surface:** `rgba(18, 20, 30, 0.70)` with `backdrop-filter: blur(16px)`
- **Solid Elevated Card:** `#121520`
- **Subtle Glass Borders:** `rgba(255, 255, 255, 0.08)`
- **Primary Accent (Aurora Glow):** Dual gradient shifting from Cyan (`#06b6d4`) to Emerald (`#10b981`)
- **Secondary Accent (Deep Indigo):** `#6366f1` (Soft atmospheric backlight)
- **Text Primary (Foreground):** `#f8fafc` (Arctic white)
- **Text Muted:** `#8b949e` (Slate mist)

#### C. Typography
- **Headings:** `Space Grotesk` (Expressive, architectural, airy).
- **Body & UI:** `Inter` (Neutral, clean).
- **Metadata:** `Space Mono`.

#### D. Component Styling & Surfaces
- **Album Artwork & Cards:** Generous 16px corner radii. When a track plays, a soft radial gradient bloom behind the album art samples the dominant artwork color and diffuses it onto the canvas.
- **Sidebar & Navigation:** Floating frosted glass sidebar detached 12px from the window frame with pill-shaped hover tabs.
- **Track List:** Spacious, airy rows with rounded row highlights on hover.
- **Persistent Player:** Floating island dock elevated 16px above the viewport bottom with 20px rounded corners and frosted glass backdrop blur.

#### E. Motion & Interactions
- Atmospheric ambient color transitions (400ms soft color shifts based on active album art).
- Floating card hover elevations with subtle glow diffusion.

---

### 4.3 Direction 3: "Editorial Vinyl" (Swiss Typographic / Indie Record Club)

#### A. Aesthetic & Personality
Rooted in Swiss International Typographic Style and independent record label packaging (e.g., Factory Records, Blue Note, Ninja Tune). Characterized by high contrast, structured micro-borders, bold grid divisions, and anti-corporate authenticity.

#### B. Color Palette
- **Deep Canvas (Background):** `#0d0e11` (Matte vinyl black)
- **Card & Content Surfaces:** `#15171e` (Heavy card stock)
- **Accent Surface:** `#1f222c`
- **Architectural Borders:** `#2d313f` (Crisp, defined 1px structural gridlines)
- **Primary Accent (Acid Electric):** `#ccff00` (Acid Lime / Chartreuse) or `#3b82f6` (Electric Cobalt)
- **Text Primary (Foreground):** `#ffffff` (Pure optical white)
- **Text Muted:** `#94a3b8` (Concrete slate)

#### C. Typography
- **Headings & Display:** `Syne` or `Archivo Black` (Heavyweight, editorial poster type).
- **Body & UI:** `DM Sans` or `Inter` (Disciplined, structured).
- **Metadata & Catalog Numbers:** `JetBrains Mono` uppercase (`// CC-BY-4.0`, `// 320 KBPS`).

#### D. Component Styling & Surfaces
- **Album Artwork & Cards:** Sharp 4px corners, explicit 1px borders, catalog numbering tags, high-contrast monochrome treatments with sudden pops of electric lime.
- **Sidebar & Navigation:** Dense, structured columnar grid with uppercase section dividers (`// EXPLORE`, `// COLLECTION`, `// CIRCLE`).
- **Track List:** High-density track listing with visible vertical column dividers and monospace index prefixes (`01`, `02`, `03`).
- **Persistent Player:** Full-width industrial bottom console with segmented readout displays, bold track titles, and mechanical-feeling toggle switches.

---

### 4.4 Recommended Direction & Architectural Rationale

**Recommendation:** Adopt **Direction 1: "Obsidian Studio"** as Harmoni's core visual foundation, enriched with the clean typographic discipline and monospace metadata styling of **Direction 3**.

#### Architectural & Product Justifications:
1. **Intimate Social Fit:** Harmoni is built for 5–15 friends sharing music. A warm, analog studio lounge aesthetic creates an inviting, cozy atmosphere that distinguishes Harmoni immediately from the sterile white or generic cold-green interfaces of commercial platforms.
2. **Visual Ergonomics & Contrast:** The deep obsidian charcoal background (`#0b0c10`) combined with raised slate surfaces (`#11131a`, `#161922`) provides gentle visual contrast that eliminates eye strain during long evening listening sessions while letting album artwork pop vibrantly.
3. **Tailwind CSS v4 & Performance Compatibility:** Direction 1 relies on solid CSS surface tokens, crisp hairline borders, and subtle opacity transitions. Unlike Direction 2 ("Nordic Aurora"), it does **not** require costly full-viewport `backdrop-filter: blur()` or continuous canvas gradient shaders, which consume substantial GPU/battery resources on mobile devices or budget laptops.
4. **Native shadcn/ui "Zinc" Harmony:** Direction 1 seamlessly aligns with our initialized shadcn/ui "new-york" style and zinc color palette, allowing us to adopt Radix UI primitives without fighting framework styling.

---

## 5. Design Token Specification (Tailwind CSS v4 & CSS Variables)

These design tokens will translate directly into `src/app/globals.css` upon milestone implementation:

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
  --border: #252937;
  --input: #252937;

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

## 6. Application Information Architecture & Layout Shell

Harmoni's application shell coordinates continuous, uninterrupted audio playback while users navigate through pages, browse playlists, inspect profiles, and chat with friends.

```
+---------------------------------------------------------------------------------------------------+
|                                     DESKTOP APPLICATION SHELL                                     |
+---------------------+-------------------------------------------------------+---------------------+
| LEFT SIDEBAR        | MAIN SCROLLABLE VIEWPORT                              | RIGHT SOCIAL DRAWER |
| (Fixed: 240px)      | (Fluid: flex-1 · Dedicated bottom padding pb-28)      | (Collapsible: 280px)|
|                     |                                                       |                     |
| [H] Harmoni Logo    | Page Header: /discover, /library, /@username          | Friend Presence     |
|                     |                                                       | - Alice (Listening) |
| > Discover          | Main Content Area:                                    | - Bob (Offline)     |
| > Search            | - Music recommendations                               |                     |
|                     | - Track listing table                                 | 1-on-1 Mini Chat    |
| // LIBRARY          | - Profile headers & tabs                              | - Shared Track Card |
| > Liked Tracks      |                                                       | - Send message...   |
| > Playlists         |                                                       |                     |
| > History           |                                                       |                     |
|                     |                                                       |                     |
| [User Badge / Nav]  |                                                       |                     |
+---------------------+-------------------------------------------------------+---------------------+
| PERSISTENT HI-FI AUDIO PLAYER (Fixed: Bottom 0 · Full Width · Height: 80px · z-50)               |
| [Cover] Title - Artist  |  [⏮] [ ▶ / ⏸ ] [⏭]  [== Scrobble Scrubber ===]  |  [🔊 Vol] [Queue ☰] |
+---------------------------------------------------------------------------------------------------+
```

### 6.1 Desktop Layout Structure
1. **Left Navigation Sidebar (Fixed 240px width):**
   - **Header:** Harmoni brandmark with subtle amber pulse dot.
   - **Primary Navigation:** Discover (`/`), Search (`/search`).
   - **Personal Library:** Liked Tracks (`/library/liked`), Playlists (`/library/playlists`), History & Scrobbles (`/library/history`).
   - **Footer:** Active user profile badge (`/@username`), quick role indicator (`ADMIN` / `USER`), and sign-out action.
2. **Main Scrollable Content Viewport (Fluid `flex-1`):**
   - Houses the active route (`page.tsx`).
   - Maintains dedicated bottom padding (`pb-28`, 112px) so long lists or footer elements are never obscured by the docked player.
3. **Right Social & Listening Drawer (Collapsible 280px width):**
   - Displays real-time friend presence and what friends are currently listening to.
   - Slides out or toggles into 1-on-1 direct messaging with embedded interactive track cards.
4. **Docked Audio Player (Fixed `bottom: 0`, full width, 80px height, `z-50`):**
   - Lives outside the route page hierarchy in the root layout shell.
   - Preserves active HTML5 audio element and playback state across all client-side page transitions.

### 6.2 Mobile Layout Structure
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
| Compact Mobile Player Bar (56px)   |
| [Cover] Title - Artist    [ ▶ ] [⏭]|
+------------------------------------+
| Bottom Navigation Bar (56px)       |
| [ 🏠 ]     [ 🔍 ]   [ 📚 ]   [ 👥 ] |
| Home     Search   Library  Friends |
+------------------------------------+
```

1. **Top Minimal App Bar (48px height):** Logo, search icon shortcut, and profile avatar shortcut.
2. **Main Scrollable Viewport (`pb-36`):** Dedicated bottom padding of 144px accommodates both the floating mini-player and the fixed bottom navigation bar.
3. **Compact Floating Mini-Player Bar (56px height):**
   - Docked immediately above the bottom navigation bar (`bottom: 56px`).
   - Shows 40px album thumbnail, scrolling marquee track title, and large touch-friendly Play/Pause and Next buttons.
   - Tapping anywhere on the mini-player expands an animated full-screen player modal with scrubber, scrobble badge, and lyrics/queue tabs.
4. **Bottom Mobile Navigation Bar (56px height, `z-50`):**
   - 4 primary touch targets: Home (`/`), Search (`/search`), Library (`/library`), Friends (`/friends`).

---

## 7. Profile Page Specification (`/@username`)

Milestone 3C will implement user profiles and customizable preset avatars. This specification defines the visual presentation, supported fields, and responsive behavior.

```
+---------------------------------------------------------------------------------------------------+
| USER PROFILE SPECIFICATION: /@username                                                            |
+---------------------------------------------------------------------------------------------------+
| [ PRESET AVATAR ]  Display Name  [ ADMIN / USER Badge ]                                           |
| (112px Circle)     @username · Member since November 2026                                         |
|                    "Curating late-night jazz, ambient beats and indie electronica."               |
|                                                                                                   |
|                    [ Friendship Action Button: Add Friend / Pending / Edit Profile ]              |
+---------------------------------------------------------------------------------------------------+
| [ Overview Tab ]         [ Playlists Tab ]         [ Liked Tracks Tab ]         [ History Tab ]   |
+---------------------------------------------------------------------------------------------------+
| RECENT LISTENING ACTIVITY (Scrobbles)              | TOP ARTISTS (Calculated)                     |
| 1. Solar Drift — Tycho (Played 12m ago)            | 1. Tycho (142 scrobbles)                     |
| 2. Kiasmos — Looped (Played 1h ago)                | 2. Kiasmos (98 scrobbles)                    |
|                                                    |                                              |
| PUBLIC PLAYLISTS (Created by User)                 | LISTENING MILESTONES                         |
| [Card: Ambient Study]  [Card: Weekend Chill]       | Total Scrobbles: 1,420 · Total Tracks: 384   |
+---------------------------------------------------------------------------------------------------+
```

### 7.1 Data Integrity & Schema Mapping
The design strictly respects Harmoni's existing PostgreSQL Prisma schema without inventing synthetic fields.

| Profile UI Element | Database Field / Source | Status in Harmoni Today |
| :--- | :--- | :--- |
| **Avatar Graphic** | `User.avatarKey` (`String`, default `"avatar_1"`) | Supported in DB · UI picker target for M3C |
| **Display Name** | `User.displayName` (`String`) | Supported in DB & Auth |
| **Username Handle** | `User.username` (`String @unique`, slug `/@username`) | Supported in DB & Auth |
| **Role Badge** | `User.role` (`Role`: `USER` or `ADMIN`) | Supported in DB & Auth |
| **Member Since** | `User.createdAt` (`DateTime`, formatted e.g. "Nov 2026") | Supported in DB & Auth |
| **User Biography** | `User.bio` (`String? @db.VarChar(250)`) | Supported in DB · Edit bio target for M3C |
| **Friendship Status** | `Friendship` model (`userAId < userBId`, `status`) | Supported in DB · Action state machine in M3C |
| **Public Playlists** | `Playlist` model (`userId`, `isPublic = true`) | Supported in DB · Display in M3C / CRUD in M6 |
| **Liked Tracks Count** | `LikedTrack` count (`userId`) | Supported in DB · Display in M3C / Toggle in M6 |
| **Recent Scrobbles** | `Scrobble` model (`userId`, `listenedAt`) | Supported in DB · Aggregation engine in M6 |
| **Top Artists/Tracks** | Calculated from `Scrobble` records | Supported in DB · Aggregation engine in M6 |

### 7.2 Profile Header & SVG Avatar Presets
- **Avatar System:** To honor the **₹0 INR budget** and avoid recurring S3 or cloud image hosting charges, Harmoni will provide **8 handcrafted, distinctive SVG preset avatars** stored as lightweight client-side assets:
  - `avatar_1`: Amber Studio Turntable
  - `avatar_2`: Golden Tube Preamp
  - `avatar_3`: Obsidian Waveform
  - `avatar_4`: Geometric Vinyl Disc
  - `avatar_5`: Nordic Aurora Prism
  - `avatar_6`: Neon Cassette Tape
  - `avatar_7`: Soundwave Equalizer
  - `avatar_8`: Acoustic Reverberation
- **Avatar Presentation:** 112px diameter circle on desktop (80px on mobile) enclosed in a 2px hairline brass ring (`#d97706`) with an amber ambient halo.
- **Editing Avatars:** When an authenticated user views their own profile (`getCurrentUser().id === profileUser.id`), an "Edit Profile" button opens a modal to select from the 8 SVG presets and edit their 250-character bio.

### 7.3 Friendship Relationship Action States
When viewing another user's profile, the profile header dynamically renders an action button reflecting the exact relational state in PostgreSQL:
1. **Self:** Renders `[ Edit Profile ]` (Opens Avatar & Bio editor modal).
2. **Not Friends (`null`):** Renders `[ + Add Friend ]` (Dispatches friend request).
3. **Pending Outgoing (`initiatorId === currentUser.id`):** Renders `[ ⏳ Request Sent ]` (Allows cancellation).
4. **Pending Incoming (`initiatorId !== currentUser.id`):** Renders `[ Accept ]` and `[ Decline ]`.
5. **Accepted Friends:** Renders `[ 💬 Send Track / Message ]` and a subtle `[ Friends ✓ ]` dropdown menu with an unfriend option.

---

## 8. Recommended Component Foundation

All components will be built as accessible, standalone primitives using `shadcn/ui` (Radix UI) and Tailwind CSS v4:

### 8.1 Core shadcn/ui Primitives to Scaffold
- `Button` (`@/components/ui/button`): Tactile buttons with amber highlight and studio dark variants.
- `Card` (`@/components/ui/card`): Raised obsidian containers with 1px border.
- `Dialog` / `Sheet` (`@/components/ui/dialog`, `@/components/ui/sheet`): Modal and slide-over drawers for mobile player, avatar selector, and settings.
- `DropdownMenu` (`@/components/ui/dropdown-menu`): Context menus for track actions (Add to Playlist, Share, Like).
- `Slider` (`@/components/ui/slider`): Precision scrubber and volume controls with amber fill.
- `Tabs` (`@/components/ui/tabs`): Segmented navigation across profile views and library categories.
- `Tooltip` (`@/components/ui/tooltip`): Keyboard shortcut hints and license information previews.
- `Badge` (`@/components/ui/badge`): Creative Commons licenses (`CC BY-SA 4.0`), admin roles, and bitrate indicators.

### 8.2 Custom Harmoni Music Components to Author
- `TrackRow`: High-density track listing item with track number, cover art thumbnail, title, artist, album, duration, animated playing equalizer, and hover action menu.
- `PlayerBar`: Docked bottom controller coordinating HTML5 audio playback, scrobble thresholds, seek scrubber, volume control, and queue toggle.
- `AvatarPreset`: Render component mapping `avatarKey` (`avatar_1` .. `avatar_8`) to optimized SVGs with custom sizing.
- `LicenseBadge`: Accessible pill badge rendering legal Creative Commons license types with outbound attribution links.
- `ScrobbleRing`: Visual circular progress ring indicating proximity to the 50% / 30-second listening mark required for a legitimate scrobble.

---

## 9. Technical & Implementation Considerations

### 9.1 Tailwind CSS v4 CSS-First Architecture
- Harmoni utilizes Tailwind CSS v4 with `@tailwindcss/postcss`.
- Unlike legacy Tailwind v3 which used `tailwind.config.js`, Tailwind v4 configures themes directly inside CSS using `@theme inline`.
- All custom colors, font families, and animation tokens must be declared within `src/app/globals.css` using the `@theme inline` block to avoid compilation warnings.

### 9.2 React 19 & Next.js 16 Asynchronous Patterns
- Next.js 16 strictly requires awaiting asynchronous request parameters (`params = await props.params`). The profile route `/@username` must await `params.username` before performing database queries.
- Read-only data access in Server Components must leverage `getCurrentUser()` from `src/lib/auth/dal.ts` (memoized via React `cache()`).
- Server actions and route handlers must continue to enforce strict Zod schema validation.

### 9.3 Zero-Cost Cloud & Performance Budget
- **No Upload Storage:** Avoid Cloudinary, AWS S3, or UploadThing. Avatars are strictly selected from built-in SVG presets.
- **Client-Side Stream Directing:** Jamendo audio streams are delivered directly to the client's browser from Jamendo CDN; our Next.js server never proxies heavy binary audio streams, keeping server bandwidth at ₹0.
- **Font Optimization:** Free Google Fonts (`Plus Jakarta Sans` or `Inter`) loaded via `next/font/google` for zero-layout-shift self-hosted font delivery.

---

## 10. Proposed Frontend Milestones Roadmap

```
+---------------------------------------------------------------------------------------------------+
| HARMONI FRONTEND IMPLEMENTATION ROADMAP                                                           |
+---------------------------------------------------------------------------------------------------+
|  [ M3C.0: Design Spec ]  -->  [ M3C: Profiles & Avatars ]  -->  [ M4: Music Engine & Jamendo ]    |
|  (Current Milestone)          - Profile page /@username         - Server Jamendo API client       |
|                               - 8 SVG avatar presets            - Creative Commons validation     |
|                               - Bio editing & modal             - Search & discovery endpoints    |
|                                                                                                   |
|  [ M5: Audio Player ]    -->  [ M6: Library & Scrobble ]   -->  [ M7: Social Chat & Sharing ]     |
|  - Zustand player store       - Liked tracks & playlists        - Friend request workflows        |
|  - Docked hi-fi player bar    - 50%/30s scrobble engine         - 1-on-1 direct messaging         |
|  - Queue management drawer    - History & statistics            - Interactive track card in chat  |
|                                                                                                   |
|  [ M8: Polish & ₹0 Deploy ]                                                                       |
|  - Responsive mobile audit · Accessibility pass · Vercel Hobby + Neon DB production deploy        |
+---------------------------------------------------------------------------------------------------+
```

1. **Milestone 3C.0: Visual Foundation Research & Design Specification (THIS MILESTONE)**
   - Architectural research, open-source audit, design tokens, and information architecture proposal.
2. **Milestone 3C: User Profile Page & Avatar Presets**
   - Implement `/@username` route, 8 SVG avatar presets, bio editing modal, and friendship status indicator.
3. **Milestone 4: Music Discovery Engine & Jamendo API Integration**
   - Build server-side Jamendo client, search endpoints, and legal Creative Commons attribution badges.
4. **Milestone 5: Persistent Audio Player & Queue Controller**
   - Build global Zustand audio player store, root layout player bar, and responsive mobile player sheet.
5. **Milestone 6: Personal Library, Playlists & Local Scrobbling**
   - Liked tracks, playlist CRUD, and the 50%/30-second local scrobble history engine.
6. **Milestone 7: Friendship Network & Direct Track-Sharing Chat**
   - Friend request flows, mutual presence, and lightweight polling chat with embedded playable track cards.
7. **Milestone 8: Final UI Polish, Free Deployment & Production Verification**
   - End-to-end responsiveness, dark studio theme polish, and deployment verification on Vercel Hobby + Neon at ₹0 INR.
