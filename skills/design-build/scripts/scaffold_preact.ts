import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATE_ROOT = join(here, "..", "templates", "app-shell");

// Destination paths that must NOT clobber an existing file. These are the
// self-describing root docs and ignore file: if the target already has them
// (e.g. the user wrote a DESIGN.md before scaffolding), keep theirs.
const PRESERVE_IF_EXISTS = new Set([
  "DESIGN.md",
  "BUILD.md",
  "COMPONENT_INDEX.md",
  ".gitignore",
]);

export interface ScaffoldOptions {
  targetDir: string;
  appName: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

export async function scaffold(opts: ScaffoldOptions): Promise<void> {
  const files = walk(TEMPLATE_ROOT);
  for (const src of files) {
    const rel = relative(TEMPLATE_ROOT, src);
    const destRel = rel.replace(/\.tmpl$/, "");
    const dest = join(opts.targetDir, destRel);
    if (PRESERVE_IF_EXISTS.has(destRel) && existsSync(dest)) continue;
    mkdirSync(dirname(dest), { recursive: true });
    const content = readFileSync(src, "utf-8").replace(/__APP_NAME__/g, opts.appName);
    writeFileSync(dest, content);
  }
}

const Args = z.object({
  targetDir: z.string().min(1),
  appName: z.string().min(1),
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Args.parse(JSON.parse(process.argv[2] ?? "{}"));
  scaffold(args)
    .then(() => console.log(JSON.stringify({ status: "ok", targetDir: args.targetDir })))
    .catch((err) => {
      console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
      process.exit(1);
    });
}
