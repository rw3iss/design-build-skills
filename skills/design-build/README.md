# design-build (Claude Code skill)

Scaffolds a Preact + TypeScript + SCSS app from a set of design images. The images can come from any source — no prior `designer` skill run is required. Installed by the `@vendidit/design-and-build-skills` installer.

---

## Image input modes

When you invoke this skill, Claude resolves images via `select_images.ts` using one of three modes:

### A — numeric indices (prior designer phase)

You ran the `designer` skill and have a `designs/<request>/images/` folder with `01–04.png`. Select by number:

> "build from 2 and 4"

```jsonc
{ "mode": "indices", "imagesDir": "designs/checkout/images", "indices": [2, 4] }
// optional: "preferUpscaled": true  →  prefers 02-up.png over 02.png when present
```

### B — folder of images

Point to any directory. All image files inside (`.png .jpg .jpeg .webp .gif`) are used, sorted alphabetically.

> "build from the images in ./mockups/checkout/"

```jsonc
{ "mode": "dir", "dir": "./mockups/checkout" }
```

If the folder is a design-project root (contains an `images/` subdirectory with images), Claude will use `images/` automatically.

### C — explicit file paths

Pass one or more image file paths directly — relative or absolute.

> "build from design1.png and ~/refs/design2.jpg"

```jsonc
{ "mode": "paths", "paths": ["./design1.png", "/home/user/refs/design2.jpg"] }
```

---

## Build modes

`build_plan.ts` accepts a `mode` parameter that controls how the plan is written:

| Mode | When to use | What changes |
|---|---|---|
| `"exact"` (default) | "build this", "replicate this design" | Mandatory zone-by-zone layout analysis before any code; execution directive requires pixel-accurate replication of each zone's column structure, content slots, and visual treatment |
| `"creative"` | "be creative", "use this as inspiration", "go further" | Design images are a mood board; plan extracts aesthetic vocabulary (color story, typographic personality, signature moves) and directs Claude to invent a bolder layout |

Claude picks the mode from your phrasing automatically. Typography mining is mandatory in both modes.

---

## Output location

- If `designs/<request>/` already exists (prior designer phase): app lands at `designs/<request>/app/`.
- If not: the folder is created and app lands at `designs/<request>/app/`.

---

## Mock-data layer

Every scaffolded app ships with `src/services/api/ApiClient.ts` (an interface) and `src/services/api/index.ts` wired to `MockApiAdapter`. The UI depends only on `ApiClient` — swapping to a real backend is a one-line change:

```typescript
// src/services/api/index.ts
import type { ApiClient } from "./ApiClient";
import { HttpApiAdapter } from "./HttpApiAdapter"; // your new file

export const apiClient: ApiClient = new HttpApiAdapter(import.meta.env.VITE_API_BASE);
```

`HttpApiAdapter` must implement every method in `ApiClient`. No UI code changes.

---

## Shared utilities

`shared.ts` re-exports path/name helpers (`toRequestName`, `requestPaths`, `ensureRequestDirs`, `findDesignMd`, `readIfExists`) from `../designer/lib/`. The designer **workflow** does not need to have been run — only the shared library files need to be present on disk. Both skills are always installed together by `install.sh`.

---

## Running tests

```bash
cd ~/.claude/skills/design-build
npm test
```
