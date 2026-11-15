# Harmoni — Visual Foundation Research & Design Specification
**Milestone 3C.0.4: Theme System Accuracy & Design Specification Audit**  
*Document Version:* 1.4.0  
*Status:* Theme System Accuracy Audit & Design Specification (Awaiting User Review & Explicit Approval)  
*Author:* Harmoni Engineering & Architecture Team  
*Target Stack:* Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · PostgreSQL  
*Figma Exploration File:* [https://www.figma.com/design/tde7tKDtxqTwhqJQko989H](https://www.figma.com/design/tde7tKDtxqTwhqJQko989H) (Key: `tde7tKDtxqTwhqJQko989H` · Verified Empty Canvas Shell)  
*Canonical Interactive Visual Prototype:* [`docs/visual-design-exploration.html`](file:///d:/Projects/Harmoni/docs/visual-design-exploration.html)

---

## 1. Executive Summary & Product Context

Harmoni is an open-source, personal-scale social music application crafted specifically for an intimate circle of **5 to 15 close friends**. The application unifies music discovery, legal audio playback, listening history tracking (scrobbling), and direct track-sharing conversations under an absolute, non-negotiable **₹0 INR lifetime budget constraint**.

To succeed, Harmoni avoids two critical pitfalls:
1. **The Sterile SaaS Clone:** Cluttered dashboard widgets, generic card walls, complex analytics tables, and cookie-cutter corporate aesthetics.
2. **The Direct Commercial Clone:** Shamelessly duplicating Spotify or Apple Music down to their signature accent colors and branding, which strips the product of identity and imports enterprise architecture inappropriate for a private friend group.

Harmoni's visual foundation is **warm, tactile, intentional, and high-fidelity**—evoking the feeling of a private listening lounge where friends share vinyl records and discover independent artists. Every component, surface, and transition serves the listening experience.

> [!NOTE]
> **Design Mockup Data Disclaimer:** All track titles, artist names, album art covers, timestamps, scrobble tallies, and user profiles featured in this specification, in the Figma exploration shell, and in the HTML prototype are **illustrative design placeholders**. They demonstrate layout density, typography scale, and responsive behavior, and do not represent real production database records.

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

## 3. Multi-Theme Architecture & Visual Direction Catalog

Based on architectural reviews and user feedback, Harmoni is designed as a **Multi-Theme Platform**:
- Rather than locking the platform into a single permanent visual identity, **every individual user chooses their preferred visual theme independently**.
- One friend can use *Obsidian Studio*, while another uses *Crimson Vigil (Daredevil-inspired)* or *Cobalt Web (Spider-Man-inspired)*. Theme choices are stored per-user and never collide.
- All five themes adhere to the identical semantic token contract, ensuring that every present and future component (player bar, track table, profile hero, chat cards) renders flawlessly across all themes with zero component-level conditional code.

```
+-------------------------------------------------------------------------------------------------------------+
|                                        HARMONI 5-THEME CATALOG MATRIX                                       |
|                                                                                                             |
|  [ 1. Obsidian Studio ]     [ 2. Nordic Aurora ]     [ 3. Editorial Vinyl ]                                 |
|  - Default theme            - Midnight ink glass     - Swiss graphic grid                                   |
|  - Warm vinyl & preamp      - Cyan & mint emerald    - Matte vinyl & acid-lime                              |
|  - Amber / brass tube glow  - Atmospheric & airy     - Confident indie label                                |
|                                                                                                             |
|  [ 4. Crimson Vigil (Daredevil-inspired) ]           [ 5. Cobalt Web (Spider-Man-inspired) ]                 |
|  - Deep shadow noir black                            - Midnight navy & royal blue                           |
|  - Dark oxblood & blind-justice crimson              - Dynamic vermilion red & sky cyan                     |
|  - Serious, focused, tactile grit                    - Vibrant, kinetic, heroic energy                      |
+-------------------------------------------------------------------------------------------------------------+
```

---

### 3.1 Strict Intellectual Property & Non-Infringement Boundary

To guarantee that Harmoni remains 100% legal, non-infringing, and open-source under the AGPL-3.0 license:

> [!CAUTION]
> **MANDATORY IP PROTECTION RULES FOR INSPIRED THEMES:**
> 1. **Original Color Harmonizations Only:** Themes are purely original chromatic interpretations inspired by atmospheric color palettes (e.g. shadow black + oxblood crimson; midnight navy + royal blue + vermilion red).
> 2. **Zero Protected Assets:** Strictly **NO** Marvel logos, Spider-Man webs, spiders, masks, costumes, Daredevil double-D emblems, cowl silhouettes, comic book scans, movie screenshots, actor likenesses, or proprietary font files may ever be included, embedded, or referenced in Harmoni source code, prototypes, or assets.
> 3. **Transparent Inspired Naming:** Themes are explicitly labeled as inspired interpretations (`(Daredevil-inspired)`, `(Spider-Man-inspired)`) to ensure complete transparency.

---

### 3.2 Detailed Theme Specifications

#### 1. Obsidian Studio (Default · Warm Analog Hi-Fi)
- **Aesthetic:** High-end vacuum tube audio preamps, brushed slate listening desks, vinyl record sleeves, and cozy late-night amber warmth.
- **Palette:**
  - Canvas: `#0b0c10` (Warm obsidian charcoal)
  - Surface: `#11131a` (Deep brushed slate)
  - Card: `#161922` (Elevated chassis)
  - Borders: `#252936` (Machined hairline)
  - Primary Accent: `#f59e0b` (Amber-500) / Active glow: `#fbbf24` (Amber-400)
  - Secondary Accent: `#d97706` (Burnished copper)
  - Text Primary: `#f3f4f6` (Warm optical off-white) · Text Muted: `#9ca3af`
- **Typography:** `Plus Jakarta Sans` headings + `Inter` body + `JetBrains Mono` metadata.
- **Contrast & Ergonomics:** 18.1:1 foreground contrast (WCAG AAA). Deep charcoal eliminates screen glare in dark listening spaces.

#### 2. Nordic Aurora (Atmospheric Midnight Glass)
- **Aesthetic:** Scandinavian minimalist architecture, midnight ink glass, and bioluminescent auroral ionization.
- **Palette:**
  - Canvas: `#070a12` (Midnight ink)
  - Surface: `#0d131f` (Dark fjord slate)
  - Card: `#131c2e` (Subtle deep teal elevation)
  - Borders: `#1e2b45` (Frosted glacial divider)
  - Primary Accent: `#06b6d4` (Cyan-500) / Active glow: `#22d3ee` (Cyan-400)
  - Secondary Accent: `#10b981` (Mint emerald-500)
  - Text Primary: `#f0fdf4` (Icy off-white) · Text Muted: `#94a3b8`
- **Typography:** `Space Grotesk` headings + `Inter` body + `JetBrains Mono` metadata.
- **Contrast & Ergonomics:** 19.0:1 foreground contrast (WCAG AAA). Clean, crisp illumination with zero expensive canvas blur filters.

#### 3. Editorial Vinyl (Swiss Typographic / Indie Record Label)
- **Aesthetic:** Swiss International Typographic Style and independent record label packaging (Factory Records, Blue Note). High structural discipline and catalog precision.
- **Palette:**
  - Canvas: `#090a0d` (Matte vinyl black)
  - Surface: `#101217` (Graphite chassis)
  - Card: `#161920` (Structural crate)
  - Borders: `#272b38` (Precision hairline micro-border)
  - Primary Accent: `#bef264` (Electric acid-lime-400) / Active glow: `#d9f99d`
  - Secondary Accent: `#a3e635` (Lime-500)
  - Text Primary: `#fafafa` (Pure white) · Text Muted: `#a1a1aa`
- **Typography:** `Archivo` / `Plus Jakarta Sans` bold headings + `Inter` body + `JetBrains Mono` catalog numbers (`// CC-BY-4.0`, `// 320 KBPS`).
- **Contrast & Ergonomics:** 19.4:1 foreground contrast (WCAG AAA). Maximum data density and visual clarity.

#### 4. Crimson Vigil (Daredevil-inspired · Shadow Noir & Blind Justice)
- **Aesthetic:** Urban rooftop shadows, wet asphalt reflections, dark oxblood leather, and intense crimson red vigilance. Focused, serious, tactile, and grounded.
- **Palette:**
  - Canvas: `#08080a` (Deep shadow black)
  - Surface: `#101014` (Dark asphalt slate)
  - Card: `#16161c` (Elevated shadow chamber)
  - Borders: `#381418` (Dark oxblood hairline)
  - Primary Accent: `#e11d48` (Crimson rose-600) / Active glow: `#f43f5e` (Rose-500)
  - Secondary Accent: `#be123c` (Deep crimson-700)
  - Text Primary: `#f4f4f5` (Zinc off-white) · Text Muted: `#a1a1aa`
  - Badge Background: `#2b0f14` · Badge Text: `#fda4af`
- **Typography:** `Plus Jakarta Sans` headings + `Inter` body + `JetBrains Mono` metadata.
- **Contrast & Ergonomics:** 18.2:1 foreground contrast (WCAG AAA). Button text (`#ffffff` on `#e11d48`) provides 4.6:1 (WCAG AA compliant). Dark oxblood dividers prevent crimson glare.

#### 5. Cobalt Web (Spider-Man-inspired · Midnight Navy & Kinetic Vermilion)
- **Aesthetic:** Midnight skyline heights, royal cobalt structural depth, energetic vermilion red accents, and electric sky cyan sensory highlights. Kinetic, dynamic, and uplifting.
- **Palette:**
  - Canvas: `#080b14` (Deep midnight navy)
  - Surface: `#0e1424` (Dark slate navy)
  - Card: `#141d33` (Elevated cobalt chassis)
  - Borders: `#202c49` (Steel blue divider)
  - Primary Accent: `#dc2626` (Kinetic red-600 · adjusted for WCAG AA normal text compliance) / Active glow: `#ef4444` (Red-500)
  - Secondary Accent: `#2563eb` (Royal cobalt blue-600)
  - Sensory Pip Accent: `#38bdf8` (Electric sky cyan-400)
  - Text Primary: `#f1f5f9` (Cool off-white) · Text Muted: `#94a3b8`
  - Badge Background: `#1e131d` · Badge Text: `#fca5a5`
- **Typography:** `Plus Jakarta Sans` headings + `Inter` body + `JetBrains Mono` metadata.
- **Contrast & Ergonomics:** 17.84:1 body text on canvas (WCAG AAA). Primary button text (`#ffffff` on `#dc2626`) provides 4.83:1 (WCAG AA compliant, exceeding the 4.5:1 requirement for normal-sized text; previously `#ef4444` failed at 3.76:1). Secondary button text (`#ffffff` on `#2563eb`) provides 5.17:1 (WCAG AA compliant). Midnight navy canvas anchors high-energy red accents smoothly.

---

### 3.3 Contrast & Accessibility Comparison Matrix

All color contrast ratios have been calculated using the official W3C WCAG 2.1 / 2.2 relative luminance formula:
$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$
where $L_1$ is the relative luminance of the lighter color and $L_2$ is the relative luminance of the darker color.

Rather than asserting blanket "WCAG AAA" compliance across entire themes, Harmoni audits each specific text-to-background and button interactive pair individually:

| Theme Identifier | Tested Element Pair | Light Color | Dark Color | Calculated Ratio | WCAG Grade & Minimum Threshold |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`obsidian-studio`** | Text Primary on Canvas | `#f3f4f6` | `#0b0c10` | **18.06:1** | **AAA** (Passes $\ge 7:1$) |
| | Text Primary on Card | `#f3f4f6` | `#14161f` | **15.95:1** | **AAA** (Passes $\ge 7:1$) |
| | Primary Button (Dark text on Amber) | `#f59e0b` | `#0b0c10` | **9.10:1** | **AAA** (Passes $\ge 7:1$) |
| | Secondary Button (Dark text on Brass) | `#d97706` | `#0b0c10` | **6.14:1** | **AA** (Passes $\ge 4.5:1$) |
| **`nordic-aurora`** | Text Primary on Canvas | `#f0fdf4` | `#070a12` | **19.04:1** | **AAA** (Passes $\ge 7:1$) |
| | Text Primary on Card | `#f0fdf4` | `#0d131f` | **16.27:1** | **AAA** (Passes $\ge 7:1$) |
| | Primary Button (Dark text on Cyan) | `#06b6d4` | `#070a12` | **8.15:1** | **AAA** (Passes $\ge 7:1$) |
| | Secondary Button (Dark text on Emerald) | `#10b981` | `#070a12` | **7.80:1** | **AAA** (Passes $\ge 7:1$) |
| **`editorial-vinyl`** | Text Primary on Canvas | `#fafafa` | `#090a0d` | **19.45:1** | **AAA** (Passes $\ge 7:1$) |
| | Text Primary on Card | `#fafafa` | `#101217` | **16.85:1** | **AAA** (Passes $\ge 7:1$) |
| | Primary Button (Dark text on Lime) | `#bef264` | `#090a0d` | **15.15:1** | **AAA** (Passes $\ge 7:1$) |
| | Secondary Button (Dark text on Olive-lime) | `#a3e635` | `#090a0d` | **13.13:1** | **AAA** (Passes $\ge 7:1$) |
| **`crimson-vigil`** | Text Primary on Canvas | `#f4f4f5` | `#08080a` | **18.23:1** | **AAA** (Passes $\ge 7:1$) |
| | Text Primary on Card | `#f4f4f5` | `#16161c` | **16.39:1** | **AAA** (Passes $\ge 7:1$) |
| | Primary Button (White text on Crimson) | `#ffffff` | `#e11d48` | **4.70:1** | **AA** (Passes $\ge 4.5:1$) |
| | Secondary Button (White text on Deep rose) | `#ffffff` | `#be123c` | **6.29:1** | **AA** (Passes $\ge 4.5:1$) |
| **`cobalt-web`** | Text Primary on Canvas | `#f1f5f9` | `#080b14` | **17.84:1** | **AAA** (Passes $\ge 7:1$) |
| | Text Primary on Card | `#f1f5f9` | `#141d33` | **15.29:1** | **AAA** (Passes $\ge 7:1$) |
| | Primary Button (White text on Red-600) | `#ffffff` | `#dc2626` | **4.83:1** | **AA** (Passes $\ge 4.5:1$, audit fix) |
| | Secondary Button (White text on Cobalt) | `#ffffff` | `#2563eb` | **5.17:1** | **AA** (Passes $\ge 4.5:1$) |

---

## 4. Design Token Specification (Tailwind CSS v4 & CSS Variables)

These design tokens translate directly into `src/app/globals.css` using Tailwind CSS v4 `@theme inline`. Under Harmoni's multi-theme architecture, CSS custom properties are declared globally on `:root` and `html[data-theme="obsidian-studio"]` for the default *Obsidian Studio* theme, and overridden per theme via root-level `html[data-theme="..."]` attribute selectors to ensure consistent zero-FOUC server-rendering and client switching:

```css
:root,
html[data-theme="obsidian-studio"] {
  /* Canvas & Structural Surfaces */
  --background: #0b0c10;
  --foreground: #f3f4f6;
  --card: #14161f;
  --card-foreground: #f3f4f6;
  --popover: #161924;
  --popover-foreground: #f3f4f6;

  /* Muted Surfaces & Hairline Borders */
  --muted: #1c202c;
  --muted-foreground: #9ca3af;
  --border: #252936;
  --input: #252936;

  /* Primary Studio Amber Accents */
  --primary: #f59e0b;
  --primary-foreground: #0b0c10;
  --primary-hover: #fbbf24;
  --primary-subtle: rgba(245, 158, 11, 0.12);

  /* Secondary Brass / Copper Accents */
  --secondary: #d97706;
  --secondary-foreground: #0b0c10;
  --accent: #d97706;
  --accent-foreground: #0b0c10;

  /* Status Tokens */
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --success: #10b981;
  --success-foreground: #ffffff;

  /* Standard Geometry */
  --radius: 0.625rem; /* 10px */
  --radius-sm: 0.375rem; /* 6px */
  --radius-lg: 0.875rem; /* 14px */
}

/* Nordic Aurora Overrides */
html[data-theme="nordic-aurora"] {
  --background: #070a12;
  --foreground: #f0fdf4;
  --card: #0d131f;
  --card-foreground: #f0fdf4;
  --popover: #131c2e;
  --popover-foreground: #f0fdf4;
  --muted: #131c2e;
  --muted-foreground: #94a3b8;
  --border: #1e2b45;
  --input: #1e2b45;
  --primary: #06b6d4;
  --primary-foreground: #070a12;
  --primary-hover: #22d3ee;
  --primary-subtle: rgba(6, 182, 212, 0.14);
  --secondary: #10b981;
  --secondary-foreground: #070a12;
  --accent: #10b981;
  --accent-foreground: #070a12;
}

/* Editorial Vinyl Overrides */
html[data-theme="editorial-vinyl"] {
  --background: #090a0d;
  --foreground: #fafafa;
  --card: #101217;
  --card-foreground: #fafafa;
  --popover: #161920;
  --popover-foreground: #fafafa;
  --muted: #181b22;
  --muted-foreground: #a1a1aa;
  --border: #272b38;
  --input: #272b38;
  --primary: #bef264;
  --primary-foreground: #090a0d;
  --primary-hover: #d9f99d;
  --primary-subtle: rgba(190, 242, 100, 0.14);
  --secondary: #a3e635;
  --secondary-foreground: #090a0d;
  --accent: #a3e635;
  --accent-foreground: #090a0d;
}

/* Crimson Vigil (Daredevil-inspired) Overrides */
html[data-theme="crimson-vigil"] {
  --background: #08080a;
  --foreground: #f4f4f5;
  --card: #101014;
  --card-foreground: #f4f4f5;
  --popover: #16161c;
  --popover-foreground: #f4f4f5;
  --muted: #1a1618;
  --muted-foreground: #a1a1aa;
  --border: #381418;
  --input: #381418;
  --primary: #e11d48;
  --primary-foreground: #ffffff;
  --primary-hover: #f43f5e;
  --primary-subtle: rgba(225, 29, 72, 0.16);
  --secondary: #be123c;
  --secondary-foreground: #ffffff;
  --accent: #be123c;
  --accent-foreground: #ffffff;
}

/* Cobalt Web (Spider-Man-inspired) Overrides */
html[data-theme="cobalt-web"] {
  --background: #080b14;
  --foreground: #f1f5f9;
  --card: #0e1424;
  --card-foreground: #f1f5f9;
  --popover: #141d33;
  --popover-foreground: #f1f5f9;
  --muted: #162038;
  --muted-foreground: #94a3b8;
  --border: #202c49;
  --input: #202c49;
  --primary: #dc2626;
  --primary-foreground: #ffffff;
  --primary-hover: #ef4444;
  --primary-subtle: rgba(220, 38, 38, 0.16);
  --secondary: #2563eb;
  --secondary-foreground: #ffffff;
  --accent: #2563eb;
  --accent-foreground: #ffffff;
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

1. `avatar_1`: **Amber Studio Turntable** — Minimalist vinyl turntable deck, concentric grooves, tonearm & amber center spindle.
2. `avatar_2`: **Golden Tube Preamp** — Glass dome vacuum tube envelope, socket base, and glowing amber tube filament.
3. `avatar_3`: **Obsidian Waveform** — Intersecting audio sine waves in copper and amber with harmonic curves and peak nodes.
4. `avatar_4`: **Geometric Vinyl Disc** — Concentric disc tracks, center label, gloss sheen reflection wedges & spindle hole.
5. `avatar_5`: **Nordic Aurora Prism** — Triangular crystal prism splitting an amber acoustic beam into cyan & emerald rays.
6. `avatar_6`: **Neon Cassette Tape** — Vintage studio cassette shell with dual tape reels, label window & magnetic tape bridge.
7. `avatar_7`: **Soundwave Equalizer** — Five-band vertical frequency spectrum with floating peak indicator dots and baseline dB guide.
8. `avatar_8`: **Acoustic Reverberation** — Concentric sound propagation ripples expanding from a central pulse with alignment ticks.

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

### 7.2 Accurate Figma Deliverable Status (Empty Canvas Shell)
Independent inspection confirmed that the file generated at:
[https://www.figma.com/design/tde7tKDtxqTwhqJQko989H](https://www.figma.com/design/tde7tKDtxqTwhqJQko989H) (Key: `tde7tKDtxqTwhqJQko989H`)
is currently an **empty document canvas shell containing only an empty "Page 1" with no populated design frames or layers**.

> [!IMPORTANT]
> **Tool Boundaries & ₹0 Budget Safeguard:**
> - The remote MCP server does **not** expose the `use_figma` tool (which executes scene-graph JavaScript inside a plugin).
> - `send_code_to_figma` creates runnable Code/Make layers, explicitly documented as not creating native design frames.
> - Native Figma AI generative tools (`generate_vector_illustration`, `generate_image`) consume paid credits, which is strictly prohibited under Harmoni's ₹0 INR rule.
> - **We do not create duplicate empty files or retry unsupported operations.**
> - For this milestone, the committed interactive HTML prototype (`docs/visual-design-exploration.html`) serves as the **actual, canonical visual exploration deliverable**.

---

## 8. High-Fidelity Prototype Specification

The interactive visual exploration is staged in [`docs/visual-design-exploration.html`](file:///d:/Projects/Harmoni/docs/visual-design-exploration.html) and contains five complete, inspectable sections:

1. **Direction Comparison Spectrum:** Interactive toggle comparing Direction 1 (Obsidian Studio), Direction 2 (Nordic Aurora), and Direction 3 (Editorial Vinyl) with token badges, typography metrics, and aesthetic rationales.
2. **Desktop Discover Screen (1440 × 900 Viewport):**
   - 240px fixed left sidebar with Harmoni logo, primary routes, and current user card with inline SVG avatar.
   - Fluid main scroll area with hero vinyl card (*"Late Night Studio Sessions"*), play button, and track metadata.
   - High-density track listing table with index-to-equalizer animation, album thumbnail, monospace duration, and Creative Commons badges (`CC BY-SA 4.0`).
   - Docked 80px hi-fi persistent player bar with hairline top scrubber, scrobble threshold milestone dot, rotary volume control, and queue button.
3. **Desktop Profile Screen (1440 × 900 Viewport · `/@username`):**
   - 104px circular preset avatar (`avatar_1: Amber Studio Turntable`) in hairline brass ring.
   - Display name, `@elena` handle, `ADMIN` badge, member since date, and 250-character biography.
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
   - Eight original handcrafted inline SVG avatar illustrations with consistent `0 0 64 64` viewBoxes, Obsidian Studio styling, and zero external dependencies.
   - Complete CSS variable token palette with color chips and contrast values.

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

---

## 11. Multi-Theme Platform Architecture & Per-User Theme Preference Specification

Harmoni is architected as an independent, per-user multi-theme music platform. Rather than forcing a global visual identity, every signed-in member selects their own visual experience without impacting other friends.

### 11.1 Architectural Principles
1. **Zero Operating Cost:** Theme preferences are stored directly on the existing PostgreSQL `User` record at ₹0 cost—no third-party feature flagging, paid storage, or Redis required.
2. **Zero-FOUC (Flash of Unstyled Content):** Themes must never flash or pop during page load. The active theme is resolved on the server and injected directly into the initial HTML response.
3. **Strict Validation Allowlist:** Client submissions are validated against an immutable, strongly-typed registry to prevent arbitrary CSS injection.
4. **Instant Client Preview:** When exploring themes in Appearance Settings, the UI updates instantaneously in DOM memory before the user commits their selection to the database.

---

### 11.2 Database Schema Integration (Prisma ORM)

In Milestone 3C.1, the Prisma `User` model will be extended with a non-null, default-backed column without modifying existing authentication fields or relations:

```prisma
model User {
  id              String         @id @default(cuid())
  username        String         @unique
  displayName     String
  passwordHash    String
  role            Role           @default(USER)
  avatarKey       String         @default("avatar_1")
  bio             String?        @db.VarChar(250)
  themeKey        String         @default("obsidian-studio") @db.VarChar(50)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  invitationCodes InvitationCode[]
  sessions        Session[]
  invitationUsed  InvitationCode? @relation("UsedInvitation")
}
```

- **Default Value:** `"obsidian-studio"`, ensuring 100% backward-compatibility with all existing users, bootstrap accounts, and seed fixtures.
- **Enum Role Consistency:** `role Role @default(USER)` precisely matches `enum Role { USER, ADMIN }` defined in `prisma/schema.prisma` (correcting an earlier documentation typo that referenced `MEMBER`).
- **Column Constraints:** `VARCHAR(50)`, non-null.
- **Indexing Decision:** `themeKey` is **NOT** indexed. User records are always fetched by primary key (`id`) or unique index (`username`). Adding a secondary index to `themeKey` would introduce write overhead with zero query performance benefit.

---

### 11.3 Theme Registry & Type Safety

A centralized TypeScript registry in `src/lib/theme/constants.ts` defines all available themes and metadata:

```typescript
export const THEME_REGISTRY = [
  'obsidian-studio',
  'nordic-aurora',
  'editorial-vinyl',
  'crimson-vigil',
  'cobalt-web',
] as const;

export type ThemeKey = (typeof THEME_REGISTRY)[number];

export const DEFAULT_THEME: ThemeKey = 'obsidian-studio';

export interface ThemeMeta {
  key: ThemeKey;
  name: string;
  subtitle: string;
  description: string;
  chips: [string, string, string, string]; // [Canvas, Surface, Accent, Text]
  contrastRatio: string;
  wcagGrade: 'AAA' | 'AA';
}

export const THEMES_META: Record<ThemeKey, ThemeMeta> = {
  'obsidian-studio': {
    key: 'obsidian-studio',
    name: 'Obsidian Studio',
    subtitle: 'Default · Warm Analog Hi-Fi',
    description: 'Brushed slate, warm charcoal, and vacuum-tube amber glow.',
    chips: ['#0b0c10', '#161922', '#f59e0b', '#f3f4f6'],
    contrastRatio: '18.06:1 (text) / 9.10:1 (btn)',
    wcagGrade: 'AAA',
  },
  'nordic-aurora': {
    key: 'nordic-aurora',
    name: 'Nordic Aurora',
    subtitle: 'Atmospheric Midnight Glass',
    description: 'Midnight ink glass with bioluminescent cyan and mint emerald.',
    chips: ['#070a12', '#131c2e', '#06b6d4', '#f0fdf4'],
    contrastRatio: '19.04:1 (text) / 8.15:1 (btn)',
    wcagGrade: 'AAA',
  },
  'editorial-vinyl': {
    key: 'editorial-vinyl',
    name: 'Editorial Vinyl',
    subtitle: 'Swiss Typographic Record Club',
    description: 'Matte vinyl black, Swiss grid typography, and electric acid-lime.',
    chips: ['#090a0d', '#161920', '#bef264', '#fafafa'],
    contrastRatio: '19.45:1 (text) / 15.15:1 (btn)',
    wcagGrade: 'AAA',
  },
  'crimson-vigil': {
    key: 'crimson-vigil',
    name: 'Crimson Vigil',
    subtitle: 'Daredevil-inspired · Shadow Noir',
    description: 'Deep shadow black, dark oxblood leather, and blind-justice crimson.',
    chips: ['#08080a', '#16161c', '#e11d48', '#f4f4f5'],
    contrastRatio: '18.23:1 (text) / 4.70:1 (btn)',
    wcagGrade: 'AA',
  },
  'cobalt-web': {
    key: 'cobalt-web',
    name: 'Cobalt Web',
    subtitle: 'Spider-Man-inspired · Midnight Navy',
    description: 'Midnight navy canvas, royal cobalt, dynamic vermilion red, and sky cyan.',
    chips: ['#080b14', '#141d33', '#dc2626', '#f1f5f9'],
    contrastRatio: '17.84:1 (text) / 4.83:1 (btn)',
    wcagGrade: 'AA',
  },
};
```

---

### 11.4 Zero-FOUC Server-Side Rendering (Next.js 16 App Router)

To eliminate any visual flash of unstyled theme on initial load or navigation:

1. **Root Server Layout (`src/app/layout.tsx`):**
   - The Root Layout executes on the server.
   - Calls `getCurrentUser()` from `src/lib/auth/dal.ts` (memoized via React 19 `cache()`).
   - If authenticated, reads `user.themeKey`. If unauthenticated or invalid, falls back to `DEFAULT_THEME` (`'obsidian-studio'`).
   - Injects the theme directly into the root HTML element:
     ```tsx
     export default async function RootLayout({ children }: { children: React.ReactNode }) {
       const user = await getCurrentUser();
       const themeKey = user && THEME_REGISTRY.includes(user.themeKey as ThemeKey)
         ? user.themeKey
         : DEFAULT_THEME;

       return (
         <html lang="en" data-theme={themeKey} suppressHydrationWarning>
           <body className="antialiased selection:bg-primary selection:text-primary-foreground">
             {children}
           </body>
         </html>
       );
     }
     ```
2. **Outcome:** The browser receives HTML where `data-theme` is already set. The CSS variables match before the first frame paints. Zero layout shift, zero white/amber/red flash.

---

### 11.5 Theme Preference API Endpoint (`PATCH /api/users/me/theme`)

- **Method & Route:** `PATCH /api/users/me/theme`
- **Authentication:** Enforces valid session cookie via `getCurrentUser()` DAL. Returns `401 Unauthorized` for unauthenticated requests.
- **Request Size:** Enforced at <= 64 KiB via `parseJsonBody` from `src/lib/auth/http.ts`.
- **Zod Schema:**
  ```typescript
  import { z } from 'zod';
  import { THEME_REGISTRY } from '@/lib/theme/constants';

  export const updateThemeSchema = z.object({
    themeKey: z.enum(THEME_REGISTRY, {
      message: 'Invalid theme identifier. Must be one of the registered theme keys.',
    }),
  });
  ```
- **Database Mutation:**
  ```typescript
  const updatedUser = await db.user.update({
    where: { id: sessionUser.id },
    data: { themeKey: validated.themeKey },
    select: { id: true, username: true, themeKey: true },
  });
  ```
- **Response:** `200 OK` with JSON `{ success: true, themeKey: updatedUser.themeKey }` and `Cache-Control: no-store`.

---

### 11.6 Appearance Settings UI Specification

The Appearance Settings interface is accessible from the user profile or main navigation:

1. **Five Interactive Theme Cards:**
   - 4-chip chromatic swatch preview showing exact Canvas, Surface, Accent, and Text colors.
   - Card displays theme title, subtitle, aesthetic description, and WCAG accessibility contrast ratio badge.
   - Selected state indicated by a high-contrast theme-colored border, glowing accent aura, and an active check pip.
2. **Instant Live Preview:**
   - Clicking any card immediately applies `document.documentElement.setAttribute('data-theme', themeKey)` for real-time visual inspection without reloading the page.
3. **Commit & Reset Controls:**
   - **Save Preference Button:** Persists selection via `PATCH /api/users/me/theme` and shows a brief confirmation toast.
   - **Reset to Default Button:** Resets selection back to `obsidian-studio`.
4. **Touch & Mobile Ergonomics:**
   - Touch targets for all cards and action buttons exceed 48px × 48px.
   - Vertical stack layout on mobile devices (`max-width: 640px`) with smooth scrolling.

---

## 12. Frontend Implementation Roadmap

```
+-----------------------------------------------------------------------------------------------------------------------------+
| HARMONI FRONTEND IMPLEMENTATION ROADMAP                                                                                     |
+-----------------------------------------------------------------------------------------------------------------------------+
|  [ M3C.0.4: Theme System Audit ]   -> [ M3C.1: Multi-Theme Engine & Persist ] -> [ M3C.2: User Profiles & Avatar Presets ]  |
|  (CURRENT MILESTONE - AUDITED)        - User.themeKey Prisma migration           - Rewrite /@username to /users             |
|  - 5 Themes Audited & Verified        - Zero-FOUC server RootLayout              - 8 SVG avatar presets & bio editing       |
|  - WCAG contrast ratios calculated    - PATCH /api/users/me/theme endpoint       - Public user profile page                 |
|  - html[data-theme] root contract     - Appearance Settings component            (Pending Approval)                         |
|  - Accessible radio cards in HTML     (Next Target Milestone)                                                               |
|                                                                                                                             |
|  [ M4: Jamendo Discovery Engine ]  -> [ M5: Persistent Audio Player ]         -> [ M6: Library & Scrobbling ]               |
|  - Server-side Jamendo API client     - Global Zustand player store              - Liked tracks & playlist CRUD             |
|  - Creative Commons license badges    - Docked Hi-Fi playback bar                - 50%/30s scrobble history engine          |
|  - Safe search & stream resolution    - Mobile player bottom sheet               - Personal listening statistics            |
|                                                                                                                             |
|  [ M7: Social Network & Chat ]     -> [ M8: Final Polish & ₹0 Deployment ]                                                  |
|  - Friend requests & circle state     - End-to-end responsive audit & accessibility check                                   |
|  - On-demand collapsible drawer       - Vercel Hobby + Neon Serverless PostgreSQL deploy (Permanent ₹0 INR)                 |
|  - In-app track-sharing chat                                                                                                 |
+-----------------------------------------------------------------------------------------------------------------------------+
```

1. **Milestone 3C.0.4: Theme System Accuracy & Design Specification Audit (THIS MILESTONE — COMPLETED & AUDITED)**
   - Audited all 5 themes against exact W3C WCAG 2.1 / 2.2 relative luminance calculations; corrected Cobalt Web primary button to `#dc2626` (4.83:1 AA compliant).
   - Unified theme architecture to root-level `html[data-theme="..."]` attribute contract, eliminating hardcoded color leakage and aligning with Next.js 16 `RootLayout`.
   - Upgraded prototype Appearance settings into accessible WAI-ARIA `<button type="button" role="radio">` with roving `tabindex` and arrow key navigation.
   - Corrected database documentation to `role Role @default(USER)` (matching Prisma schema enum) and verified no unnecessary index on `themeKey`.
   - Added honest simulation disclaimers to prototype confirming in-memory live preview.
2. **Milestone 3C.1: Multi-Theme Engine & User Preference Persistence (Next Pending Milestone)**
   - Apply Prisma migration adding `themeKey String @default("obsidian-studio") @db.VarChar(50)` to `User`.
   - Implement zero-FOUC server-rendered `RootLayout` reading `getCurrentUser()` and applying `data-theme` to `<html>`.
   - Implement `PATCH /api/users/me/theme` with strict Zod validation against `THEME_REGISTRY`.
   - Build accessible Appearance Settings modal / page component with the 5 interactive cards.
3. **Milestone 3C.2: User Profiles & Avatar Presets (Subsequent Milestone)**
   - Implement `next.config.ts` URL rewrite from `/@:username` to `/users/:username`.
   - Build public user profile page (`src/app/users/[username]/page.tsx`) with 8 bundled SVG avatar presets (`avatar_1` to `avatar_8`).
   - Build self-service profile bio editing modal (`User.bio` up to 250 characters).
4. **Milestone 4: Music Discovery Engine & Jamendo API Integration**
   - Server-side Jamendo client, search endpoints, and legal Creative Commons attribution badges.
5. **Milestone 5: Persistent Audio Player & Queue Controller**
   - Global Zustand audio player store, root layout player bar, and responsive mobile player sheet.
6. **Milestone 6: Personal Library, Playlists & Local Scrobbling**
   - Liked tracks, playlist CRUD, and the 50%/30-second local scrobble history engine.
7. **Milestone 7: Friendship Network & Direct Track-Sharing Chat**
   - Friend request workflows, on-demand social drawer, and lightweight polling chat with embedded playable track cards.
8. **Milestone 8: Final UI Polish, Free Deployment & Production Verification**
   - End-to-end responsiveness, multi-theme contrast polish, and deployment verification on Vercel Hobby + Neon at ₹0 INR.
