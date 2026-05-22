# Design-to-App Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the two-skill design-to-app workflow (`designer` + `design-build`) specified in `docs/specs/2026-04-17-design-to-app-workflow-design.md`, plus a bash installer that ships them from the `design-build-skills` monorepo into `~/.claude/skills/`.

**Architecture:**

Two portable Claude Code skills installed as sibling directories under `~/.claude/skills/`. A shared TypeScript library lives in `designer/lib/` and is imported by `design-build` via relative path. The `designer` skill talks to a Discord bot (owned by the user) that triggers Midjourney's `/imagine` slash command, listens for the reply, and downloads + splits the resulting 2×2 grid. The `design-build` skill consumes images plus an optional extra prompt and scaffolds a Preact + TypeScript + SCSS application with a mandatory mock-data layer. Distribution happens via `install.sh` at the package root, which does a shallow + sparse Git checkout of just `` out of `rw3iss/design-build-skills`.

**Tech Stack:** TypeScript (run via `tsx`), Node 22+, `discord.js` v14, `sharp` for image operations, `zod` for config/arg schemas, `vitest` for unit tests, bash for the installer.

**Commit strategy:** Work proceeds in three commits at logical phase boundaries — (1) distribution layer, (2) `designer` skill, (3) `design-build` skill — not per-task. The first commit (package scaffolding + spec) has already landed.

**Repo URL:** `https://github.com/rw3iss/design-build-skills.git`, package path `.`.

---

## File Structure

### Distribution layer (package root)

| File | Purpose |
|---|---|
| `install.sh` | Main installer. Fetches source, copies skills, installs deps. |
| `uninstall.sh` | Removes installed skill dirs. |
| `update.sh` | Trivial wrapper: `./install.sh --update "$@"`. |
| `VERSION` | Semver string, copied into installed skill dirs. |
| `.gitignore` | `node_modules/`, `.env`, `*.local.json`. |
| `LICENSE` | MIT. |
| `tests/install.test.sh` | Bash test harness for install-script flag behaviors. |

### `skills/designer/` — design-generation skill

| File | Purpose |
|---|---|
| `SKILL.md` | Skill entry point with frontmatter. |
| `package.json` | `discord.js`, `sharp`, `zod`, `tsx`, `vitest`, `dotenv`. |
| `tsconfig.json` | Strict TS, module=`esnext`, target=`es2022`. |
| `README.md` | Setup walkthrough + command reference. |
| `lib/config.ts` | Env + `~/.config/designer/config.json` loader. |
| `lib/config.test.ts` | Vitest tests for config merge logic. |
| `lib/storage.ts` | Request-name kebab-case, path builders, dir creation, metadata JSON. |
| `lib/storage.test.ts` | Vitest tests. |
| `lib/prompt_prep.ts` | Walk-up `DESIGN.md`, merge rules, emit final prompt text. |
| `lib/prompt_prep.test.ts` | Vitest tests against tmp-dir fixtures. |
| `lib/discord_client.ts` | Thin `discord.js` wrapper (login, message wait, attachment download). |
| `lib/midjourney.ts` | MJ-specific: command ID resolver, button `custom_id` → `U/V/R` parsing. |
| `lib/midjourney.test.ts` | Button parsing unit tests (no network). |
| `lib/triggers/Trigger.ts` | Interface for invoking `/imagine` and clicking upscale buttons. |
| `lib/triggers/ManualTrigger.ts` | Prints `/imagine <prompt>` and returns — user pastes into Discord. Default. |
| `lib/triggers/ManualTrigger.test.ts` | Stdout capture test. |
| `lib/triggers/UserTokenTrigger.ts` | **⚠ ToS-gray.** HTTP POST with a user token. Opt-in only. |
| `lib/triggers/UserTokenTrigger.test.ts` | Pure request-body builder tests (no network). |
| `lib/triggers/index.ts` | `createTrigger(config): Trigger` factory. |
| `scripts/setup_check.ts` | Verifies env + Discord connectivity; writes config. |
| `scripts/prepare_prompt.ts` | Thin CLI over `lib/prompt_prep.ts`. |
| `scripts/mj_bot.ts` | Ephemeral bot: `generate` subcommand. |
| `scripts/split_grid.ts` | Cuts 2×2 PNG into four quadrants (also callable as library). |
| `scripts/split_grid.test.ts` | Vitest tests against a fixture grid image. |
| `scripts/upscale.ts` | Click U-buttons on a stored message_id. |
| `scripts/process_raw.ts` | Manual-mode: scan `raw/*.png`, detect grids, split. |
| `vitest.config.ts` | Vitest config. |

### `skills/design-build/` — build-from-images skill

| File | Purpose |
|---|---|
| `SKILL.md` | Skill entry point. |
| `package.json` | `zod`, `tsx`, `vitest`. Imports `../designer/lib/*` at runtime. |
| `tsconfig.json` | Strict TS. |
| `README.md` | Usage + "Integrating a real backend" swap-out guide. |
| `shared.ts` | Re-exports from `../designer/lib/*`; throws a clear error if designer isn't installed. |
| `scripts/select_images.ts` | Resolve `--select 2,4` + folder path → array of absolute image paths. |
| `scripts/select_images.test.ts` | Vitest. |
| `scripts/build_plan.ts` | Walk-up `BUILD.md`, compose `PLAN.md` from inputs. |
| `scripts/build_plan.test.ts` | Vitest. |
| `scripts/scaffold_preact.ts` | Copy templates into target `app/` dir, write `package.json`. |
| `scripts/scaffold_preact.test.ts` | Vitest against tmp dir. |
| `templates/app-shell/` | Deterministic scaffold files (see Task 22). |
| `vitest.config.ts` | Vitest config. |

### `skills/design-build/templates/app-shell/` — scaffold templates

| File | Purpose |
|---|---|
| `package.json.tmpl` | Vite + Preact + oxlint deps; scripts for `dev`/`build`/`lint`. |
| `vite.config.ts.tmpl` | Preact preset. |
| `tsconfig.json.tmpl` | Strict, JSX=`preserve`, preact aliases. |
| `index.html.tmpl` | HTML entry. |
| `config/oxlint.json.tmpl` | Lint config. |
| `src/main.tsx.tmpl` | Preact mount entry. |
| `src/app/App.tsx.tmpl` | Minimal shell with `<Outlet>`/router placeholder. |
| `src/services/api/ApiClient.ts.tmpl` | Empty interface `export interface ApiClient {}`. |
| `src/services/api/index.ts.tmpl` | `export const apiClient: ApiClient = new MockApiAdapter()`. |
| `src/mock/MockApiAdapter.ts.tmpl` | Stub class implementing `ApiClient` with latency helper. |
| `src/mock/data/.gitkeep` | Placeholder so `data/` exists. |
| `styles/_variables.scss.tmpl` | Design tokens (colors, spacing, typography). |
| `styles/_mixins.scss.tmpl` | Responsive helpers, fluid type. |
| `styles/global.scss.tmpl` | Imports + reset + base rules. |
| `styles/_mobile.scss.tmpl` | Mobile media-query entry point. |

---

## Phase 1: Distribution Layer

### Task 1: Package boilerplate

**Files:**
- Create: `VERSION`
- Create: `.gitignore`
- Create: `LICENSE`

- [ ] **Step 1: Write VERSION**

```
0.0.1-alpha
```

- [ ] **Step 2: Write .gitignore**

```
node_modules/
.env
.env.local
*.local.json
.cache/
dist/
.DS_Store
```

- [ ] **Step 3: Write LICENSE (MIT)**

Standard MIT text with copyright `2026 Ryan Weiss`. Copy verbatim from `packages/broken-link-crawler/LICENSE` if present; otherwise use the canonical text at https://opensource.org/license/mit/.

### Task 2: install.sh — argument parsing + preflight

**Files:**
- Create: `install.sh`

- [ ] **Step 1: Write install.sh skeleton with flag parsing**

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${DESIGNER_SKILLS_REPO:-https://github.com/rw3iss/design-build-skills.git}"
REPO_REF="${DESIGNER_SKILLS_REF:-main}"
PACKAGE_PATH="."
CACHE_DIR="${DESIGNER_SKILLS_CACHE:-$HOME/.cache/design-build-skills}"
INSTALL_ROOT="${DESIGNER_SKILLS_INSTALL_ROOT:-$HOME/.claude/skills}"

DRY_RUN=0
UPDATE=0
SKILL_FILTER=""
LOCAL_PATH=""

usage() {
  cat <<EOF
Usage: install.sh [options]
  --update                  Re-fetch and re-install (idempotent)
  --ref <sha|tag|branch>    Pin to a revision (default: \$REPO_REF or main)
  --skill <name>            Only install one of: designer, design-build
  --local <path>            Install from a local checkout (skip git fetch)
  --dry-run                 Print actions without touching disk
  -h, --help                Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --update) UPDATE=1; shift;;
    --ref) REPO_REF="$2"; shift 2;;
    --skill) SKILL_FILTER="$2"; shift 2;;
    --local) LOCAL_PATH="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2;;
  esac
done

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
  else
    eval "$@"
  fi
}

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }
```

- [ ] **Step 2: Add preflight function**

Append to `install.sh`:

```bash
preflight() {
  command -v git >/dev/null || die "git not found (need ≥2.25 for sparse-checkout)"
  command -v node >/dev/null || die "node not found (need ≥22)"
  command -v npm >/dev/null || die "npm not found"
  command -v rsync >/dev/null || die "rsync not found"

  local node_major
  node_major=$(node --version | sed -E 's/^v([0-9]+).*/\1/')
  if [[ "$node_major" -lt 22 ]]; then
    die "node $node_major is too old; need ≥22"
  fi

  local git_minor
  git_minor=$(git --version | awk '{print $3}' | awk -F. '{print $2}')
  if [[ "$git_minor" -lt 25 ]]; then
    warn "git version is older than 2.25; sparse-checkout may misbehave"
  fi

  if [[ -n "$SKILL_FILTER" ]]; then
    case "$SKILL_FILTER" in
      designer|design-build) ;;
      *) die "--skill must be 'designer' or 'design-build' (got: $SKILL_FILTER)";;
    esac
  fi
}

log "preflight checks"
preflight
```

- [ ] **Step 3: Make executable and run --help to verify parsing**

```bash
chmod +x install.sh
install.sh --help
```

Expected: prints usage, exits 0. `--dry-run` alone prints `==> preflight checks` and exits 0.

### Task 3: install.sh — fetch logic

**Files:**
- Modify: `install.sh` (append fetch function)

- [ ] **Step 1: Add fetch_source function**

```bash
fetch_source() {
  if [[ -n "$LOCAL_PATH" ]]; then
    local abs
    abs=$(cd "$LOCAL_PATH" && pwd)
    if [[ -f "$abs/install.sh" && -d "$abs/skills" ]]; then
      SOURCE_DIR="$abs"
    elif [[ -d "$abs/$PACKAGE_PATH/skills" ]]; then
      SOURCE_DIR="$abs/$PACKAGE_PATH"
    else
      die "--local $LOCAL_PATH does not look like the package root or monorepo root"
    fi
    log "using local source: $SOURCE_DIR"
    return
  fi

  if [[ -d "$CACHE_DIR/.git" ]]; then
    if [[ $UPDATE -eq 1 ]]; then
      log "fetching latest for ref $REPO_REF"
      run "git -C '$CACHE_DIR' fetch --depth 1 origin '$REPO_REF'"
      run "git -C '$CACHE_DIR' checkout '$REPO_REF'"
      run "git -C '$CACHE_DIR' reset --hard 'origin/$REPO_REF' 2>/dev/null || true"
    else
      log "cache already present at $CACHE_DIR (use --update to refresh)"
    fi
  else
    log "cloning (sparse) $REPO_URL @ $REPO_REF into $CACHE_DIR"
    run "git clone --depth 1 --filter=blob:none --sparse --branch '$REPO_REF' '$REPO_URL' '$CACHE_DIR'"
    run "git -C '$CACHE_DIR' sparse-checkout set '$PACKAGE_PATH'"
  fi
  SOURCE_DIR="$CACHE_DIR/$PACKAGE_PATH"
  [[ -d "$SOURCE_DIR/skills" ]] || die "source missing $SOURCE_DIR/skills after fetch"
}

log "fetching source"
fetch_source
log "source ready at: $SOURCE_DIR"
```

- [ ] **Step 2: Verify --dry-run prints the clone command**

```bash
install.sh --dry-run
```

Expected: output includes `[dry-run] git clone --depth 1 ...` and `==> source ready at: <cache>/.`.

- [ ] **Step 3: Verify --local .  resolves correctly**

```bash
install.sh --local . --dry-run
```

Expected: skips clone, prints `==> using local source: <abs path>/.`.

Note: at this point `skills/` doesn't exist yet so the `die` at the end of `fetch_source` will fire. That's expected — we're only verifying the preflight + fetch branching. We'll satisfy it in Task 8.

### Task 4: install.sh — copy + deps

**Files:**
- Modify: `install.sh` (append install_skill function)

- [ ] **Step 1: Add install_skill function**

```bash
install_skills() {
  local skills=(designer design-build)
  if [[ -n "$SKILL_FILTER" ]]; then
    skills=("$SKILL_FILTER")
  fi

  for name in "${skills[@]}"; do
    local src="$SOURCE_DIR/skills/$name"
    local dst="$INSTALL_ROOT/$name"

    [[ -d "$src" ]] || die "skill source missing: $src"

    log "installing $name"

    if [[ -d "$dst/node_modules" ]]; then
      run "rm -rf '$dst/node_modules'"
    fi

    run "mkdir -p '$dst'"
    run "rsync -a --delete --exclude node_modules --exclude .env '$src/' '$dst/'"

    if [[ -f "$SOURCE_DIR/VERSION" ]]; then
      run "cp '$SOURCE_DIR/VERSION' '$dst/VERSION'"
    fi

    if [[ $DRY_RUN -eq 0 ]]; then
      if [[ -f "$dst/package-lock.json" ]]; then
        ( cd "$dst" && npm ci --silent )
      else
        ( cd "$dst" && npm install --silent )
      fi
    else
      log "[dry-run] (cd $dst && npm ci || npm install)"
    fi
  done
}

log "installing skills into $INSTALL_ROOT"
install_skills
```

- [ ] **Step 2: Run dry-run to confirm plan**

```bash
install.sh --local . --dry-run
```

Expected output ends with `[dry-run] (cd <install-root>/designer && npm ci || npm install)` for both skills. No real FS changes.

### Task 5: install.sh — post-install messaging

**Files:**
- Modify: `install.sh` (append post_install function)

- [ ] **Step 1: Add post_install**

```bash
post_install() {
  local config="$HOME/.config/designer/config.json"
  printf '\n'
  log "installed skills:"
  for name in designer design-build; do
    if [[ -d "$INSTALL_ROOT/$name" ]]; then
      local v="unknown"
      [[ -f "$INSTALL_ROOT/$name/VERSION" ]] && v=$(cat "$INSTALL_ROOT/$name/VERSION")
      printf '  - %s  (v%s)\n' "$name" "$v"
    fi
  done
  printf '\n'

  if [[ ! -f "$config" ]]; then
    log "first-run setup required — Discord bot not configured yet"
    cat <<EOF

Next steps:
  1. Create a Discord application + bot token at discord.com/developers/applications
     (enable "Message Content Intent" on the Bot tab).
  2. Invite the bot to a Discord server you own (scopes: bot + applications.commands).
     Permissions: Read Messages, Read Message History, Use Application Commands, Send Messages.
  3. Subscribe to Midjourney and invite the Midjourney bot to the same server.
  4. Run:
       node --import tsx ~/.claude/skills/designer/scripts/setup_check.ts
     This will prompt for your bot token + channel ID, discover the Midjourney command
     IDs, and write \$HOME/.config/designer/config.json.

EOF
  else
    log "config present at $config — you're ready to use the designer skill"
    printf 'To re-verify Discord connectivity:\n'
    printf '  node --import tsx ~/.claude/skills/designer/scripts/setup_check.ts\n'
  fi
}

if [[ $DRY_RUN -eq 0 ]]; then
  post_install
fi
```

- [ ] **Step 2: Verify help + dry-run still succeed**

```bash
install.sh --help
install.sh --local . --dry-run
```

Expected: both exit 0, no stack traces, dry-run output is complete.

### Task 6: uninstall.sh

**Files:**
- Create: `uninstall.sh`

- [ ] **Step 1: Write uninstall.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${DESIGNER_SKILLS_INSTALL_ROOT:-$HOME/.claude/skills}"
CACHE_DIR="${DESIGNER_SKILLS_CACHE:-$HOME/.cache/design-build-skills}"
CONFIG="$HOME/.config/designer/config.json"

PURGE=0
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge) PURGE=1; shift;;
    -y|--yes) YES=1; shift;;
    -h|--help) echo "Usage: uninstall.sh [--purge] [-y]"; exit 0;;
    *) echo "Unknown arg: $1" >&2; exit 2;;
  esac
done

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }

for name in designer design-build; do
  dst="$INSTALL_ROOT/$name"
  if [[ -d "$dst" ]]; then
    log "removing $dst"
    rm -rf "$dst"
  fi
done

if [[ -f "$CONFIG" ]]; then
  if [[ $YES -eq 1 ]]; then
    rm -f "$CONFIG"
    log "removed $CONFIG"
  else
    read -rp "Remove Discord config at $CONFIG? [y/N] " ans
    if [[ "$ans" =~ ^[Yy] ]]; then
      rm -f "$CONFIG"
      log "removed $CONFIG"
    else
      log "kept $CONFIG"
    fi
  fi
fi

if [[ $PURGE -eq 1 && -d "$CACHE_DIR" ]]; then
  log "purging cache $CACHE_DIR"
  rm -rf "$CACHE_DIR"
fi

log "uninstall complete"
```

- [ ] **Step 2: chmod +x and run --help**

```bash
chmod +x uninstall.sh
uninstall.sh --help
```

Expected: prints usage, exits 0.

### Task 7: update.sh shortcut

**Files:**
- Create: `update.sh`

- [ ] **Step 1: Write update.sh**

```bash
#!/usr/bin/env bash
exec "$(dirname "$0")/install.sh" --update "$@"
```

- [ ] **Step 2: chmod +x**

```bash
chmod +x update.sh
```

### Task 8: install.sh test harness

**Files:**
- Create: `tests/install.test.sh`

- [ ] **Step 1: Write tests/install.test.sh**

```bash
#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")/.."

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# 1. --help exits 0 and mentions expected flags
out=$(./install.sh --help 2>&1)
echo "$out" | grep -q -- "--dry-run" || fail "help missing --dry-run"
echo "$out" | grep -q -- "--skill" || fail "help missing --skill"
pass "install.sh --help"

# 2. --dry-run on a missing skills dir dies with clear message
tmp=$(mktemp -d)
out=$(./install.sh --local "$tmp" --dry-run 2>&1 || true)
echo "$out" | grep -q "does not look like the package root" || fail "missing skills/ should be rejected"
pass "install.sh rejects invalid --local path"
rm -rf "$tmp"

# 3. --skill foo is rejected
out=$(./install.sh --skill foo --dry-run 2>&1 || true)
echo "$out" | grep -q "must be 'designer' or 'design-build'" || fail "invalid --skill not rejected"
pass "install.sh rejects invalid --skill"

# 4. uninstall.sh --help works
out=$(./uninstall.sh --help 2>&1)
echo "$out" | grep -q -- "--purge" || fail "uninstall help missing --purge"
pass "uninstall.sh --help"

echo
echo "all install-script tests passed"
```

- [ ] **Step 2: chmod +x and run**

```bash
chmod +x tests/install.test.sh
tests/install.test.sh
```

Expected: 4 PASS lines, exit 0.

### Task 9: Commit distribution layer

- [ ] **Step 1: Stage + commit**

```bash
cd /home/rw3iss/Sites/ven/new/tools/ven-tools
git add VERSION \
        .gitignore \
        LICENSE \
        install.sh \
        uninstall.sh \
        update.sh \
        tests/

git commit -m "$(cat <<'EOF'
feat(design-and-build-skills): add distribution layer

- install.sh with shallow+sparse clone of .
  out of rw3iss/design-build-skills, idempotent re-install, --update/--ref/--skill/
  --local/--dry-run flags, config-preserving behavior
- uninstall.sh with --purge cache flag and interactive config removal
- update.sh shortcut aliasing install.sh --update
- tests/install.test.sh covers flag validation and error paths
- VERSION (0.0.1-alpha), .gitignore, LICENSE

Skills subtree comes in a follow-up commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: `designer` Skill

### Task 10: designer package + tsconfig + vitest

**Files:**
- Create: `skills/designer/package.json`
- Create: `skills/designer/tsconfig.json`
- Create: `skills/designer/vitest.config.ts`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "designer",
  "version": "0.0.1-alpha",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "dependencies": {
    "discord.js": "^14.16.3",
    "sharp": "^0.33.5",
    "zod": "^3.23.8",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8",
    "@types/node": "^22.10.2"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "lib": ["es2022"],
    "types": ["node"]
  },
  "include": ["lib/**/*.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 3: Write vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Run npm install**

```bash
cd skills/designer && npm install
```

Expected: `package-lock.json` created, `node_modules/` populated, no errors.

### Task 11: lib/storage.ts

**Files:**
- Create: `skills/designer/lib/storage.ts`
- Create: `skills/designer/lib/storage.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/storage.test.ts
import { describe, it, expect } from "vitest";
import { toRequestName, requestPaths } from "./storage.ts";

describe("toRequestName", () => {
  it("kebab-cases input", () => {
    expect(toRequestName("Login Form Glass")).toBe("login-form-glass");
  });
  it("strips punctuation and collapses whitespace", () => {
    expect(toRequestName("  Check-Out!!  (v2)  ")).toBe("check-out-v2");
  });
  it("truncates to 60 chars", () => {
    expect(toRequestName("a ".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe("requestPaths", () => {
  it("produces the flat designs/<name>/ layout", () => {
    const p = requestPaths("/tmp/proj", "login-form");
    expect(p.root).toBe("/tmp/proj/designs/login-form");
    expect(p.prompts).toBe("/tmp/proj/designs/login-form/prompts");
    expect(p.raw).toBe("/tmp/proj/designs/login-form/raw");
    expect(p.images).toBe("/tmp/proj/designs/login-form/images");
    expect(p.app).toBe("/tmp/proj/designs/login-form/app");
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd skills/designer && npx vitest run lib/storage.test.ts
```

Expected: FAIL with "Cannot find module './storage.ts'".

- [ ] **Step 3: Write storage.ts**

```typescript
// lib/storage.ts
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export function toRequestName(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 60);
}

export interface RequestPaths {
  root: string;
  prompts: string;
  raw: string;
  images: string;
  app: string;
}

export function requestPaths(projectCwd: string, name: string): RequestPaths {
  const root = join(resolve(projectCwd), "designs", name);
  return {
    root,
    prompts: join(root, "prompts"),
    raw: join(root, "raw"),
    images: join(root, "images"),
    app: join(root, "app"),
  };
}

export function ensureRequestDirs(paths: RequestPaths): void {
  for (const p of [paths.root, paths.prompts, paths.raw, paths.images]) {
    mkdirSync(p, { recursive: true });
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
npx vitest run lib/storage.test.ts
```

Expected: 2 passing suites, 5 tests.

### Task 12: lib/config.ts

**Files:**
- Create: `skills/designer/lib/config.ts`
- Create: `skills/designer/lib/config.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/config.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.ts";

function withTmp<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "designer-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe("loadConfig", () => {
  it("reads from a config file", () => {
    withTmp((dir) => {
      const file = join(dir, "config.json");
      writeFileSync(file, JSON.stringify({
        discordBotToken: "Bot abc",
        discordChannelId: "123",
        discordGuildId: "456",
      }));
      const cfg = loadConfig({ configPath: file });
      expect(cfg.discordBotToken).toBe("Bot abc");
      expect(cfg.discordChannelId).toBe("123");
    });
  });

  it("env vars override file values", () => {
    withTmp((dir) => {
      const file = join(dir, "config.json");
      writeFileSync(file, JSON.stringify({
        discordBotToken: "Bot file",
        discordChannelId: "ch-file",
        discordGuildId: "g-file",
      }));
      const cfg = loadConfig({
        configPath: file,
        env: { DESIGNER_DISCORD_TOKEN: "Bot env" },
      });
      expect(cfg.discordBotToken).toBe("Bot env");
      expect(cfg.discordChannelId).toBe("ch-file");
    });
  });

  it("throws with a useful message when required fields missing", () => {
    withTmp((dir) => {
      const file = join(dir, "config.json");
      writeFileSync(file, "{}");
      expect(() => loadConfig({ configPath: file, env: {} }))
        .toThrow(/discordBotToken/);
    });
  });

  it("defaults triggerMode to 'manual'", () => {
    withTmp((dir) => {
      const file = join(dir, "config.json");
      writeFileSync(file, JSON.stringify({
        discordBotToken: "Bot x", discordChannelId: "c", discordGuildId: "g",
      }));
      const cfg = loadConfig({ configPath: file, env: {} });
      expect(cfg.triggerMode).toBe("manual");
    });
  });

  it("rejects triggerMode='user-token' without discordUserToken", () => {
    withTmp((dir) => {
      const file = join(dir, "config.json");
      writeFileSync(file, JSON.stringify({
        discordBotToken: "Bot x", discordChannelId: "c", discordGuildId: "g",
        triggerMode: "user-token",
      }));
      expect(() => loadConfig({ configPath: file, env: {} }))
        .toThrow(/discordUserToken/);
    });
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npx vitest run lib/config.test.ts
```

Expected: FAIL ("Cannot find module './config.ts'").

- [ ] **Step 3: Write config.ts**

```typescript
// lib/config.ts
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const ConfigSchema = z.object({
  discordBotToken: z.string().min(1),
  discordChannelId: z.string().min(1),
  discordGuildId: z.string().min(1),
  midjourneyAppId: z.string().optional(),
  midjourneyImagineCommandId: z.string().optional(),
  triggerMode: z.enum(["manual", "user-token"]).default("manual"),
  discordUserToken: z.string().optional(),
}).refine(
  (v) => v.triggerMode !== "user-token" || Boolean(v.discordUserToken),
  { message: "triggerMode='user-token' requires discordUserToken" }
);

export type Config = z.infer<typeof ConfigSchema>;

export interface LoadOptions {
  configPath?: string;
  env?: Record<string, string | undefined>;
}

export function defaultConfigPath(): string {
  return join(homedir(), ".config", "designer", "config.json");
}

export function loadConfig(opts: LoadOptions = {}): Config {
  const configPath = opts.configPath ?? defaultConfigPath();
  const env = opts.env ?? process.env;

  let fileData: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    fileData = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  const merged = {
    discordBotToken: env.DESIGNER_DISCORD_TOKEN ?? fileData.discordBotToken,
    discordChannelId: env.DESIGNER_DISCORD_CHANNEL_ID ?? fileData.discordChannelId,
    discordGuildId: env.DESIGNER_DISCORD_GUILD_ID ?? fileData.discordGuildId,
    midjourneyAppId: env.DESIGNER_MJ_APP_ID ?? fileData.midjourneyAppId,
    midjourneyImagineCommandId:
      env.DESIGNER_MJ_IMAGINE_ID ?? fileData.midjourneyImagineCommandId,
    triggerMode: env.DESIGNER_TRIGGER_MODE ?? fileData.triggerMode ?? "manual",
    discordUserToken: env.DESIGNER_DISCORD_USER_TOKEN ?? fileData.discordUserToken,
  };

  return ConfigSchema.parse(merged);
}

export function writeConfig(cfg: Config, path: string = defaultConfigPath()): void {
  const { mkdirSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
  const { dirname } = require("node:path") as typeof import("node:path");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, 2));
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run lib/config.test.ts
```

Expected: 3 passing tests.

### Task 13: lib/prompt_prep.ts

**Files:**
- Create: `skills/designer/lib/prompt_prep.ts`
- Create: `skills/designer/lib/prompt_prep.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/prompt_prep.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findDesignMd, assemblePrompt } from "./prompt_prep.ts";

function withTmpTree<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "prompt-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

describe("findDesignMd", () => {
  it("finds DESIGN.md in the current directory", () => {
    withTmpTree((root) => {
      writeFileSync(join(root, "DESIGN.md"), "# rules");
      expect(findDesignMd(root)).toBe(join(root, "DESIGN.md"));
    });
  });

  it("walks up to find DESIGN.md in a parent", () => {
    withTmpTree((root) => {
      mkdirSync(join(root, ".git"), { recursive: true });
      writeFileSync(join(root, "DESIGN.md"), "# rules");
      const nested = join(root, "packages", "x");
      mkdirSync(nested, { recursive: true });
      expect(findDesignMd(nested)).toBe(join(root, "DESIGN.md"));
    });
  });

  it("stops at a .git boundary", () => {
    withTmpTree((root) => {
      writeFileSync(join(root, "DESIGN.md"), "# outer");
      const inner = join(root, "sub");
      mkdirSync(join(inner, ".git"), { recursive: true });
      writeFileSync(join(inner, "other.txt"), "");
      expect(findDesignMd(inner)).toBeNull();
    });
  });

  it("returns null when nothing found", () => {
    withTmpTree((root) => {
      expect(findDesignMd(root)).toBeNull();
    });
  });
});

describe("assemblePrompt", () => {
  it("appends MJ flags and preserves original brief", () => {
    const result = assemblePrompt({
      brief: "a glassy login form with hero gradient",
      designRules: null,
      aspectRatio: "3:2",
      version: "6.1",
      style: "raw",
    });
    expect(result.promptMd).toContain("a glassy login form");
    expect(result.imaginePrompt).toContain("--ar 3:2");
    expect(result.imaginePrompt).toContain("--v 6.1");
    expect(result.imaginePrompt).toContain("--style raw");
  });

  it("includes DESIGN.md rules when provided", () => {
    const result = assemblePrompt({
      brief: "a login form",
      designRules: "# Project rules\nUse violet accents only.",
      aspectRatio: "3:2",
      version: "6.1",
      style: "raw",
    });
    expect(result.promptMd).toContain("violet accents");
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
npx vitest run lib/prompt_prep.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write prompt_prep.ts**

```typescript
// lib/prompt_prep.ts
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, parse } from "node:path";

export function findDesignMd(startDir: string, filename = "DESIGN.md"): string | null {
  let dir = resolve(startDir);
  const { root } = parse(dir);
  while (true) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
    if (existsSync(join(dir, ".git"))) return null;
    if (dir === root) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export interface PromptInputs {
  brief: string;
  designRules: string | null;
  aspectRatio: string;
  version: string;
  style: string;
}

export interface PreparedPrompt {
  promptMd: string;
  imaginePrompt: string;
}

export function assemblePrompt(inputs: PromptInputs): PreparedPrompt {
  const sections: string[] = [];
  sections.push("# Brief\n\n" + inputs.brief.trim());
  if (inputs.designRules) {
    sections.push("# Project rules (from DESIGN.md)\n\n" + inputs.designRules.trim());
  }
  sections.push(
    "# Midjourney flags\n\n" +
      `--ar ${inputs.aspectRatio}  --v ${inputs.version}  --style ${inputs.style}`
  );
  const promptMd = sections.join("\n\n");

  const briefOneLine = inputs.brief.replace(/\s+/g, " ").trim();
  const rulesOneLine = inputs.designRules
    ? " | " + inputs.designRules.replace(/\s+/g, " ").trim().slice(0, 400)
    : "";
  const imaginePrompt = `${briefOneLine}${rulesOneLine} --ar ${inputs.aspectRatio} --v ${inputs.version} --style ${inputs.style}`;

  return { promptMd, imaginePrompt };
}

export function readIfExists(path: string | null): string | null {
  if (!path) return null;
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/prompt_prep.test.ts
```

Expected: 6 passing tests.

### Task 14: lib/midjourney.ts (button parsing)

**Files:**
- Create: `skills/designer/lib/midjourney.ts`
- Create: `skills/designer/lib/midjourney.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/midjourney.test.ts
import { describe, it, expect } from "vitest";
import { parseButtonLabel, extractUButtons } from "./midjourney.ts";

describe("parseButtonLabel", () => {
  it("parses U1/U2/U3/U4", () => {
    expect(parseButtonLabel("U1")).toEqual({ kind: "upscale", index: 1 });
    expect(parseButtonLabel("U4")).toEqual({ kind: "upscale", index: 4 });
  });
  it("parses V1..V4", () => {
    expect(parseButtonLabel("V2")).toEqual({ kind: "variation", index: 2 });
  });
  it("parses redo", () => {
    expect(parseButtonLabel("🔄")).toEqual({ kind: "redo", index: 0 });
  });
  it("returns null for unknown labels", () => {
    expect(parseButtonLabel("wut")).toBeNull();
  });
});

describe("extractUButtons", () => {
  it("flattens action-row components into { index -> custom_id } for U1..U4", () => {
    const components = [
      {
        type: 1,
        components: [
          { type: 2, label: "U1", custom_id: "MJ::JOB::upsample::1::abc" },
          { type: 2, label: "U2", custom_id: "MJ::JOB::upsample::2::abc" },
          { type: 2, label: "U3", custom_id: "MJ::JOB::upsample::3::abc" },
          { type: 2, label: "U4", custom_id: "MJ::JOB::upsample::4::abc" },
        ],
      },
      {
        type: 1,
        components: [
          { type: 2, label: "🔄", custom_id: "MJ::JOB::reroll::0::abc" },
        ],
      },
    ];
    expect(extractUButtons(components)).toEqual({
      1: "MJ::JOB::upsample::1::abc",
      2: "MJ::JOB::upsample::2::abc",
      3: "MJ::JOB::upsample::3::abc",
      4: "MJ::JOB::upsample::4::abc",
    });
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npx vitest run lib/midjourney.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write midjourney.ts**

```typescript
// lib/midjourney.ts

export type ButtonKind = "upscale" | "variation" | "redo";

export interface ParsedButton {
  kind: ButtonKind;
  index: number;
}

export function parseButtonLabel(label: string): ParsedButton | null {
  const m = label.match(/^([UV])([1-4])$/);
  if (m) {
    return {
      kind: m[1] === "U" ? "upscale" : "variation",
      index: Number(m[2]),
    };
  }
  if (label === "🔄" || label === "Redo" || label === "redo") {
    return { kind: "redo", index: 0 };
  }
  return null;
}

interface ActionRow { type: 1; components: ButtonComponent[]; }
interface ButtonComponent { type: 2; label?: string; custom_id?: string; }
type MessageComponents = Array<ActionRow | unknown>;

export function extractUButtons(components: MessageComponents): Record<1|2|3|4, string> {
  const out: Partial<Record<1|2|3|4, string>> = {};
  for (const row of components) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as ActionRow;
    if (r.type !== 1 || !Array.isArray(r.components)) continue;
    for (const c of r.components) {
      if (c.type !== 2 || !c.label || !c.custom_id) continue;
      const parsed = parseButtonLabel(c.label);
      if (parsed?.kind === "upscale" && parsed.index >= 1 && parsed.index <= 4) {
        out[parsed.index as 1|2|3|4] = c.custom_id;
      }
    }
  }
  return out as Record<1|2|3|4, string>;
}

export const MIDJOURNEY_IMAGINE_COMMAND_NAME = "imagine";
```

- [ ] **Step 4: Verify pass**

```bash
npx vitest run lib/midjourney.test.ts
```

Expected: 5 passing tests.

### Task 15: lib/discord_client.ts

**Files:**
- Create: `skills/designer/lib/discord_client.ts`

No unit tests — this is pure network I/O. Verified via `setup_check.ts` in Task 16.

- [ ] **Step 1: Write discord_client.ts**

```typescript
// lib/discord_client.ts
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  TextChannel,
  Message,
  type APIMessage,
} from "discord.js";
import { writeFileSync } from "node:fs";
import { fetch } from "undici";

export interface ConnectedClient {
  client: Client;
  channel: TextChannel;
  close: () => Promise<void>;
}

export async function connect(token: string, channelId: string): Promise<ConnectedClient> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  await new Promise<void>((res, rej) => {
    client.once(Events.ClientReady, () => res());
    client.once(Events.Error, rej);
    client.login(token).catch(rej);
  });

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased() || !(channel instanceof TextChannel)) {
    await client.destroy();
    throw new Error(`channel ${channelId} is not a text channel or is not accessible`);
  }

  return {
    client,
    channel,
    close: async () => { await client.destroy(); },
  };
}

export interface MessageMatcher {
  (msg: Message): boolean;
}

export async function waitForMessage(
  channel: TextChannel,
  matcher: MessageMatcher,
  timeoutMs: number
): Promise<Message> {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      channel.client.off(Events.MessageCreate, onMsg);
      rej(new Error(`timeout after ${timeoutMs}ms waiting for matching message`));
    }, timeoutMs);

    const onMsg = (msg: Message) => {
      if (msg.channelId !== channel.id) return;
      if (!matcher(msg)) return;
      clearTimeout(timer);
      channel.client.off(Events.MessageCreate, onMsg);
      res(msg);
    };
    channel.client.on(Events.MessageCreate, onMsg);
  });
}

export async function downloadAttachment(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
}

```

`clickButton` lives in `lib/triggers/UserTokenTrigger.ts`, not here — this module is only responsible for connect/wait/download. See Task 15c.

- [ ] **Step 2: Install undici**

```bash
cd skills/designer && npm install undici
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

### Task 15a: lib/triggers/Trigger.ts (interface)

**Files:**
- Create: `skills/designer/lib/triggers/Trigger.ts`

- [ ] **Step 1: Write the interface**

```typescript
// lib/triggers/Trigger.ts

export interface TriggerImagineArgs {
  prompt: string;
  applicationId: string;
  imagineCommandId: string;
  channelId: string;
  guildId: string;
}

export interface ClickButtonArgs {
  messageId: string;
  customId: string;
  applicationId: string;
  channelId: string;
  guildId: string;
}

export interface Trigger {
  /** Kick off /imagine. For manual mode, this prints the command and resolves
   *  immediately; the caller's wait-for-reply listener does the rest. */
  triggerImagine(args: TriggerImagineArgs): Promise<void>;

  /** Click a U-button on an existing message. Manual mode prints instructions. */
  clickButton(args: ClickButtonArgs): Promise<void>;

  /** Label used in logging / setup_check. */
  readonly mode: "manual" | "user-token";
}
```

### Task 15b: lib/triggers/ManualTrigger.ts + tests

**Files:**
- Create: `skills/designer/lib/triggers/ManualTrigger.ts`
- Create: `skills/designer/lib/triggers/ManualTrigger.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/triggers/ManualTrigger.test.ts
import { describe, it, expect, vi } from "vitest";
import { ManualTrigger } from "./ManualTrigger.ts";

describe("ManualTrigger", () => {
  it("writes the /imagine line to stderr and resolves", async () => {
    const errs: string[] = [];
    const t = new ManualTrigger({ write: (s) => { errs.push(s); } });
    await t.triggerImagine({
      prompt: "a glassy login form",
      applicationId: "mj", imagineCommandId: "cmd",
      channelId: "c", guildId: "g",
    });
    expect(errs.join("")).toContain("/imagine a glassy login form");
    expect(errs.join("")).toContain("paste this");
  });

  it("writes click instructions to stderr and resolves", async () => {
    const errs: string[] = [];
    const t = new ManualTrigger({ write: (s) => { errs.push(s); } });
    await t.clickButton({
      messageId: "123", customId: "MJ::JOB::upsample::2::x",
      applicationId: "mj", channelId: "c", guildId: "g",
    });
    expect(errs.join("")).toContain("click U2");
  });

  it("reports mode = 'manual'", () => {
    const t = new ManualTrigger();
    expect(t.mode).toBe("manual");
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
cd skills/designer
npx vitest run lib/triggers/ManualTrigger.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write ManualTrigger.ts**

```typescript
// lib/triggers/ManualTrigger.ts
import type { Trigger, TriggerImagineArgs, ClickButtonArgs } from "./Trigger.ts";

export interface ManualTriggerOptions {
  write?: (line: string) => void;
}

export class ManualTrigger implements Trigger {
  readonly mode = "manual" as const;
  private write: (line: string) => void;

  constructor(opts: ManualTriggerOptions = {}) {
    this.write = opts.write ?? ((s: string) => process.stderr.write(s));
  }

  async triggerImagine(args: TriggerImagineArgs): Promise<void> {
    this.write("\n");
    this.write("==> manual trigger — paste this into Discord now:\n");
    this.write("    /imagine " + args.prompt + "\n");
    this.write("    (listening for Midjourney's reply…)\n\n");
  }

  async clickButton(args: ClickButtonArgs): Promise<void> {
    const m = args.customId.match(/upsample::([1-4])/);
    const which = m ? `U${m[1]}` : "the relevant button";
    this.write("\n");
    this.write(`==> manual trigger — click ${which} on Midjourney's message in Discord\n`);
    this.write("    (listening for the upscale reply…)\n\n");
  }
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run lib/triggers/ManualTrigger.test.ts
```

Expected: 3 passing tests.

### Task 15c: lib/triggers/UserTokenTrigger.ts + index.ts + tests

**Files:**
- Create: `skills/designer/lib/triggers/UserTokenTrigger.ts`
- Create: `skills/designer/lib/triggers/UserTokenTrigger.test.ts`
- Create: `skills/designer/lib/triggers/index.ts`

- [ ] **Step 1: Write failing tests (pure body builders, no network)**

```typescript
// lib/triggers/UserTokenTrigger.test.ts
import { describe, it, expect } from "vitest";
import { buildImagineBody, buildButtonClickBody } from "./UserTokenTrigger.ts";

describe("buildImagineBody", () => {
  it("produces a type=2 application command interaction payload", () => {
    const body = buildImagineBody({
      prompt: "glassy login",
      applicationId: "mj-app", imagineCommandId: "cmd-xyz",
      channelId: "ch1", guildId: "g1",
    }, "session-abc");
    expect(body).toMatchObject({
      type: 2,
      application_id: "mj-app",
      channel_id: "ch1",
      guild_id: "g1",
      session_id: "session-abc",
    });
    expect(body.data.name).toBe("imagine");
    expect(body.data.options[0]).toEqual({ type: 3, name: "prompt", value: "glassy login" });
  });
});

describe("buildButtonClickBody", () => {
  it("produces a type=3 component interaction payload", () => {
    const body = buildButtonClickBody({
      messageId: "m1", customId: "cid",
      applicationId: "mj-app", channelId: "ch1", guildId: "g1",
    }, "session-abc");
    expect(body).toMatchObject({
      type: 3,
      application_id: "mj-app",
      channel_id: "ch1",
      guild_id: "g1",
      message_id: "m1",
      session_id: "session-abc",
    });
    expect(body.data).toEqual({ component_type: 2, custom_id: "cid" });
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npx vitest run lib/triggers/UserTokenTrigger.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write UserTokenTrigger.ts**

```typescript
// lib/triggers/UserTokenTrigger.ts
//
// ⚠ WARNING: Uses a Discord USER token (not a bot token).
// Automating a user account is explicitly prohibited by Discord's Terms of
// Service and can result in account termination. This module exists because
// the user has opted in knowing the risk. Do NOT enable triggerMode=user-token
// without explicit consent from the account holder.
//
import type { Trigger, TriggerImagineArgs, ClickButtonArgs } from "./Trigger.ts";
import { fetch } from "undici";

const INTERACTIONS_URL = "https://discord.com/api/v10/interactions";

export function buildImagineBody(args: TriggerImagineArgs, sessionId: string) {
  return {
    type: 2,
    application_id: args.applicationId,
    guild_id: args.guildId,
    channel_id: args.channelId,
    session_id: sessionId,
    data: {
      version: args.imagineCommandId,
      id: args.imagineCommandId,
      name: "imagine",
      type: 1,
      options: [{ type: 3, name: "prompt", value: args.prompt }],
      application_command: {
        id: args.imagineCommandId,
        application_id: args.applicationId,
        name: "imagine",
        type: 1,
      },
      attachments: [],
    },
  };
}

export function buildButtonClickBody(args: ClickButtonArgs, sessionId: string) {
  return {
    type: 3,
    application_id: args.applicationId,
    guild_id: args.guildId,
    channel_id: args.channelId,
    message_id: args.messageId,
    session_id: sessionId,
    data: { component_type: 2, custom_id: args.customId },
  };
}

export interface UserTokenTriggerOptions {
  userToken: string;
  sessionIdFactory?: () => string;
}

export class UserTokenTrigger implements Trigger {
  readonly mode = "user-token" as const;
  private userToken: string;
  private sessionIdFactory: () => string;

  constructor(opts: UserTokenTriggerOptions) {
    if (!opts.userToken || opts.userToken.startsWith("Bot ")) {
      throw new Error("UserTokenTrigger requires a user token (not a bot token)");
    }
    this.userToken = opts.userToken;
    this.sessionIdFactory = opts.sessionIdFactory ?? (() => Math.random().toString(36).slice(2));
  }

  private async post(body: unknown): Promise<void> {
    const res = await fetch(INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.userToken,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `interaction POST failed: ${res.status} ${text.slice(0, 500)} ` +
        `(if this is 401/403, Discord rejected the user token — the account may have been flagged; ` +
        `fall back to triggerMode='manual')`
      );
    }
  }

  async triggerImagine(args: TriggerImagineArgs): Promise<void> {
    await this.post(buildImagineBody(args, this.sessionIdFactory()));
  }

  async clickButton(args: ClickButtonArgs): Promise<void> {
    await this.post(buildButtonClickBody(args, this.sessionIdFactory()));
  }
}
```

- [ ] **Step 4: Write index.ts**

```typescript
// lib/triggers/index.ts
import type { Config } from "../config.ts";
import type { Trigger } from "./Trigger.ts";
import { ManualTrigger } from "./ManualTrigger.ts";
import { UserTokenTrigger } from "./UserTokenTrigger.ts";

export type { Trigger, TriggerImagineArgs, ClickButtonArgs } from "./Trigger.ts";

export function createTrigger(cfg: Config): Trigger {
  if (cfg.triggerMode === "user-token") {
    if (!cfg.discordUserToken) {
      throw new Error("triggerMode='user-token' but discordUserToken missing");
    }
    return new UserTokenTrigger({ userToken: cfg.discordUserToken });
  }
  return new ManualTrigger();
}
```

- [ ] **Step 5: Run, verify pass**

```bash
npx vitest run lib/triggers/
```

Expected: all trigger tests pass.

### Task 16: scripts/setup_check.ts

**Files:**
- Create: `skills/designer/scripts/setup_check.ts`

No unit test — live Discord interaction. Manual verification at end of task.

- [ ] **Step 1: Write setup_check.ts**

```typescript
#!/usr/bin/env -S node --import tsx
// scripts/setup_check.ts
import { connect } from "../lib/discord_client.ts";
import { loadConfig, writeConfig, defaultConfigPath, type Config } from "../lib/config.ts";
import { existsSync, readFileSync } from "node:fs";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fetch } from "undici";

const MJ_BOT_IDS = ["936929561302675456"]; // historically-stable Midjourney bot ID

async function prompt(rl: readline.Interface, label: string, existing?: string): Promise<string> {
  const suffix = existing ? ` [${existing.slice(0, 6)}…]` : "";
  const ans = (await rl.question(`${label}${suffix}: `)).trim();
  return ans || existing || "";
}

async function main() {
  const cfgPath = defaultConfigPath();
  let existing: Partial<Config> = {};
  if (existsSync(cfgPath)) {
    try { existing = JSON.parse(readFileSync(cfgPath, "utf-8")); } catch {}
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const token = await prompt(rl, "Discord bot token", existing.discordBotToken);
  const guild = await prompt(rl, "Discord guild (server) ID", existing.discordGuildId);
  const channel = await prompt(rl, "Discord channel ID (where Midjourney lives)", existing.discordChannelId);

  console.error(`\nTrigger mode:`);
  console.error(`  1) manual     — you paste /imagine into Discord yourself (safe, default)`);
  console.error(`  2) user-token — bot invokes /imagine via your Discord user token (AUTOMATED)`);
  console.error(`                  WARNING: using a user token programmatically violates Discord's`);
  console.error(`                  Terms of Service and can get your personal Discord account banned.`);
  console.error(`                  The risk applies to your whole Discord identity across all servers.`);
  const modeChoice = await prompt(rl, "Pick 1 or 2", existing.triggerMode === "user-token" ? "2" : "1");
  const triggerMode = modeChoice.trim() === "2" ? "user-token" : "manual";

  let userToken: string | undefined = existing.discordUserToken;
  if (triggerMode === "user-token") {
    console.error("\nYou have chosen 'user-token' mode. Confirm by typing: I ACCEPT THE TOS RISK");
    const ack = (await rl.question("> ")).trim();
    if (ack !== "I ACCEPT THE TOS RISK") {
      console.error("acknowledgment not given — aborting (config unchanged)");
      rl.close();
      process.exit(1);
    }
    const nextUserToken = await prompt(rl, "Discord user token (from browser DevTools → localStorage → token)", userToken);
    if (!nextUserToken) {
      console.error("user token required for user-token mode");
      rl.close();
      process.exit(1);
    }
    if (nextUserToken.startsWith("Bot ")) {
      console.error("that looks like a bot token — user tokens don't have a 'Bot ' prefix");
      rl.close();
      process.exit(1);
    }
    userToken = nextUserToken;
  }
  rl.close();

  if (!token || !guild || !channel) {
    console.error("bot token, guild, and channel are all required");
    process.exit(1);
  }

  console.error("\nconnecting to Discord…");
  const { client, channel: ch, close } = await connect(token, channel);
  try {
    console.error(`  ✓ connected as ${client.user?.tag}`);

    const members = await ch.guild.members.fetch({ user: MJ_BOT_IDS });
    if (members.size === 0) {
      throw new Error("Midjourney bot not found in this guild. Invite it first (docs.midjourney.com).");
    }
    console.error("  ✓ Midjourney bot is in the server");

    // Resolve /imagine command ID via HTTP (guild-scoped or global)
    const res = await fetch(
      `https://discord.com/api/v10/applications/${MJ_BOT_IDS[0]}/commands`,
      { headers: { Authorization: token } }
    );
    if (!res.ok) {
      throw new Error(`could not fetch Midjourney commands (HTTP ${res.status})`);
    }
    const cmds = (await res.json()) as Array<{ id: string; name: string }>;
    const imagine = cmds.find((c) => c.name === "imagine");
    if (!imagine) {
      throw new Error("could not find Midjourney's /imagine command");
    }
    console.error(`  ✓ resolved /imagine command id: ${imagine.id}`);

    const cfg: Config = {
      discordBotToken: token,
      discordChannelId: channel,
      discordGuildId: guild,
      midjourneyAppId: MJ_BOT_IDS[0],
      midjourneyImagineCommandId: imagine.id,
      triggerMode,
      discordUserToken: userToken,
    };
    writeConfig(cfg, cfgPath);
    console.error(`\n  ✓ config saved to ${cfgPath}`);
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error("\n[setup_check failed]");
  console.error(err?.message ?? err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

```bash
cd skills/designer && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Document manual test in README**

Running against live Discord is out of scope for the implementation task; the user will verify after setup in the end-to-end phase.

### Task 17: scripts/split_grid.ts

**Files:**
- Create: `skills/designer/scripts/split_grid.ts`
- Create: `skills/designer/scripts/split_grid.test.ts`
- Create: `skills/designer/scripts/fixtures/grid-512.png` (test fixture — 512×512 solid-color quadrants)

- [ ] **Step 1: Generate fixture PNG**

Create a 512×512 PNG with four solid-color 256×256 quadrants (red TL, green TR, blue BL, yellow BR) using a small one-off script:

```bash
cd skills/designer
mkdir -p scripts/fixtures
node -e '
const sharp = require("sharp");
const quad = (r,g,b) => Buffer.from(Array(256*256).fill([r,g,b,255]).flat());
async function main() {
  const tl = await sharp(quad(255,0,0), { raw: { width:256, height:256, channels:4 }}).png().toBuffer();
  const tr = await sharp(quad(0,255,0), { raw: { width:256, height:256, channels:4 }}).png().toBuffer();
  const bl = await sharp(quad(0,0,255), { raw: { width:256, height:256, channels:4 }}).png().toBuffer();
  const br = await sharp(quad(255,255,0), { raw: { width:256, height:256, channels:4 }}).png().toBuffer();
  await sharp({ create: { width:512, height:512, channels:4, background:{r:0,g:0,b:0,alpha:1}}})
    .composite([
      { input: tl, left:0, top:0 },
      { input: tr, left:256, top:0 },
      { input: bl, left:0, top:256 },
      { input: br, left:256, top:256 },
    ])
    .png()
    .toFile("scripts/fixtures/grid-512.png");
}
main();
'
```

Expected: `scripts/fixtures/grid-512.png` exists, `file scripts/fixtures/grid-512.png` reports a 512×512 PNG.

- [ ] **Step 2: Write failing test**

```typescript
// scripts/split_grid.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { splitGrid } from "./split_grid.ts";

describe("splitGrid", () => {
  it("splits a 512×512 grid into four 256×256 quadrants", async () => {
    const out = mkdtempSync(join(tmpdir(), "split-"));
    try {
      const files = await splitGrid("scripts/fixtures/grid-512.png", out);
      expect(files).toHaveLength(4);
      const names = readdirSync(out).sort();
      expect(names).toEqual(["01.png", "02.png", "03.png", "04.png"]);
      const meta = await sharp(join(out, "01.png")).metadata();
      expect(meta.width).toBe(256);
      expect(meta.height).toBe(256);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Run, verify failure**

```bash
npx vitest run scripts/split_grid.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Write split_grid.ts**

```typescript
// scripts/split_grid.ts
import sharp from "sharp";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export async function splitGrid(inputPath: string, outputDir: string): Promise<string[]> {
  mkdirSync(outputDir, { recursive: true });
  const img = sharp(inputPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`could not read dimensions of ${inputPath}`);
  }
  if (meta.width !== meta.height) {
    throw new Error(`expected a square grid, got ${meta.width}x${meta.height}`);
  }
  const half = meta.width / 2;
  const regions = [
    { name: "01.png", left: 0,    top: 0    },
    { name: "02.png", left: half, top: 0    },
    { name: "03.png", left: 0,    top: half },
    { name: "04.png", left: half, top: half },
  ];
  const out: string[] = [];
  for (const r of regions) {
    const dest = join(outputDir, r.name);
    await sharp(inputPath)
      .extract({ left: r.left, top: r.top, width: half, height: half })
      .png()
      .toFile(dest);
    out.push(dest);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: split_grid.ts <input.png> <output-dir>");
    process.exit(2);
  }
  splitGrid(input, output).then((files) => {
    console.log(JSON.stringify({ status: "ok", files }));
  }).catch((err) => {
    console.error(JSON.stringify({ status: "error", message: String(err) }));
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run, verify pass**

```bash
npx vitest run scripts/split_grid.test.ts
```

Expected: 1 passing test.

### Task 18: scripts/mj_bot.ts (generate)

**Files:**
- Create: `skills/designer/scripts/mj_bot.ts`

Cannot be unit-tested without Discord. Typecheck + manual verification only.

- [ ] **Step 1: Write mj_bot.ts**

```typescript
#!/usr/bin/env -S node --import tsx
// scripts/mj_bot.ts
import { connect, waitForMessage, downloadAttachment } from "../lib/discord_client.ts";
import { loadConfig } from "../lib/config.ts";
import { extractUButtons } from "../lib/midjourney.ts";
import { requestPaths, ensureRequestDirs } from "../lib/storage.ts";
import { createTrigger } from "../lib/triggers/index.ts";
import { splitGrid } from "./split_grid.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const GenerateArgs = z.object({
  prompt: z.string().min(1),
  request: z.string().min(1),
  projectCwd: z.string().min(1),
  timeoutMs: z.number().default(300_000),
});

async function generate(raw: unknown) {
  const args = GenerateArgs.parse(raw);
  const cfg = loadConfig();
  if (!cfg.midjourneyAppId || !cfg.midjourneyImagineCommandId) {
    throw new Error("midjourney IDs missing in config — run setup_check.ts");
  }

  const paths = requestPaths(args.projectCwd, args.request);
  ensureRequestDirs(paths);

  const trigger = createTrigger(cfg);
  const { channel, close } = await connect(cfg.discordBotToken, cfg.discordChannelId);
  try {
    await trigger.triggerImagine({
      prompt: args.prompt,
      applicationId: cfg.midjourneyAppId,
      imagineCommandId: cfg.midjourneyImagineCommandId,
      channelId: cfg.discordChannelId,
      guildId: cfg.discordGuildId,
    });

    const reply = await waitForMessage(
      channel,
      (msg) =>
        msg.author.id === cfg.midjourneyAppId &&
        msg.attachments.size > 0 &&
        msg.content.includes(args.prompt.split(" ").slice(0, 3).join(" ")),
      args.timeoutMs
    );

    const attachment = reply.attachments.first()!;
    const rawPath = join(paths.raw, `mj-${reply.id}.png`);
    await downloadAttachment(attachment.url, rawPath);

    const uButtons = extractUButtons(reply.components as unknown as unknown[]);
    const metaPath = join(paths.raw, `mj-${reply.id}.json`);
    writeFileSync(
      metaPath,
      JSON.stringify(
        {
          prompt: args.prompt,
          message_id: reply.id,
          channel_id: reply.channelId,
          timestamp: reply.createdTimestamp,
          u_button_custom_ids: uButtons,
          attachment_url: attachment.url,
        },
        null,
        2
      )
    );

    const files = await splitGrid(rawPath, paths.images);

    console.log(
      JSON.stringify({
        status: "ok",
        request: args.request,
        rawPath,
        metaPath,
        images: files,
      })
    );
  } finally {
    await close();
  }
}

async function main() {
  const [sub, jsonArg] = process.argv.slice(2);
  if (sub !== "generate") {
    console.error("usage: mj_bot.ts generate '<json>'");
    process.exit(2);
  }
  const raw = JSON.parse(jsonArg);
  await generate(raw);
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

```bash
cd skills/designer && npx tsc --noEmit
```

Expected: no errors.

### Task 19: scripts/upscale.ts

**Files:**
- Create: `skills/designer/scripts/upscale.ts`

- [ ] **Step 1: Write upscale.ts**

```typescript
#!/usr/bin/env -S node --import tsx
// scripts/upscale.ts
import { connect, waitForMessage, downloadAttachment } from "../lib/discord_client.ts";
import { loadConfig } from "../lib/config.ts";
import { requestPaths } from "../lib/storage.ts";
import { createTrigger } from "../lib/triggers/index.ts";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const UpscaleArgs = z.object({
  request: z.string().min(1),
  indices: z.array(z.number().int().min(1).max(4)).nonempty(),
  projectCwd: z.string().min(1),
  timeoutMs: z.number().default(180_000),
});

async function upscale(raw: unknown) {
  const args = UpscaleArgs.parse(raw);
  const cfg = loadConfig();
  if (!cfg.midjourneyAppId) throw new Error("midjourneyAppId missing — run setup_check");

  const paths = requestPaths(args.projectCwd, args.request);
  const rawFiles = readdirSync(paths.raw).filter((f) => f.endsWith(".json"));
  if (rawFiles.length === 0) throw new Error(`no raw metadata in ${paths.raw}`);
  const metaPath = join(paths.raw, rawFiles[0]); // most recent (single) generation
  const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as {
    message_id: string;
    u_button_custom_ids: Record<string, string>;
  };

  const trigger = createTrigger(cfg);
  const { channel, close } = await connect(cfg.discordBotToken, cfg.discordChannelId);
  try {
    const results: Array<{ index: number; path: string }> = [];
    for (const idx of args.indices) {
      const customId = meta.u_button_custom_ids[String(idx)];
      if (!customId) throw new Error(`no U${idx} button id in metadata`);

      await trigger.clickButton({
        messageId: meta.message_id,
        customId,
        applicationId: cfg.midjourneyAppId!,
        channelId: cfg.discordChannelId,
        guildId: cfg.discordGuildId,
      });

      const upMsg = await waitForMessage(
        channel,
        (m) =>
          m.author.id === cfg.midjourneyAppId &&
          m.attachments.size > 0 &&
          m.content.includes(`Image #${idx}`),
        args.timeoutMs
      );

      const att = upMsg.attachments.first()!;
      const destPath = join(paths.images, `0${idx}-up.png`);
      await downloadAttachment(att.url, destPath);
      results.push({ index: idx, path: destPath });
    }

    console.log(JSON.stringify({ status: "ok", request: args.request, upscales: results }));
  } finally {
    await close();
  }
}

async function main() {
  const [jsonArg] = process.argv.slice(2);
  if (!jsonArg) {
    console.error("usage: upscale.ts '<json>'");
    process.exit(2);
  }
  await upscale(JSON.parse(jsonArg));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

```bash
cd skills/designer && npx tsc --noEmit
```

Expected: no errors.

### Task 20: scripts/prepare_prompt.ts + scripts/process_raw.ts

**Files:**
- Create: `skills/designer/scripts/prepare_prompt.ts`
- Create: `skills/designer/scripts/process_raw.ts`

- [ ] **Step 1: Write prepare_prompt.ts**

```typescript
#!/usr/bin/env -S node --import tsx
// scripts/prepare_prompt.ts
import { findDesignMd, assemblePrompt, readIfExists } from "../lib/prompt_prep.ts";
import { requestPaths, ensureRequestDirs, toRequestName } from "../lib/storage.ts";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const Args = z.object({
  brief: z.string().min(1),
  projectCwd: z.string().min(1),
  requestName: z.string().optional(),
  designMd: z.string().nullable().optional(),
  aspectRatio: z.string().default("3:2"),
  version: z.string().default("6.1"),
  style: z.string().default("raw"),
});

async function main() {
  const args = Args.parse(JSON.parse(process.argv[2] ?? "{}"));
  const name = args.requestName ?? toRequestName(args.brief);
  const paths = requestPaths(args.projectCwd, name);
  ensureRequestDirs(paths);

  writeFileSync(join(paths.prompts, "original.md"), args.brief);

  const designMdPath = args.designMd ?? findDesignMd(args.projectCwd);
  const rules = readIfExists(designMdPath);
  const { promptMd, imaginePrompt } = assemblePrompt({
    brief: args.brief,
    designRules: rules,
    aspectRatio: args.aspectRatio,
    version: args.version,
    style: args.style,
  });
  writeFileSync(join(paths.prompts, "prompt.md"), promptMd);

  console.log(
    JSON.stringify({
      status: "ok",
      request: name,
      paths,
      imaginePrompt,
      designMdFound: Boolean(designMdPath),
    })
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
  process.exit(1);
});
```

- [ ] **Step 2: Write process_raw.ts**

```typescript
#!/usr/bin/env -S node --import tsx
// scripts/process_raw.ts
import { requestPaths } from "../lib/storage.ts";
import { splitGrid } from "./split_grid.ts";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";

const Args = z.object({
  request: z.string().min(1),
  projectCwd: z.string().min(1),
});

async function main() {
  const args = Args.parse(JSON.parse(process.argv[2] ?? "{}"));
  const paths = requestPaths(args.projectCwd, args.request);
  const entries = readdirSync(paths.raw)
    .filter((f) => f.endsWith(".png"))
    .map((f) => join(paths.raw, f))
    .filter((p) => statSync(p).isFile());

  const splits: string[] = [];
  for (const p of entries) {
    const meta = await sharp(p).metadata();
    if (!meta.width || !meta.height) continue;
    if (meta.width === meta.height) {
      const files = await splitGrid(p, paths.images);
      splits.push(...files);
    }
  }

  console.log(JSON.stringify({ status: "ok", processed: entries, images: splits }));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
  process.exit(1);
});
```

- [ ] **Step 3: Typecheck**

```bash
cd skills/designer && npx tsc --noEmit
```

### Task 21: designer/SKILL.md + README

**Files:**
- Create: `skills/designer/SKILL.md`
- Create: `skills/designer/README.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: designer
description: Generate application-style design images via Midjourney (through a Discord bot you own). Run this skill when the user wants a set of reference design images for a UI — a login form, dashboard, checkout flow, etc. — described in natural language, optionally combined with project-specific rules in a DESIGN.md file. Produces a folder of images and metadata under ./designs/<request-name>/.
---

# Designer skill

Turns a design brief into Midjourney images saved in a request-scoped folder.

## First-run setup

If `~/.config/designer/config.json` does not exist, run setup before anything else:

```bash
node --import tsx ~/.claude/skills/designer/scripts/setup_check.ts
```

You'll need: Discord bot token, guild ID, channel ID (where Midjourney lives).

## Commands this skill exposes

All scripts take a single JSON argument on argv and print a single JSON line to stdout on success (or stderr on failure, non-zero exit).

| Script | Purpose |
|---|---|
| `prepare_prompt.ts` | Merge brief + DESIGN.md + flags, write `prompts/original.md` + `prompts/prompt.md` |
| `mj_bot.ts generate '<json>'` | Trigger `/imagine`, await reply, download grid, split into 4 images |
| `upscale.ts '<json>'` | Click U1/U2/U3/U4 on a stored message_id to get hi-res upscales |
| `process_raw.ts '<json>'` | Manual-mode ingestion: scan `raw/*.png` and split any 2×2 grids |
| `split_grid.ts <in> <out>` | Library function; also runnable as a standalone CLI |
| `setup_check.ts` | Interactive setup / verification |

## Typical flow

1. User: "generate some designs for a checkout page with glassmorphism aesthetic"
2. Run `prepare_prompt.ts '{"brief":"checkout page glassmorphism","projectCwd":"<cwd>"}'` → captures request name + path info.
3. Run `mj_bot.ts generate '{"prompt":"<imaginePrompt>","request":"<name>","projectCwd":"<cwd>"}'` → returns image paths.
4. Show the user the indexed list of image files and ask which they want to build from.

## Manual fallback

If the bot can't talk to Discord, run with the prompt text printed for the user to paste `/imagine <prompt>` themselves, then have them drop the result into `designs/<request>/raw/` and run `process_raw.ts`.
```

- [ ] **Step 2: Write README.md**

```markdown
# designer (Claude Code skill)

Design image generation via Midjourney through a user-owned Discord bot. Installed into `~/.claude/skills/designer/` by the design-build-skills installer.

## Setup (once)

1. At https://discord.com/developers/applications, create an application, then a Bot. Enable "Message Content Intent".
2. OAuth2 URL Generator → scopes `bot` + `applications.commands`, permissions: Read Messages, Read Message History, Use Application Commands, Send Messages. Invite to your server.
3. In Midjourney's website, subscribe. In your server, invite the Midjourney bot.
4. Run `node --import tsx ~/.claude/skills/designer/scripts/setup_check.ts` and follow the prompts.

Config is stored at `~/.config/designer/config.json`. Env overrides: `DESIGNER_DISCORD_TOKEN`, `DESIGNER_DISCORD_CHANNEL_ID`, `DESIGNER_DISCORD_GUILD_ID`, `DESIGNER_MJ_APP_ID`, `DESIGNER_MJ_IMAGINE_ID`.

## Running tests

```bash
cd ~/.claude/skills/designer
npm test
```

Unit tests cover the pure code (storage, config, prompt prep, grid splitting, button parsing). Discord-facing code is verified via `setup_check.ts` end-to-end.
```

### Task 22: Commit `designer` skill

- [ ] **Step 1: Stage + commit**

```bash
cd /home/rw3iss/Sites/ven/new/tools/ven-tools
git add skills/designer/

git commit -m "$(cat <<'EOF'
feat(design-and-build-skills): implement designer skill

The designer skill turns a design brief into Midjourney images:

- lib/: pure utilities (config, storage, prompt_prep, midjourney button
  parsing) with vitest unit tests
- lib/discord_client.ts: discord.js wrapper for login, message wait,
  attachment download
- scripts/setup_check.ts: interactive Discord setup + command-ID discovery
- scripts/prepare_prompt.ts: assemble brief + DESIGN.md + MJ flags
- scripts/mj_bot.ts: ephemeral bot that fires /imagine via the Discord
  interaction endpoint, waits for Midjourney's reply, downloads the 2x2
  grid, splits to 4 quadrants
- scripts/upscale.ts: click U1-U4 on a stored message_id for hi-res
  upscales
- scripts/split_grid.ts: sharp-based quadrant splitter (CLI + lib)
- scripts/process_raw.ts: manual-mode ingestion
- SKILL.md + README.md with setup and command reference

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: `design-build` Skill

### Task 23: design-build package + tsconfig + vitest + shared.ts

**Files:**
- Create: `skills/design-build/package.json`
- Create: `skills/design-build/tsconfig.json`
- Create: `skills/design-build/vitest.config.ts`
- Create: `skills/design-build/shared.ts`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "design-build",
  "version": "0.0.1-alpha",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8",
    "@types/node": "^22.10.2"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "lib": ["es2022"],
    "types": ["node"]
  },
  "include": ["scripts/**/*.ts", "shared.ts"]
}
```

- [ ] **Step 3: Write vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["scripts/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Write shared.ts**

```typescript
// shared.ts — re-exports from ../designer/lib/ with a friendly error if missing.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const designerLib = resolve(here, "..", "designer", "lib");

if (!existsSync(designerLib)) {
  throw new Error(
    `design-build depends on the designer skill. Expected sibling at ${designerLib}. ` +
    `Install both via the install.sh in design-build-skills.`
  );
}

export { toRequestName, requestPaths, ensureRequestDirs } from "../designer/lib/storage.ts";
export { findDesignMd, readIfExists } from "../designer/lib/prompt_prep.ts";
```

Note: the `findDesignMd` signature needs to accept a filename param (already does) — we'll use it for `BUILD.md` lookup in `build_plan.ts`.

- [ ] **Step 5: npm install**

```bash
cd skills/design-build && npm install
```

### Task 24: scripts/select_images.ts

**Files:**
- Create: `skills/design-build/scripts/select_images.ts`
- Create: `skills/design-build/scripts/select_images.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// scripts/select_images.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveSelection } from "./select_images.ts";

function withFakeImages<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "sel-"));
  ["01.png","02.png","03.png","04.png","02-up.png"].forEach((n) =>
    writeFileSync(join(dir, n), ""));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

describe("resolveSelection", () => {
  it("resolves numeric indices to 0N.png", () => {
    withFakeImages((dir) => {
      const out = resolveSelection(dir, [2, 4]);
      expect(out.map((p) => p.replace(dir + "/", ""))).toEqual(["02.png", "04.png"]);
    });
  });

  it("prefers -up.png when present and prefer flag set", () => {
    withFakeImages((dir) => {
      const out = resolveSelection(dir, [2], { preferUpscaled: true });
      expect(out.map((p) => p.replace(dir + "/", ""))).toEqual(["02-up.png"]);
    });
  });

  it("falls back to 0N.png if upscale missing", () => {
    withFakeImages((dir) => {
      const out = resolveSelection(dir, [3], { preferUpscaled: true });
      expect(out.map((p) => p.replace(dir + "/", ""))).toEqual(["03.png"]);
    });
  });

  it("throws on unknown index", () => {
    withFakeImages((dir) => {
      expect(() => resolveSelection(dir, [9])).toThrow(/no image for index 9/);
    });
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
cd skills/design-build && npx vitest run scripts/select_images.test.ts
```

- [ ] **Step 3: Write select_images.ts**

```typescript
// scripts/select_images.ts
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface SelectionOptions { preferUpscaled?: boolean; }

export function resolveSelection(
  imagesDir: string,
  indices: number[],
  opts: SelectionOptions = {}
): string[] {
  return indices.map((i) => {
    const pad = i.toString().padStart(2, "0");
    const upscaled = join(imagesDir, `${pad}-up.png`);
    const base = join(imagesDir, `${pad}.png`);
    if (opts.preferUpscaled && existsSync(upscaled)) return upscaled;
    if (existsSync(base)) return base;
    if (existsSync(upscaled)) return upscaled;
    throw new Error(`no image for index ${i} in ${imagesDir}`);
  });
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run scripts/select_images.test.ts
```

Expected: 4 passing tests.

### Task 25: scripts/build_plan.ts

**Files:**
- Create: `skills/design-build/scripts/build_plan.ts`
- Create: `skills/design-build/scripts/build_plan.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// scripts/build_plan.test.ts
import { describe, it, expect } from "vitest";
import { composePlan } from "./build_plan.ts";

describe("composePlan", () => {
  it("produces a plan with design rules, build rules, and image references", () => {
    const md = composePlan({
      request: "login-glass",
      originalBrief: "a glassy login form",
      buildRules: "# Build rules\n- TypeScript + Preact",
      extraPrompt: "buttons should be rounder",
      imagePaths: ["/a/designs/login-glass/images/02.png", "/a/designs/login-glass/images/04.png"],
    });
    expect(md).toContain("# Implementation plan for login-glass");
    expect(md).toContain("a glassy login form");
    expect(md).toContain("buttons should be rounder");
    expect(md).toContain("02.png");
    expect(md).toContain("# Build rules");
  });

  it("works with no BUILD.md and no extra prompt", () => {
    const md = composePlan({
      request: "x",
      originalBrief: "y",
      buildRules: null,
      extraPrompt: null,
      imagePaths: [],
    });
    expect(md).toContain("# Implementation plan for x");
    expect(md).not.toContain("# Build rules");
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npx vitest run scripts/build_plan.test.ts
```

- [ ] **Step 3: Write build_plan.ts**

```typescript
// scripts/build_plan.ts
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findDesignMd, readIfExists, requestPaths, ensureRequestDirs } from "../shared.ts";
import { z } from "zod";

export interface ComposeInputs {
  request: string;
  originalBrief: string;
  buildRules: string | null;
  extraPrompt: string | null;
  imagePaths: string[];
}

export function composePlan(inputs: ComposeInputs): string {
  const lines: string[] = [];
  lines.push(`# Implementation plan for ${inputs.request}`, "");
  lines.push("## Original brief", "", inputs.originalBrief.trim(), "");
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
  lines.push(
    "## Execution notes",
    "",
    "Match the selected images as closely as possible. Generate Preact components",
    "with per-component SCSS (and `.mobile.scss` companions where warranted).",
    "Populate `src/mock/data/*.json` with realistic fixture data reflecting the",
    "entities visible in the images. The UI must render correctly against the",
    "MockApiAdapter alone — no real backend.",
    ""
  );
  return lines.join("\n");
}

const Args = z.object({
  request: z.string().min(1),
  projectCwd: z.string().min(1),
  originalBrief: z.string().default(""),
  extraPrompt: z.string().nullable().default(null),
  buildMd: z.string().nullable().optional(),
  imagePaths: z.array(z.string()).default([]),
});

async function main() {
  const args = Args.parse(JSON.parse(process.argv[2] ?? "{}"));
  const paths = requestPaths(args.projectCwd, args.request);
  ensureRequestDirs(paths);

  const buildMdPath = args.buildMd ?? findDesignMd(args.projectCwd, "BUILD.md");
  const buildRules = readIfExists(buildMdPath);

  // Also capture original brief from prompts/original.md if present and empty arg
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
  });

  const planPath = join(paths.app, "PLAN.md");
  ensureRequestDirs(paths);
  require("node:fs").mkdirSync(paths.app, { recursive: true });
  writeFileSync(planPath, plan);

  console.log(JSON.stringify({ status: "ok", planPath, request: args.request }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }));
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run scripts/build_plan.test.ts
```

Expected: 2 passing tests.

### Task 26: Template files

**Files (all under `skills/design-build/templates/app-shell/`):**
- `package.json.tmpl`
- `vite.config.ts.tmpl`
- `tsconfig.json.tmpl`
- `index.html.tmpl`
- `config/oxlint.json.tmpl`
- `src/main.tsx.tmpl`
- `src/app/App.tsx.tmpl`
- `src/services/api/ApiClient.ts.tmpl`
- `src/services/api/index.ts.tmpl`
- `src/mock/MockApiAdapter.ts.tmpl`
- `src/mock/data/.gitkeep`
- `styles/_variables.scss.tmpl`
- `styles/_mixins.scss.tmpl`
- `styles/global.scss.tmpl`
- `styles/_mobile.scss.tmpl`

- [ ] **Step 1: Write package.json.tmpl**

```json
{
  "name": "__APP_NAME__",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "oxlint src"
  },
  "dependencies": {
    "preact": "^10.25.4"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.10.0",
    "sass": "^1.83.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "oxlint": "^0.15.3"
  }
}
```

- [ ] **Step 2: Write vite.config.ts.tmpl**

```typescript
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: { port: 5173, open: true },
});
```

- [ ] **Step 3: Write tsconfig.json.tmpl**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "paths": { "react": ["./node_modules/preact/compat/"], "react-dom": ["./node_modules/preact/compat/"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write index.html.tmpl**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>__APP_NAME__</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write src/main.tsx.tmpl**

```typescript
import { render } from "preact";
import { App } from "./app/App";
import "../styles/global.scss";

render(<App />, document.getElementById("root")!);
```

- [ ] **Step 6: Write src/app/App.tsx.tmpl**

```typescript
// Minimal shell. Claude fills this in based on the design images + PLAN.md.
import type { JSX } from "preact";

export function App(): JSX.Element {
  return (
    <div class="app">
      <h1>__APP_NAME__</h1>
      <p>Scaffold ready. See PLAN.md.</p>
    </div>
  );
}
```

- [ ] **Step 7: Write src/services/api/ApiClient.ts.tmpl**

```typescript
// ApiClient — interface between UI and backend.
// Claude fills method signatures based on what the design images depict.
// Example methods once populated: getProducts(), getUser(), etc.
export interface ApiClient {
  // no methods yet — populated per-design
}
```

- [ ] **Step 8: Write src/services/api/index.ts.tmpl**

```typescript
import type { ApiClient } from "./ApiClient";
import { MockApiAdapter } from "../../mock/MockApiAdapter";

// Swap this one line for a real HTTP adapter to integrate with a backend:
//   export const apiClient: ApiClient = new HttpApiAdapter(baseUrl, authToken);
export const apiClient: ApiClient = new MockApiAdapter();
```

- [ ] **Step 9: Write src/mock/MockApiAdapter.ts.tmpl**

```typescript
import type { ApiClient } from "../services/api/ApiClient";

const DEFAULT_LATENCY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export class MockApiAdapter implements ApiClient {
  private latencyMs: number;
  constructor(latencyMs: number = DEFAULT_LATENCY_MS) {
    this.latencyMs = latencyMs;
  }
  protected async withLatency<T>(fn: () => T | Promise<T>): Promise<T> {
    await delay(this.latencyMs);
    return await fn();
  }
  // Claude adds concrete methods (getProducts, getUser, etc.) that read from
  // src/mock/data/*.json and return realistic fixtures.
}
```

- [ ] **Step 10: Write styles/_variables.scss.tmpl**

```scss
// Design tokens. Claude refines these to match the design images.
$color-bg: #0b0b12;
$color-surface: #15151f;
$color-primary: #7c5cff;
$color-text: #e9e9f4;
$color-text-muted: #9494a7;

$radius-sm: 6px;
$radius-md: 12px;
$radius-lg: 20px;

$space-1: 4px;
$space-2: 8px;
$space-3: 16px;
$space-4: 24px;
$space-5: 40px;
$space-6: 64px;

$font-family-base: "Inter", system-ui, -apple-system, sans-serif;

$bp-mobile: 480px;
$bp-tablet: 768px;
$bp-desktop: 1024px;
```

- [ ] **Step 11: Write styles/_mixins.scss.tmpl**

```scss
@use "sass:math";
@use "variables" as *;

@mixin mobile { @media (max-width: $bp-tablet - 1) { @content; } }
@mixin tablet { @media (min-width: $bp-tablet) and (max-width: $bp-desktop - 1) { @content; } }
@mixin desktop { @media (min-width: $bp-desktop) { @content; } }

@function fluid($min, $max, $minVw: $bp-mobile, $maxVw: $bp-desktop) {
  $slope: math.div($max - $min, $maxVw - $minVw);
  $base: $min - $slope * $minVw;
  @return clamp(#{$min}, #{$base} + #{$slope * 100}vw, #{$max});
}
```

- [ ] **Step 12: Write styles/global.scss.tmpl**

```scss
@use "variables" as *;
@use "mixins" as *;
@use "mobile";

*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: $color-bg;
  color: $color-text;
  font-family: $font-family-base;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: $color-primary; }
```

- [ ] **Step 13: Write styles/_mobile.scss.tmpl**

```scss
@use "variables" as *;
@use "mixins" as *;

@include mobile {
  body { font-size: 15px; }
}
```

- [ ] **Step 14: Write config/oxlint.json.tmpl**

```json
{
  "categories": { "correctness": "error", "suspicious": "warn", "perf": "warn" },
  "ignorePatterns": ["dist", "node_modules"]
}
```

- [ ] **Step 15: Create .gitkeep for mock/data**

```bash
mkdir -p skills/design-build/templates/app-shell/src/mock/data
touch skills/design-build/templates/app-shell/src/mock/data/.gitkeep
```

### Task 27: scripts/scaffold_preact.ts

**Files:**
- Create: `skills/design-build/scripts/scaffold_preact.ts`
- Create: `skills/design-build/scripts/scaffold_preact.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// scripts/scaffold_preact.test.ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "./scaffold_preact.ts";

describe("scaffold", () => {
  it("writes the expected file tree into target dir", async () => {
    const out = mkdtempSync(join(tmpdir(), "scaf-"));
    try {
      await scaffold({ targetDir: out, appName: "my-demo" });
      expect(existsSync(join(out, "package.json"))).toBe(true);
      expect(existsSync(join(out, "vite.config.ts"))).toBe(true);
      expect(existsSync(join(out, "src/main.tsx"))).toBe(true);
      expect(existsSync(join(out, "src/services/api/ApiClient.ts"))).toBe(true);
      expect(existsSync(join(out, "src/mock/MockApiAdapter.ts"))).toBe(true);
      expect(existsSync(join(out, "styles/global.scss"))).toBe(true);

      const pkg = JSON.parse(readFileSync(join(out, "package.json"), "utf-8"));
      expect(pkg.name).toBe("my-demo");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npx vitest run scripts/scaffold_preact.test.ts
```

- [ ] **Step 3: Write scaffold_preact.ts**

```typescript
// scripts/scaffold_preact.ts
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATE_ROOT = join(here, "..", "templates", "app-shell");

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
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run scripts/scaffold_preact.test.ts
```

Expected: 1 passing test.

### Task 28: design-build SKILL.md + README

**Files:**
- Create: `skills/design-build/SKILL.md`
- Create: `skills/design-build/README.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: design-build
description: Scaffold a Preact + TypeScript + SCSS application that matches a set of design images. Use this when the user has generated design images (via the designer skill, or a local folder) and says "build it" / "build from these images". Reads an optional BUILD.md for project-specific rules, emits a PLAN.md, and produces an app/ scaffold with a mandatory mock-data layer so the result is immediately demoable. Does not produce backend code or tests.
---

# design-build skill

Turns design images + optional extra prompt into a Preact scaffold.

## Flow

1. User selects images (conversational — "build from 2 and 4" with optional extra notes).
2. Run `select_images.ts` (library) to resolve indices → file paths.
3. Run `build_plan.ts` to write `designs/<request>/app/PLAN.md`.
4. Run `scaffold_preact.ts` to write the deterministic skeleton under `designs/<request>/app/`.
5. Claude (this conversation) writes the per-component JSX, per-component SCSS, `ApiClient` method signatures, and `mock/data/*.json` fixtures — reading the images and PLAN.md.

## Mandatory: the mock-data layer

Every scaffolded app exposes `src/services/api/ApiClient.ts` (an interface) and `src/services/api/index.ts` (the injection point wiring in `MockApiAdapter`). The UI depends only on `ApiClient`. Swapping to a real backend is a one-line change in `services/api/index.ts`. Fixtures in `src/mock/data/*.json` must reflect the entities shown in the design images.

## Commands

| Script | Purpose |
|---|---|
| `select_images.ts` | Library: indices + images dir → absolute paths |
| `build_plan.ts '<json>'` | Writes `app/PLAN.md` |
| `scaffold_preact.ts '<json>'` | Copies templates into `app/` |
```

- [ ] **Step 2: Write README.md**

```markdown
# design-build (Claude Code skill)

Scaffolds a Preact + TypeScript + SCSS app from a folder of design images. Installed by the design-build-skills installer.

## Depends on

`designer` skill must be installed at `~/.claude/skills/designer/` (this skill imports from `../designer/lib/`).

## Integrating a real backend

Each scaffolded app ships with `MockApiAdapter` at `src/mock/MockApiAdapter.ts`, wired into `src/services/api/index.ts`. To swap in a real backend:

```typescript
// src/services/api/index.ts
import type { ApiClient } from "./ApiClient";
import { HttpApiAdapter } from "./HttpApiAdapter"; // your new file

export const apiClient: ApiClient = new HttpApiAdapter(import.meta.env.VITE_API_BASE);
```

`HttpApiAdapter` must implement every method in `ApiClient`. The UI code never changes.

## Running tests

```bash
cd ~/.claude/skills/design-build
npm test
```
```

### Task 29: Self-review — end-to-end sanity check

- [ ] **Step 1: Full typecheck both skills**

```bash
(cd skills/designer && npx tsc --noEmit) \
  && (cd skills/design-build && npx tsc --noEmit)
```

Expected: no errors from either.

- [ ] **Step 2: Run all tests**

```bash
(cd skills/designer && npm test) \
  && (cd skills/design-build && npm test)
```

Expected: all green.

- [ ] **Step 3: Run install-script tests**

```bash
tests/install.test.sh
```

Expected: 4 PASS lines.

- [ ] **Step 4: End-to-end dry install**

```bash
install.sh --local . --dry-run
```

Expected: preflight OK, source resolved to the package root, two skills planned for install.

### Task 30: Commit `design-build` skill + final monorepo reconciliation

- [ ] **Step 1: Stage design-build skill**

```bash
cd /home/rw3iss/Sites/ven/new/tools/ven-tools
git add skills/design-build/
```

- [ ] **Step 2: Run monorepo-level `npm install` to register the new workspace**

```bash
cd /home/rw3iss/Sites/ven/new/tools/ven-tools && npm install
```

Expected: `package-lock.json` updated to reference the new nested package.json files (which is fine — they're not published, just workspace-linked).

- [ ] **Step 3: Stage lockfile change**

```bash
git add package-lock.json
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(design-and-build-skills): implement design-build skill

Design-build takes design images + optional extra prompt and scaffolds a
Preact + TypeScript + SCSS app with a mandatory mock-data layer:

- scripts/select_images.ts: resolve 'build from 2,4' indices to file
  paths, with --prefer-upscaled flag
- scripts/build_plan.ts: compose designs/<request>/app/PLAN.md from
  original brief, BUILD.md (walk-up), extra prompt, and image list
- scripts/scaffold_preact.ts: copy deterministic templates (package.json,
  vite config, tsconfig, Preact entry, services/api/ApiClient interface,
  mock/MockApiAdapter, SCSS framework) into target dir
- shared.ts: re-exports from ../designer/lib/ with a clear error if the
  designer skill isn't installed as a sibling
- templates/app-shell/: static template files with __APP_NAME__ token
- SKILL.md + README.md

Also updates monorepo package-lock.json to register the new workspace.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

### Spec coverage

Mapping spec requirements to tasks:

| Spec section | Covered by task(s) |
|---|---|
| Directory layout `prompts/raw/images/app/` | T11 (paths), T20 (writes originals), T18 (writes raw+splits), T25 (writes PLAN.md) |
| Skill layout `designer/` + `design-build/` with shared lib | T10, T11-T21, T23-T28 |
| Ephemeral bot | T18 |
| Manual mode (`--manual` flag) | T20 (`process_raw.ts`) + T18 (users can skip mj_bot entirely by running prepare_prompt + process_raw) |
| Config at `~/.config/designer/config.json` + env override | T12 |
| DESIGN.md / BUILD.md walk-up with `.git` boundary | T13 (DESIGN.md), T25 (BUILD.md, via shared re-export) |
| Selection UX conversational | No code needed — the skill's SKILL.md documents this; Claude parses user follow-up, runs `select_images.ts` library |
| Grid split | T17 |
| Upscale via U1–U4 click | T19 |
| Mandatory mock-data layer in generated app | T26 (templates), T28 (SKILL.md documents it) |
| SOLID/style principles | T25 (emitted into PLAN.md), T26 (template choices) |
| Installer with sparse clone + flags | T2–T5 |
| Uninstaller | T6 |
| Updater | T7 |
| Test plan: install dry-run, fresh, idempotent, update, local, uninstall | T8 (partial — flag validation + sanity); live install verified manually in end-to-end |
| Test plan: setup_check, generate end-to-end, upscale, build end-to-end | Manual verification after implementation — out of scope for code tasks, noted in T16, T18, T19 |

### Placeholder scan

No remaining "TBD", "TODO", "implement later", or "add appropriate error handling" phrases in the plan itself. One deliberate omission: the live-Discord integration tests for `setup_check`, `mj_bot`, `upscale` are manual — that's a real-world constraint, not a placeholder.

### Type consistency

- `requestPaths(projectCwd, name)` signature stable across T11, T18, T19, T20, T25.
- `Config` interface stable across T12, T16, T18, T19.
- `extractUButtons` returns `Record<1|2|3|4, string>`; consumer in T18 stores as `u_button_custom_ids` and T19 reads via string keys — checked; coercion is explicit (`String(idx)` in T19).
- `findDesignMd(dir, filename?)` used for both DESIGN.md (T13, T20) and BUILD.md (T25 via shared re-export). Signature accepts the filename param from the outset.

### One known gap filed as a follow-up, not a placeholder

The actual Discord-interaction triggering of `/imagine` (T18) and button clicks for upscale (T19) use direct HTTP POSTs against `https://discord.com/api/v10/interactions` with a bot token. The request bodies (`type: 2` for application command, `type: 3` for component interaction) are documented by Discord but not widely tested across bot versions. If the first live run fails with a 400/401 from Discord, the fix may involve supplying a valid `session_id` from the gateway connection rather than a generated one. This is a live-debugging task, not a plan gap.

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-04-17-design-to-app-workflow-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration, isolated context per task.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints at the three commit boundaries (T9, T22, T30).

**Which approach?**
