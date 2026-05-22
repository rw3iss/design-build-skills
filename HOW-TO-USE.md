# How to Use design-and-build-skills

Two Claude Code skills you invoke by talking to Claude naturally — no slash commands needed. `designer` generates Midjourney images from a brief; `design-build` turns images into a runnable Preact app. They can be used together or independently.

---

<details open>
<summary><strong>1. designer — Generate design images</strong></summary>

Invoke by describing what you want. Claude will prompt Midjourney via your Discord bot, wait for the reply, split the 2×2 grid into four variants, and save them under `./designs/<request-name>/images/`.

**Basic generation**
```
Design a luxury watch boutique homepage — cream background, large serif headlines, minimal product grid.
```

**With extra constraints**
```
Design a SaaS analytics dashboard. Dark navy sidebar, clean cards with subtle shadows, geometric sans-serif. No illustrations, no gradients.
```

**After generation:** Claude shows you four numbered variants. You can immediately chain into a build:
```
Build from 2 and 4.
```
Or upscale a variant first for higher resolution before building:
```
Upscale 2 and 4, then build from them.
```

<details>
<summary>Upscaling variants</summary>

The default output is a split 2×2 grid at ~512 px per tile. Upscaling clicks Midjourney's U1–U4 buttons to get a full-res single image (~2048 px). Useful when you need sharper type or color detail before building.

```
Upscale images 2 and 4 from the watch-boutique design.
```

Upscaled files are saved as `images/02-up.png`, `04-up.png`. The build skill automatically prefers them when present.

</details>

<details>
<summary>Trigger modes: manual vs automated</summary>

**Manual (default, ToS-safe):** Claude prints the `/imagine` prompt for you to paste into your Discord channel. The bot then listens for Midjourney's reply automatically. No account risk.

**User-token (opt-in, ToS violation):** The bot fires `/imagine` on your behalf via your personal Discord token. Fully automated but explicitly prohibited by Discord's Terms of Service — your account can be banned. Only configure this if you accept that risk.

Set during `designer setup`. Can be overridden per-session via `DESIGNER_TRIGGER_MODE=user-token`.

</details>

</details>

---

<details open>
<summary><strong>2. DESIGN.md — Project-wide design rules</strong></summary>

Place a `DESIGN.md` file in your project root (or any ancestor directory). Claude walks up from the current working directory to find the first one. Its contents are automatically injected into every `designer` prompt for that project.

**What to put in it:**
```markdown
# Design rules

- Palette: off-white (#F7F4EF), deep ink (#1A1A1A), single warm gold accent (#C9A84C).
- Typography: editorial serif display headlines, light-weight all-caps labels. No slab serifs.
- Layout: generous whitespace. Never more than 2 columns on desktop.
- Tone: refined, restrained, boutique. No playful or techy aesthetics.
- Avoid: gradients, drop shadows, neon, illustrations, icons with strokes.
```

With a `DESIGN.md` in place, every brief you give is automatically grounded in those rules — no need to repeat them each time.

<details>
<summary>Overriding or ignoring DESIGN.md for a specific request</summary>

Just say so explicitly:
```
Ignore the project DESIGN.md for this one — I want something brutalist and high-contrast instead.
```

You can also point to a different file:
```
Use ./brand/DESIGN-v2.md instead of the project default.
```

</details>

</details>

---

<details open>
<summary><strong>3. design-build — Scaffold a Preact app from images</strong></summary>

Invoke after you have images — from a `designer` run, an existing folder, or specific files. Claude resolves the images, writes a build plan, scaffolds the app skeleton, then fills in components, styles, and mock fixtures.

### Image input modes

**A — Indices from a prior designer run**
```
Build from images 2 and 4.
Build from image 3 with rounder buttons and more padding.
```
Uses `designs/<request>/images/01–04.png` (or their `-up.png` upscaled versions).

**B — Any image folder**
```
Build from the images in ./mockups/checkout/.
Build an app from the designs in ~/Desktop/brand-refs/.
```
All image files in the folder are used, sorted alphabetically.

**C — Explicit file paths (single or multiple)**
```
Build from /path/to/design1.png.
Build from design-desktop.png and design-mobile.png.
```

### Build modes

**Exact mode (default)** — replicates the design as precisely as possible. Claude must produce a full zone-by-zone layout inventory before writing any code.

```
Build from 2 and 4.
Replicate this design exactly.
```

**Creative mode** — design images become a mood board. Claude extracts the aesthetic vocabulary (color story, typographic personality) then invents a bolder, more elaborate layout.

```
Build from 2, but be more creative with it.
Use this as inspiration and go further — I want something unique.
Build from these images but be more abstract with the layout.
```

<details>
<summary>How exact mode's layout analysis works</summary>

Before writing a line of code, Claude reads the selected images top-to-bottom and produces a written zone inventory — every distinct visual section gets: a component name, its purpose, column structure and proportions, every content slot inside it, visual treatment (background, borders, accents), and approximate height. Those proportions are then locked directly into CSS (`grid-template-columns`, `aspect-ratio`, etc.). This prevents the common failure mode where Claude gets the aesthetic right but approximates the structure.

</details>

<details>
<summary>How creative mode works</summary>

Instead of a layout inventory, Claude extracts: the color story (palette + relationships), typographic personality (adjectives + key moves), spatial density, and 1–2 signature design choices. It then invents its own layout that embodies the same vocabulary — aiming for something bolder than the reference. Typography mining (font matching) still runs in both modes.

</details>

</details>

---

<details open>
<summary><strong>4. BUILD.md — Project-wide build rules</strong></summary>

Place a `BUILD.md` in your project root (same walk-up mechanism as `DESIGN.md`). Its contents are injected into every `design-build` plan for that project.

**What to put in it:**
```markdown
# Build rules

- Component pattern: one .tsx + one .scss per component, co-located.
- State: no global state library — use Preact signals for shared state.
- API shape: RESTful, snake_case JSON fields, paginated list endpoints return `{ items, total, page }`.
- Naming: PascalCase components, kebab-case filenames.
- Images: always use the `<Image>` wrapper from src/components/Image — never a bare <img>.
- No inline styles. All values from SCSS variables.
```

<details>
<summary>What gets injected and where</summary>

`BUILD.md` content appears in the generated `designs/<request>/prompts/prompt_build.md` under a "Build rules" section, before the execution directive. Claude reads this file at the start of the build phase and applies the rules when writing every component, service, and fixture.

</details>

</details>

---

<details open>
<summary><strong>5. Prompt examples by project type</strong></summary>

### Boutique / editorial / refined

```
# DESIGN.md
Palette: warm cream, deep ink, no accent colors. Typography: high-contrast serif display.
Tone: editorial, restrained, gallery-like. No icons, no gradients, no illustrations.
```

```
Design a homepage for a luxury pre-owned watch marketplace.
Centered logo, editorial hero with a single featured piece (text left, image right),
"Curated This Week" strip below, full product grid at the bottom.
```

```
Build from 2 — exact mode. This is the production reference.
```

---

### SaaS analytics dashboard

```
Design a SaaS analytics dashboard. Dark sidebar (#0F1117), white content area,
KPI cards in a 4-column row, a large line chart, a data table below.
Geometric sans-serif, professional, no decorative elements.
```

```
Build from 1 and 3 — creative mode. Use the color system and information density
as the constraint but design something more distinctive than a standard admin panel.
```

---

### Single UI component

```
Design a pricing table component — three tiers (Starter / Pro / Enterprise),
highlight the middle tier, clean and modern, dark background with white cards.
```

```
Build from 2. Just the PricingTable component and its mock data — no full page shell.
```

---

### Abstract / art-forward landing page

```
Design an artist portfolio landing page. Full-bleed black background,
large chaotic typographic hero, sparse grid of project thumbnails below.
Brutalist but refined. No navigation visible above the fold.
```

```
Build from 3 — be more creative, use this as a mood board. I want something
more elaborate and surprising than the reference.
```

---

### Mobile-first product card

```
Design a product card component for a streetwear brand marketplace.
Bold sans-serif, dark mode, price prominent, brand logo small.
Card is vertical, 2-up on mobile.
```

```
Build from 1 and 4. Exact mode. Include a .mobile.scss companion.
```

</details>

---

<details open>
<summary><strong>6. Tips & advanced usage</strong></summary>

**Output location defaults to your launch directory.** All designs land in `./designs/<request-name>/` relative to wherever Claude Code was started. The simplest workflow is to launch Claude from inside your project folder. To override for a specific request, just say so:
```
Design a checkout page. Use ~/Sites/myproject as the project root.
Build from 2 and 4. Project folder is ~/Sites/clientX/.
```

**Chain designer → design-build in one conversation.** You don't need to start a new session. After `designer` shows the four variants, just say "build from 2" and `design-build` picks up immediately, reusing the same request name and `prompts/original.md`.

**Upscale before building for detail-heavy UIs.** Typography, icon sizes, and micro-spacing are easier to read at full res. `Upscale 2 and 4` before `build from them` adds ~10 seconds and meaningfully improves font matching accuracy.

**Be specific about what you don't want.** Midjourney defaults to device mockups, 3D perspectives, and photorealistic scenes. The skill already suppresses the worst offenders, but adding explicit negatives to your brief helps:
```
No device frames, no 3D, no people, no lifestyle photography.
```

**Use DESIGN.md for long-running projects.** If you're iterating on a product over many sessions, a committed `DESIGN.md` ensures every new design request stays on-brand without you needing to repeat the constraints.

**Creative mode is good for exploration; exact mode is good for delivery.** Run a few creative-mode builds to find a direction you like, then run exact mode on your favorite result for the production build.

**Build from images you didn't generate.** Any `.png`, `.jpg`, or `.webp` works — Dribbble screenshots, Figma exports, competitor screenshots, hand-drawn scans. Just pass the paths directly:
```
Build from ~/Desktop/figma-export-v3.png — exact mode.
```

**The mock-data layer means every build is immediately demoable.** Run `npm run dev` in the `app/` directory right after the build phase completes. No backend, no env vars, no configuration needed.

<details>
<summary>Directory layout reference</summary>

```
designs/
  <request-name>/
    prompts/
      original.md          ← your original brief (designer phase)
      prompt_design.md     ← full MJ prompt with rules + flags
      prompt_build.md      ← build plan (layout inventory, directives, rules)
      build-notes.md       ← selection-time extra guidance (if any)
    raw/
      mj-<id>.png          ← original 2×2 grid from Discord
      mj-<id>.json         ← message metadata + U-button IDs
    images/
      01.png … 04.png      ← split quadrants
      02-up.png            ← upscaled variants (if requested)
    app/                   ← scaffolded Preact app
      src/
        components/        ← one folder per component (TSX + SCSS)
        services/api/      ← ApiClient interface + injection point
        mock/
          MockApiAdapter.ts
          data/*.json      ← fixture data
      styles/              ← _variables, _fonts, _mixins, global
```

</details>

<details>
<summary>Manually invoking scripts</summary>

In normal use you never call these yourself — Claude invokes them as subprocesses via its Bash tool during a session. They handle deterministic work (path resolution, file I/O, template copying) so Claude doesn't have to do it in-context. The AI reasoning (reading images, writing components, deciding layout) stays in the Claude session.

These are useful if you want to debug a step in isolation, inspect what a script resolves to for a given input, or wire the scripts into an external automation pipeline without a Claude session:


```bash
# Resolve image paths from a folder
npx tsx ~/.claude/skills/design-build/scripts/select_images.ts \
  '{"mode":"dir","dir":"./mockups/checkout"}'

# Resolve explicit file paths
npx tsx ~/.claude/skills/design-build/scripts/select_images.ts \
  '{"mode":"paths","paths":["./design1.png","./design2.png"]}'

# Write a build plan (exact mode)
npx tsx ~/.claude/skills/design-build/scripts/build_plan.ts \
  '{"request":"my-app","projectCwd":".","imagePaths":["/abs/path/img.png"],"mode":"exact"}'

# Write a build plan (creative mode)
npx tsx ~/.claude/skills/design-build/scripts/build_plan.ts \
  '{"request":"my-app","projectCwd":".","imagePaths":["/abs/path/img.png"],"mode":"creative","extraPrompt":"go bold"}'

# Scaffold the app shell
npx tsx ~/.claude/skills/design-build/scripts/scaffold_preact.ts \
  '{"targetDir":"./designs/my-app/app","appName":"my-app"}'
```

All scripts output `{"status":"ok",...}` or `{"status":"error","message":"..."}` to stdout.

</details>

</details>
