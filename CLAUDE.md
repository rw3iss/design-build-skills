# CLAUDE.md — design-build-skills

Context file for resuming work on this repo. Read this first before doing anything else.

---

## What this package is

Two Claude Code skills that turn a design brief into a Preact app end-to-end:

- **`designer`** — prompt + DESIGN.md → Midjourney images via Discord bot → saved to `./designs/<request-name>/images/`
- **`design-build`** — gateway for building pages/features: reads DESIGN.md + BUILD.md + COMPONENT_INDEX.md, optional reference images, then scaffolds a new Preact + TypeScript + SCSS app (when none exists) or extends the existing app in place (CWD is the project), reusing existing components/styles before creating new ones

The two skills are distributed together via a bash installer (`install.sh`) that copies them into `~/.claude/skills/`.

---

## Status

**Implemented.** Both skills, the installer (`install.sh` / `update.sh` / `uninstall.sh`), and the design-build templates exist and work. design-build's scripts are unit-tested (`npm test` in `skills/design-build` — 39 tests; `npm run typecheck` clean).

- **designer:** `lib/*` + `scripts/*` + `bin/designer` + `SKILL.md`.
- **design-build:** `scripts/{resolve_target,select_images,build_plan,scaffold_preact}.ts` (+ tests), `templates/app-shell/*`, `shared.ts`, `SKILL.md`.

Original spec: [`docs/specs/2026-04-17-design-to-app-workflow-design.md`](./docs/specs/2026-04-17-design-to-app-workflow-design.md) (historical — the implementation has since evolved; this CLAUDE.md is the current source of truth).

---

## Key architectural decisions already made (don't re-litigate)

- **Two skills, not one**, both under `~/.claude/skills/`. Shared lib in `designer/lib/` imported by `design-build` via a relative path.
- **TypeScript, not Python**, for the bot and all scripts (runs via `tsx`).
- **Ephemeral bot**, not always-on. Each operation spawns a fresh `mj_bot.ts` process that connects, runs one command, exits. Future upgrade path to `--persist` is noted but out of scope for v1.
- **Discord bot uses slash-command interactions** to trigger Midjourney's `/imagine` (legit — bot-to-bot interactions are supported by Discord's API since 2022). No self-bot.
- **Image granularity default = 2×2 grid split into 4 quadrants** via `sharp`. Upscales via U1–U4 clicks are opt-in with `--hifi` or as a separate `designer upscale` subcommand.
- **Selection UX = conversational.** Skill prints indexed list, user says "build from 2 and 4" in the next turn. No AskUserQuestion gate, no TUI.
- **DESIGN.md / BUILD.md lookup = walk up from CWD**, stopping at `/` or first `.git`. Overridable via `designMd` / `buildMd` args to `build_plan.ts`.
- **design-build target resolution** (`resolve_target.ts`): walk up from CWD for nearest `package.json` (stop at `.git`). Found → **extend** in place; none → **new** app scaffolded at CWD. Explicit phrasing ("new app" / "extend") and an explicit target path override detection. The old `designs/<request>/app/` build target is dropped — design-build builds into the real project. New apps seed starter DESIGN.md/BUILD.md/COMPONENT_INDEX.md (no-clobber).
- **COMPONENT_INDEX.md** = app-root reuse manifest (components · shared utils/hooks · shared SCSS). design-build reads it before building (feature analysis → reuse/adapt/new) and updates it after. DRY is enforced in the emitted `PLAN.md` brief.
- **Mock-data layer is mandatory** on every generated app. `src/mock/data/*.json` fixtures + `src/mock/MockApiAdapter.ts` implements `src/services/api/ApiClient.ts`. Single injection point at `src/services/api/index.ts` for swap-out to a real `HttpApiAdapter`.
- **Division of labor for the build scaffold**: new-app scaffolding **delegates to the `scaffold-preact` skill** (passing DESIGN.md/BUILD.md/COMPONENT_INDEX + the request); design-build then adds its mock-data layer and builds the feature. The bundled `scaffold_preact.ts` + `templates/` remain as a **fallback** when `scaffold-preact` isn't installed. Either way, only deterministic parts are scaffolded; component bodies + fixtures are written by Claude *after* scaffold lands.
- **Directory layout (designer)**: flat `designs/<request-name>/{prompts,raw,images}/`. No `generated/` wrapper. (The `app/` subdir is legacy — design-build now builds into the real project, not under `designs/`.)
- **Distribution = standalone repo** at `github.com/rw3iss/design-build-skills`. `install.sh` does a shallow clone of the repo into `~/.cache/design-build-skills/` then rsyncs the skill subdirs into `~/.claude/skills/`. Tags use `vX.Y.Z`.

---

## Open items for the user

- **Discord bot credentials.** User must do these manually — the installer can't automate them:
  1. Create a Discord application at discord.com/developers/applications → enable "Message Content Intent" on the Bot tab → copy token.
  2. Create a Discord server (or reuse one user owns). Subscribe to Midjourney, invite MJ.
  3. Invite the custom bot to the same server via OAuth URL (scopes `bot` + `applications.commands`; permissions Read Messages, Read Message History, Use Application Commands, Send Messages).
  4. Run `setup_check.ts` — it discovers the Midjourney app ID + `/imagine` command ID and writes everything to `~/.config/designer/config.json`.

---

## Working on this repo

- **design-build scripts** live in `skills/design-build/scripts/`. After changing them: `cd skills/design-build && npm test && npm run typecheck`.
- **design-build templates** live in `skills/design-build/templates/app-shell/`. `DESIGN.md.tmpl` / `BUILD.md.tmpl` / `COMPONENT_INDEX.md.tmpl` are seeded into new apps (no-clobber). `BUILD.md.tmpl` carries the enforced client-app rules (SOLID, hoist/centralize, intelligent non-blocking components with lazy-loading states, 100ms-throttled input handlers, COMPONENT_INDEX upkeep, README data-layer note).
- **scaffold-preact companion:** design-build delegates new-app scaffolding to the separate `scaffold-preact` skill (it lives in `~/.claude/skills/scaffold-preact/`, **not** this repo). That skill produces traditional SCSS (no CSS modules), tab indentation, a persisted UI-state hook, and optional client-side caching. design-build falls back to its bundled `scaffold_preact.ts` when scaffold-preact isn't installed.
- **Slash commands:** `commands/design.md` + `commands/build.md` (repo root) install to `~/.claude/commands/` as `/design` (→ designer skill) and `/build` (→ design-build skill). `install.sh` copies them on both fresh install and `--update`, so existing installations refresh them.
- **Install/update:** `./install.sh` (clone→cache→rsync skills into `~/.claude/skills/`→`npm install`→copy commands into `~/.claude/commands/`); `npm run update` / `update.sh` → `install.sh --update`. The installer rsyncs whole skill dirs, so new scripts/templates are picked up automatically — no manifest to maintain. `uninstall.sh` removes both skills and the two commands.

---

## Do NOT

- Do NOT hardcode a Midjourney application ID. It's discovered by `setup_check.ts` on first run.
- Do NOT skip the mock data layer when generating an app. It's mandatory, not optional.
- Do NOT write component bodies or mock fixtures via templates — those are Claude's job post-scaffold.
- Do NOT attempt to automate Discord login with user credentials. Bot token only.
- Do NOT push to git without the user asking.

---

## Repository

Standalone repo: https://github.com/rw3iss/design-build-skills
