// shared.ts — re-exports shared utilities from ../designer/lib/.
// design-build does NOT require the full designer workflow — it can build from
// any image source. The designer lib is only needed for these path/name helpers.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const designerLib = resolve(here, "..", "designer", "lib");

if (!existsSync(designerLib)) {
  throw new Error(
    `design-build requires the designer skill's shared utilities at ${designerLib}. ` +
    `Install both via the install.sh in design-build-skills. ` +
    `Note: you do not need to run the designer workflow — only the shared library is needed.`
  );
}

export { toRequestName, requestPaths, ensureRequestDirs } from "../designer/lib/storage.ts";
export { findDesignMd, readIfExists } from "../designer/lib/prompt_prep.ts";
