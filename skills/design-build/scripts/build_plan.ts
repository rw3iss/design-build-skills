import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findDesignMd, readIfExists, requestPaths, ensureRequestDirs } from "../shared.ts";
import { z } from "zod";

export type BuildMode = "exact" | "creative";

export interface ComposeInputs {
  request: string;
  originalBrief: string;
  buildRules: string | null;
  extraPrompt: string | null;
  imagePaths: string[];
  mode: BuildMode;
}

// ─── Layout Analysis Protocol (exact mode) ──────────────────────────────────

const LAYOUT_ANALYSIS_EXACT = `\
## Layout analysis — MANDATORY FIRST STEP

Before writing a single line of code, read every selected design image and produce
a written layout inventory **in your response**. This inventory is the structural
blueprint for all components. Do not start coding until it is complete.

### Protocol

1. **Scan top-to-bottom.** List every distinct visual zone in vertical order.
   Common zones: thin top utility bar · main navigation + logo ·
   sub-navigation / category bar · hero · feature strip · product grid ·
   editorial callout · footer. Name your zones based on what you actually see.

2. **For each zone, document all six attributes:**

   | Attribute | What to write |
   |---|---|
   | **Name** | Short identifier used as the component filename (e.g. \`TopBar\`, \`NavBar\`, \`Hero\`) |
   | **Purpose** | One sentence: what does this zone communicate or do? |
   | **Layout** | Column count + proportions (e.g. "2-col: text 45% · image 55%") |
   | **Content slots** | Every distinct content element inside, in order (e.g. "kicker label · display headline [2 lines] · body copy · 2 CTA buttons · price") |
   | **Visual treatment** | Background color, borders, accent marks (e.g. "cream bg · bottom hairline · em-dash kicker prefix") |
   | **Approx. height** | Relative to viewport (e.g. "~55 vh" or "auto ~80 px") |

3. **Write the inventory** as a markdown table or numbered list before any code block.

4. **One zone = one component file.** Do not merge zones. Do not split a zone into
   sub-components unless the zone contains a clearly reusable unit (e.g. a card in a grid).

5. **Lock proportions.** Whatever column split / aspect ratio you document,
   use those exact values in CSS (\`grid-template-columns\`, \`aspect-ratio\`, etc.).
   Do not round or approximate after the fact.

6. **Cross-check before shipping.** After writing all components, re-read the
   image and verify each zone matches its inventory entry. If you find a drift,
   fix both the code and the inventory entry so they stay in sync.`;

// ─── Execution Directive (exact mode) ───────────────────────────────────────

const EXECUTION_DIRECTIVE_EXACT = `\
## Execution directive — REPLICATE THE DESIGN, ZONE BY ZONE

Your layout inventory is the contract. For each zone:

- Build **exactly** the column/grid structure you documented.
- Reproduce **every content slot** you listed — nothing added, nothing omitted.
- Apply the **exact visual treatment** (background, borders, accents) you noted.
- Use the **exact proportions** (column splits, aspect ratios, heights) you measured.
- If you discover a discrepancy between the inventory and the image while coding,
  correct the inventory and the code together.

**Do not generalize.** If the design shows 2 CTA buttons, implement 2 CTA buttons.
If the hero splits text/image at ~45:55, write \`grid-template-columns: 45fr 55fr\`.
If a kicker uses an em-dash prefix, use an em-dash prefix.
"Similar but different" is a failure mode.`;

// ─── Design Inspiration Analysis (creative mode) ─────────────────────────────

const LAYOUT_ANALYSIS_CREATIVE = `\
## Design inspiration analysis — do this first (creative mode)

The design images are creative fuel, not a blueprint to copy. Before writing any code,
read the images and perform this aesthetic extraction:

1. **Color story** — name the 2–4 dominant colors and describe their relationship
   (e.g. "warm cream ground · deep ink text · single warm-gold accent; no bright colors").

2. **Typographic personality** — describe the type aesthetic in 2–3 adjectives and
   note the key typographic moves (e.g. "editorial, refined, high-contrast — display
   serif headlines paired with light-weight all-caps labels").

3. **Spatial density** — is the layout airy and sparse, or information-dense?
   What is the dominant negative-space rhythm?

4. **Signature design moves** — the 1–2 choices that give the design its distinctive
   character (e.g. "editorial kicker with em-dash prefix · centered monogram logo
   above a full-width nav").

5. **Invent your own layout.** Using the vocabulary above as your constraint,
   design a layout that is bolder, more elaborate, and more surprising than the
   reference. You are not copying the design — you are using it as a mood board.
   Be generous with scale, whitespace, and typographic contrast.

6. **Document your invented layout** as a zone inventory (same format as exact mode:
   Name · Purpose · Layout · Content slots · Visual treatment · Approx. height)
   so you can build from it consistently.`;

// ─── Execution Directive (creative mode) ────────────────────────────────────

const EXECUTION_DIRECTIVE_CREATIVE = `\
## Execution directive — INSPIRED BY THE DESIGN, NOT BOUND BY IT

Your aesthetic vocabulary and invented layout (above) are the contract.
The reference design establishes the visual language; you determine the structure.

- Match the **color story** and **typographic personality** faithfully.
- Invent the **layout structure** — be bolder and more elaborate than the reference.
- Go further with scale, whitespace, typographic contrast, and decorative detail.
- Aim for something that would make a designer say "this is better than the reference."
- The brief is a mood board, not a spec.`;

// ─── Shared sections ─────────────────────────────────────────────────────────

const TYPOGRAPHY_MINING = `\
## Typography mining (MANDATORY before writing component SCSS)

The scaffold ships with \`src/styles/_fonts.scss\` pre-wired into
\`global.scss\`. Before writing any component styles, walk through this
protocol — this is how we guarantee the built UI has the right typography
feel, not a generic system-font fallback.

1. **Enumerate every distinct text zone** in the selected image(s). Typical
   zones: brand wordmark, top-nav items, hero headline, hero kicker, hero
   subtitle, section titles, card titles, card labels (brand / model /
   price), button labels, micro-copy, footer text, numeric data.
2. **Describe each zone's visual attributes** — serif / sans / display /
   mono, weight range, letter-spacing, case (all-caps vs sentence), and
   relative size. Write this as a list in your working notes.
3. **Propose 2 candidate font stacks per zone**. Prefer Google Fonts where
   a close match exists (they're free, easy to @import, and well-covered).
   Always include a generic fallback family and the generic category.
   Example per zone:
      heading:  ["Playfair Display", "Didot", serif]    — primary
                ["Cormorant Garamond", "Georgia", serif] — alternate
4. **Consolidate into \`src/styles/_fonts.scss\`**:
   - Add one \`@import url(...)\` line at the top covering ALL chosen
     Google Fonts with \`display=swap\`. Group weights so there's one URL.
   - Replace each \`$font-*\` zone variable with the primary stack.
   - Keep the alternate stack as a commented \`// alt:\` line above for
     easy future swap-outs.
   - Tune \`$weight-*\` if the design uses uncommon weights (e.g. 150, 350).
5. **Import and use** — components reference \`$font-heading\`,
   \`$font-body\`, \`$font-label\`, etc. Never write a raw \`font-family\`
   string in a component SCSS file.
6. **Verify legibility** — once the app runs (\`npm run dev\`), check the
   browser console for failed font loads and visually confirm the weights
   you requested actually loaded (Chrome DevTools → Network → WS → Fonts).

When the design image is low-resolution or a glyph is ambiguous, prefer
the font family that matches the overall aesthetic (e.g. editorial
boutique → serif display; tech/SaaS → geometric sans) rather than
guessing exact letterforms.`;

const COMPONENT_RULES = `\
## Component + styling rules

- Generate Preact components with per-component SCSS (and \`.mobile.scss\`
  companions where the mobile variant materially differs from desktop).
- Populate \`src/mock/data/*.json\` with realistic fixture data reflecting
  the entities visible in the images (e.g. for a watch marketplace:
  brand, model, price, image URL, case size, movement).
- The UI must render correctly against the MockApiAdapter alone — no
  real backend, no env vars required to demo.
- Every text element uses \`$font-*\` variables from \`_fonts.scss\` — no
  hardcoded \`font-family\`.`;

// ─── Composer ────────────────────────────────────────────────────────────────

export function composePlan(inputs: ComposeInputs): string {
  const { mode = "exact" } = inputs;
  const lines: string[] = [];

  lines.push(`# Build prompt for ${inputs.request}`, "");
  lines.push(
    "This is the canonical build-phase prompt. It merges the original design brief,",
    "any project-specific BUILD.md rules, selection-time additional guidance, and",
    "the list of design images that were selected. The builder (Claude) uses this",
    "document as the authoritative brief when generating the Preact app.",
    ""
  );

  lines.push(`**Build mode: ${mode === "creative" ? "creative (design as inspiration)" : "exact (replicate the design)"}**`, "");

  lines.push("## Original brief", "", inputs.originalBrief.trim() || "_(none provided)_", "");

  if (inputs.extraPrompt) {
    lines.push("## Additional guidance (selection time)", "", inputs.extraPrompt.trim(), "");
  }

  if (inputs.buildRules) {
    lines.push("## Build rules (from BUILD.md)", "", inputs.buildRules.trim(), "");
  }

  lines.push("## Selected design images", "");
  if (inputs.imagePaths.length === 0) {
    lines.push("_(none — inferring from brief only)_", "");
  } else {
    for (const p of inputs.imagePaths) lines.push(`- ${p}`);
    lines.push("");
  }

  // Layout analysis protocol — mode-specific
  lines.push(mode === "creative" ? LAYOUT_ANALYSIS_CREATIVE : LAYOUT_ANALYSIS_EXACT, "");

  // Execution directive — mode-specific
  lines.push(mode === "creative" ? EXECUTION_DIRECTIVE_CREATIVE : EXECUTION_DIRECTIVE_EXACT, "");

  // Typography mining — same for both modes
  lines.push(TYPOGRAPHY_MINING, "");

  // Component rules — same for both modes
  lines.push(COMPONENT_RULES, "");

  return lines.join("\n");
}

// ─── CLI entry ───────────────────────────────────────────────────────────────

const Args = z.object({
  request: z.string().min(1),
  projectCwd: z.string().min(1),
  originalBrief: z.string().default(""),
  extraPrompt: z.string().nullable().default(null),
  buildMd: z.string().nullable().optional(),
  imagePaths: z.array(z.string()).default([]),
  mode: z.enum(["exact", "creative"]).default("exact"),
});

async function main() {
  const args = Args.parse(JSON.parse(process.argv[2] ?? "{}"));
  const paths = requestPaths(args.projectCwd, args.request);
  ensureRequestDirs(paths);

  const buildMdPath = args.buildMd ?? findDesignMd(args.projectCwd, "BUILD.md");
  const buildRules = readIfExists(buildMdPath);

  let originalBrief = args.originalBrief;
  const origPath = join(paths.prompts, "original.md");
  if (!originalBrief && existsSync(origPath)) {
    originalBrief = readFileSync(origPath, "utf-8");
  }

  if (args.extraPrompt) {
    writeFileSync(join(paths.prompts, "build-notes.md"), args.extraPrompt);
  }

  const plan = composePlan({
    request: args.request,
    originalBrief,
    buildRules,
    extraPrompt: args.extraPrompt,
    imagePaths: args.imagePaths,
    mode: args.mode,
  });

  const promptBuildPath = join(paths.prompts, "prompt_build.md");
  writeFileSync(promptBuildPath, plan);

  console.log(JSON.stringify({ status: "ok", promptBuildPath, request: args.request, mode: args.mode }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
    process.exit(1);
  });
}
