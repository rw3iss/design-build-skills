# CLAUDE.md — @vendidit/design-and-build-skills

Context file for resuming work on this package. Read this first before doing anything else.

---

## What this package is

Two Claude Code skills that turn a design brief into a Preact app end-to-end:

- **`designer`** — prompt + DESIGN.md → Midjourney images via Discord bot → saved to `./designs/<request-name>/images/`
- **`design-build`** — images + BUILD.md + optional extra prompt → Preact + TypeScript + SCSS scaffold at `./designs/<request-name>/app/`

The two skills are distributed together via a bash installer (`install.sh`) that copies them into `~/.claude/skills/`.

---

## Status as of 2026-04-17

**Spec:** complete and self-reviewed. Located at [`docs/specs/2026-04-17-design-to-app-workflow-design.md`](./docs/specs/2026-04-17-design-to-app-workflow-design.md).

**Awaiting:** user review of the spec.

**Next step once approved:** invoke `superpowers:writing-plans` to turn the spec into a step-by-step implementation plan. The ONLY skill to invoke after brainstorming is `writing-plans` — not `frontend-design`, not `mcp-builder`, etc.

**Implementation status:** not started. No skill code, no `install.sh`, no templates exist yet. Only this package's scaffolding (package.json, README.md, CLAUDE.md, docs/specs/).

---

## Key architectural decisions already made (don't re-litigate)

- **Two skills, not one**, both under `~/.claude/skills/`. Shared lib in `designer/lib/` imported by `design-build` via a relative path.
- **TypeScript, not Python**, for the bot and all scripts (runs via `tsx`). Consistent with the rest of the Vendidit stack.
- **Ephemeral bot**, not always-on. Each operation spawns a fresh `mj_bot.ts` process that connects, runs one command, exits. Future upgrade path to `--persist` is noted but out of scope for v1.
- **Discord bot uses slash-command interactions** to trigger Midjourney's `/imagine` (legit — bot-to-bot interactions are supported by Discord's API since 2022). No self-bot.
- **Image granularity default = 2×2 grid split into 4 quadrants** via `sharp`. Upscales via U1–U4 clicks are opt-in with `--hifi` or as a separate `designer upscale` subcommand.
- **Selection UX = conversational.** Skill prints indexed list, user says "build from 2 and 4" in the next turn. No AskUserQuestion gate, no TUI.
- **DESIGN.md / BUILD.md lookup = walk up from CWD**, stopping at `/` or first `.git`. Overridable with `--design-md` / `--build-md` flags.
- **Mock-data layer is mandatory** on every generated app. `src/mock/data/*.json` fixtures + `src/mock/MockApiAdapter.ts` implements `src/services/api/ApiClient.ts`. Single injection point at `src/services/api/index.ts` for swap-out to a real `HttpApiAdapter`.
- **Division of labor for the build scaffold**: `scaffold_preact.ts` writes only the deterministic parts (config, entry points, styles framework, empty service/mock shells). Component bodies + fixtures are written by Claude *after* scaffold lands.
- **Directory layout final**: flat `designs/<request-name>/{prompts,raw,images,app}/`. No `generated/` wrapper.
- **Distribution = inside `Vendidit/tools` monorepo**, not a standalone repo. `install.sh` does a shallow + sparse clone scoped to `packages/design-and-build-skills/`, so users never fetch the rest of the monorepo. Tags use `design-and-build-skills-vX.Y.Z` to avoid collision with other packages.

---

## Open items for the user

- **Discord bot credentials.** User must do these manually — the installer can't automate them:
  1. Create a Discord application at discord.com/developers/applications → enable "Message Content Intent" on the Bot tab → copy token.
  2. Create a Discord server (or reuse one user owns). Subscribe to Midjourney, invite MJ.
  3. Invite the custom bot to the same server via OAuth URL (scopes `bot` + `applications.commands`; permissions Read Messages, Read Message History, Use Application Commands, Send Messages).
  4. Run `setup_check.ts` — it discovers the Midjourney app ID + `/imagine` command ID and writes everything to `~/.config/designer/config.json`.

---

## How to resume this session

1. Read the spec in full: [`docs/specs/2026-04-17-design-to-app-workflow-design.md`](./docs/specs/2026-04-17-design-to-app-workflow-design.md).
2. Confirm Discord setup readiness (see open items above).
3. Invoke `superpowers:writing-plans` to produce the implementation plan. The plan should decompose the work into phases that can be executed independently:
   - Phase 1: `install.sh` + `uninstall.sh` + package scaffolding
   - Phase 2: `designer/lib/*` shared utilities (config, storage, discord_client, midjourney, prompt_prep)
   - Phase 3: `designer/scripts/*` (setup_check, prepare_prompt, mj_bot, split_grid, upscale, process_raw) + `SKILL.md`
   - Phase 4: `design-build/scripts/*` + templates + `SKILL.md`
   - Phase 5: end-to-end test with a real Discord server
4. Execute the plan phase by phase using `superpowers:executing-plans` or `subagent-driven-development` where independent.

---

## Do NOT

- Do NOT start implementing skills before the spec is user-approved (brainstorming skill HARD-GATE).
- Do NOT hardcode a Midjourney application ID. It's discovered by `setup_check.ts` on first run.
- Do NOT skip the mock data layer when generating an app. It's mandatory, not optional.
- Do NOT write component bodies or mock fixtures via templates — those are Claude's job post-scaffold.
- Do NOT attempt to automate Discord login with user credentials. Bot token only.
- Do NOT push to git without the user asking.

---

## Parent context

This package lives in `@vendidit/tools` (npm workspaces monorepo). Parent-level docs:

- [`../../README.md`](../../README.md) — monorepo overview with the package table
- [`../../package.json`](../../package.json) — workspace root

For broader Vendidit platform context, see `/home/rw3iss/Sites/ven/CLAUDE.md`.
