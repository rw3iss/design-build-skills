---
name: design-build
description: >-
  Scaffold a Preact + TypeScript + SCSS application that matches a set of design
  images. Use this when the user says "build it" / "build from these images" with
  any image source: a prior designer-skill output, an existing designs/<name>
  folder, an arbitrary image folder, or direct image file paths. Reads an optional
  BUILD.md for project-specific rules, emits a PLAN.md, and produces an app/
  scaffold with a mandatory mock-data layer so the result is immediately demoable.
  Does not produce backend code or tests.
---

# design-build skill

Turns design images into a Preact scaffold. The images can come from any source — no prior designer-skill run is required.

## Image input modes

### Mode A — prior designer phase (indices)
User ran the `designer` skill and has a `designs/<request>/` folder with `images/01–04.png` already present. User selects by index:

> "build from 2 and 4, make the buttons rounder"

1. Derive `request` from the existing folder name.
2. Resolve `imagesDir` = `designs/<request>/images/`.
3. Call `select_images.ts` with `mode: "indices"`.

### Mode B — existing image folder
User points to any folder on disk (may or may not be a design project root):

> "build from the images in ./mockups/checkout/"

1. Derive `request` from the folder name (kebab-case) or ask the user.
2. If the folder is a design project root (has `images/` subdir with images), use that subdir; otherwise use the folder itself.
3. Call `select_images.ts` with `mode: "dir"`.

### Mode C — direct file paths
User provides one or more explicit image paths:

> "build from design1.png and design2.jpg"

1. Derive `request` from the shared parent folder name, the first filename stem, or ask the user.
2. Call `select_images.ts` with `mode: "paths"`.

---

## Output location

- If `designs/<request>/` **already exists** (prior designer phase): build the app under `designs/<request>/app/`.
- If `designs/<request>/` **does not exist**: create it and build the app under `designs/<request>/app/`.

The `build_plan.ts` + `scaffold_preact.ts` scripts always write to `designs/<request>/app/` regardless of image source. Pass `projectCwd` as the working directory root so paths resolve correctly.

---

## Build mode

`build_plan.ts` accepts a `mode` parameter that controls how closely the app must match the design:

| Mode | When to use | Behavior |
|---|---|---|
| `"exact"` (default) | "build this", "replicate this design" | Forces a mandatory zone-by-zone layout analysis before any code; execution directive requires pixel-accurate replication of each zone's column structure, content slots, and visual treatment |
| `"creative"` | "be more creative", "use this as inspiration", "go further" | Replaces the layout analysis with an aesthetic-extraction step (color story, typographic personality, signature moves); execution directive says to invent a bolder layout that captures the same spirit |

Read the user's phrasing to pick the mode. Phrases like "be creative", "more abstract", "inspired by", "go further", or "do something unique" → `creative`. Anything else → `exact`.

---

## Flow

1. **Determine `request` name** — from the existing design folder, the image folder name (kebab-cased via `toRequestName`), or a name the user provides.
2. **Determine `mode`** — `"exact"` (default) or `"creative"` based on user phrasing.
3. **Resolve image paths** — call `select_images.ts` in the appropriate mode (A, B, or C above). Capture the returned `imagePaths` array.
4. **Write PLAN.md** — call `build_plan.ts` with `request`, `projectCwd`, `imagePaths`, `mode`, and optional `extraPrompt`. The `originalBrief` is read automatically from `designs/<request>/prompts/original.md` if it exists (designer phase); otherwise it defaults to empty.
5. **Scaffold the app skeleton** — call `scaffold_preact.ts` with `targetDir` = `designs/<request>/app/` and `appName` = `request`.
6. **Write components, styles, and fixtures** — Claude (this conversation) reads the images and PLAN.md. In `exact` mode: produce the layout inventory first, then implement zone by zone. In `creative` mode: produce the aesthetic extraction + invented layout first, then implement.

---

## Mandatory: the mock-data layer

Every scaffolded app exposes `src/services/api/ApiClient.ts` (an interface) and `src/services/api/index.ts` (the injection point wiring in `MockApiAdapter`). The UI depends only on `ApiClient`. Swapping to a real backend is a one-line change in `services/api/index.ts`. Fixtures in `src/mock/data/*.json` must reflect the entities shown in the design images.

---

## Commands

| Script | Purpose |
|---|---|
| `select_images.ts '<json>'` | Resolve image paths — supports three modes (see below) |
| `build_plan.ts '<json>'` | Write `designs/<request>/prompts/prompt_build.md` |
| `scaffold_preact.ts '<json>'` | Copy templates into `designs/<request>/app/` |

### `select_images.ts` modes

```jsonc
// Mode A — numeric indices into a designer-phase images/ dir
{ "mode": "indices", "imagesDir": "designs/checkout/images", "indices": [2, 4], "preferUpscaled": false }

// Mode B — all images from an arbitrary folder
{ "mode": "dir", "dir": "/path/to/any/image/folder" }

// Mode C — explicit file paths
{ "mode": "paths", "paths": ["/abs/path/img1.png", "/abs/path/img2.jpg"] }
```

Returns: `{ "status": "ok", "imagePaths": ["..."] }`

### `build_plan.ts` args

```jsonc
{
  "request": "checkout-glass",       // request / folder name
  "projectCwd": ".",                 // root for BUILD.md walk-up + designs/ location
  "imagePaths": ["..."],             // resolved absolute paths from select_images
  "extraPrompt": "rounder buttons",  // optional selection-time guidance
  "originalBrief": "",              // optional; auto-read from prompts/original.md if blank
  "mode": "exact"                   // "exact" (default) or "creative"
}
```

### `scaffold_preact.ts` args

```jsonc
{ "targetDir": "designs/checkout-glass/app", "appName": "checkout-glass" }
```

---

## Shared utilities

`shared.ts` re-exports path/name helpers from `../designer/lib/` (storage + prompt_prep). The **designer workflow** does not need to have been run — only the shared library files need to be present. Both skills are installed together by `install.sh`.
