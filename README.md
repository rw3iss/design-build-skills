# design-build-skills

Two Claude Code skills that work together to turn a design brief into a working Preact app:

1. **`designer`** — takes a prompt, generates design images via Midjourney through a Discord bot, saves them into a per-request folder.
2. **`design-build`** — the gateway for building pages and features into a Preact + TypeScript + SCSS app. It reads the project's `DESIGN.md` / `BUILD.md` rules and a `COMPONENT_INDEX.md` reuse manifest, then either scaffolds a new app or extends the existing one in place — reusing existing components and styles before creating anything new. Reference images are optional. Includes a mandatory mock-data layer so the output is demoable with no backend.

Status: **implemented, v0.0.1-alpha.** Design doc: [`docs/specs/2026-04-17-design-to-app-workflow-design.md`](./docs/specs/2026-04-17-design-to-app-workflow-design.md). Implementation plan: [`docs/plans/2026-04-17-design-to-app-workflow-implementation.md`](./docs/plans/2026-04-17-design-to-app-workflow-implementation.md).

---

## Install

### Option A — One-liner (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/rw3iss/design-build-skills/main/install.sh | bash
```

### Option B — Clone the repo first

```bash
git clone git@github.com:rw3iss/design-build-skills.git
cd design-build-skills
./install.sh
```

The script clones this repo into a local cache, copies the skill files into `~/.claude/skills/`, installs the `/design` and `/build` slash commands into `~/.claude/commands/`, and runs `npm install`. Nothing else is needed on your machine beyond Node ≥22, git, npm, and rsync.

### Slash commands

Install adds two manual commands (refreshed on every `--update`):

- **`/design <brief>`** — evoke the `designer` skill to generate design images. e.g. `/design a luxury watch PDP, cream + champagne gold, editorial serif`
- **`/build <request>`** — evoke the `design-build` skill to build/extend an app, or bootstrap rule files. e.g. `/build add a settings page` · `/build from images 2 and 4` · `/build a BUILD.md`

---

**`design-build` is ready to use immediately after install** — no Discord credentials or other setup required. Point it at a request ("build the app", "add a settings page") in any project; reference images are optional.

The Discord setup below is only needed if you also want the **`designer`** skill (Midjourney image generation).

---

## Updating

**Easiest — from inside Claude Code, just type:**

```
/build update
```

That runs the installer's `--update` for you: it re-fetches the latest skills into `~/.claude/skills/`, refreshes the `/design` and `/build` commands, and — because Claude Code hot-reloads skills and commands from disk — takes effect **without restarting** your session.

Equivalent command-line methods (all run `install.sh --update`):

```bash
# From a clone of this repo
npm run update

# Cached installer (no clone needed after the first install)
~/.cache/design-build-skills/install.sh --update

# Or via curl (the install one-liner, plus --update)
curl -fsSL https://raw.githubusercontent.com/rw3iss/design-build-skills/main/install.sh | bash -s -- --update

# Update a single skill only
~/.cache/design-build-skills/install.sh --update --skill design-build
~/.cache/design-build-skills/install.sh --update --skill designer
```

`--update` does a shallow re-fetch, re-rsync's both skill directories, reruns `npm ci`, and re-syncs the `/design` + `/build` commands. Your `~/.config/designer/config.json` is never modified.

---

## Discord setup (one-time, `designer` skill only)

<details>
<summary><strong>Click to expand the one-time Discord setup</strong> — only needed for the <code>designer</code> image-generation skill</summary>

<br>

> **Skip this section if you only want `design-build`** (build/extend a Preact app, no Midjourney). Run `designer setup --skip-discord` instead to verify tools are in place.

Before `designer` can run, you need: a Discord application with a bot, a server you control, both your custom bot **and** the Midjourney bot in that server, and a handful of IDs.

### Step 1 — Create a Discord application + bot token

1. Open https://discord.com/developers/applications → **New Application** → give it a name (e.g. "Design Ingest").
2. Left sidebar → **Bot**.
3. Click **Reset Token** → **Copy**. Paste it somewhere safe immediately; Discord hides it after you leave the page.
4. On the same Bot tab, scroll to **Privileged Gateway Intents** and toggle ON: ✅ **Message Content Intent**. Without this, the bot can't read Midjourney's replies.

### Step 2 — Create a Discord server you own

In your Discord client, click the `+` at the bottom of the server list → **Create My Own** → **For me and my friends**. Name it whatever.

### Step 3 — Invite your bot into that server

Back in the developer portal:
1. Left sidebar → **OAuth2** → **URL Generator**.
2. Scopes: ✅ `bot`, ✅ `applications.commands`.
3. Bot Permissions: ✅ View Channels, ✅ Read Message History, ✅ Send Messages, ✅ Use Application Commands.
4. Copy the **Generated URL** at the bottom. Open it in a browser, pick your server, click **Authorize**.
5. Confirm the bot appears in your server's member list.

**If the Generate URL button is disabled**, you can manually construct the URL. Get your **Application ID** from the General Information page and use:
```
https://discord.com/oauth2/authorize?client_id=<APP_ID>&scope=bot+applications.commands&permissions=2147552256
```

### Step 4 — Invite the Midjourney bot into the same server

1. Active Midjourney subscription required: https://www.midjourney.com/account
2. From your Midjourney account page, use **Invite the Bot** and choose your server. Alternatively, in Discord, open **Explore Apps** → search "Midjourney Bot" → **Add to Server**.

### Step 5 — Grab your server + channel IDs

1. In Discord, enable Developer Mode: **User Settings → Advanced → Developer Mode**.
2. Right-click your server icon → **Copy Server ID**.
3. Right-click the channel where Midjourney lives → **Copy Channel ID**.

### Step 6 — Run setup

```bash
~/.claude/skills/designer/bin/designer setup
```

It'll prompt for the four values — bot token (Step 1), server ID (Step 5), channel ID (Step 5), and trigger mode. Default: `manual` (safe, ToS-compliant). `user-token` is an opt-in automated mode that violates Discord's ToS — only pick it if you accept account-ban risk on your personal Discord.

### Trouble?

The setup script auto-diagnoses the most common failures:

| Symptom | What it means |
|---|---|
| `Used disallowed intents` | Message Content Intent toggle is off (Step 1.4) |
| `TokenInvalid` / `401 Unauthorized` | Wrong token: you pasted `Bot <token>` instead of just the token, pasted the Application ID, or reset the token after copying |
| `is not a text channel / is not accessible` | Wrong channel ID, bot not in server, or channel permissions deny View Channel |
| `Midjourney bot not found` | MJ bot isn't in the server yet (Step 4) |

Config is saved to `~/.config/designer/config.json`. Env overrides: `DESIGNER_DISCORD_TOKEN`, `DESIGNER_DISCORD_CHANNEL_ID`, `DESIGNER_DISCORD_GUILD_ID`, `DESIGNER_MJ_APP_ID`, `DESIGNER_MJ_IMAGINE_ID`, `DESIGNER_TRIGGER_MODE`, `DESIGNER_DISCORD_USER_TOKEN`.

</details>

---

## What it does, quickly

- `designer` reads a brief, walks up from your CWD for a `DESIGN.md`, merges project rules into a Midjourney-ready prompt, fires `/imagine` through a bot you own, waits for the reply, downloads the 2×2 grid, splits it into four variant images, and stores everything under `./designs/<request-name>/`.
- `designer upscale <request-name> <indices...>` goes back and clicks U1–U4 on the original Midjourney post to get true high-res upscales of the variants you pick.
- `design-build` is the gateway for building pages/features. It walks up from the CWD for the project's `DESIGN.md` (design rules) and `BUILD.md` (build rules), reads the `COMPONENT_INDEX.md` reuse manifest, and resolves a target: an existing app (found by walking up for `package.json`) is **extended in place**; otherwise a **new app is scaffolded** at the CWD. It analyzes the request (goal, then granular pieces), matches each piece against the index to reuse/adapt/create, writes a `PLAN.md` brief, and builds — DRY-first, modular, mock-data-backed, then updates the index. Reference images are optional; when supplied they add an **exact** (replicate) or **creative** (mood board) follow mode. The `designer` workflow does not need to have been run.

### Companion skill: `scaffold-preact`

For **new** apps, `design-build` delegates the base scaffold to the separate `scaffold-preact` skill when it's installed — it produces the Preact + TypeScript + traditional-SCSS foundation (tab indentation, a persisted UI-state hook, optional client-side caching), which `design-build` then customizes with the project's design rules and the requested feature. If `scaffold-preact` isn't installed, `design-build` falls back to its own bundled scaffolder, so it works either way. Install `scaffold-preact` separately for the richer base.

---

## Contributing / development

```bash
# Install the skills from your local working copy (not from GitHub)
./install.sh --local .

# See what install.sh would do without touching disk
./install.sh --dry-run
```

---

## License

MIT
