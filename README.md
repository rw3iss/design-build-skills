# @vendidit/design-and-build-skills

Two Claude Code skills that work together to turn a design brief into a working Preact app:

1. **`designer`** — takes a prompt, generates design images via Midjourney through a Discord bot, saves them into a per-request folder.
2. **`design-build`** — takes a folder of images (plus optional extra guidance) and scaffolds a Preact + TypeScript + SCSS app that matches them, including a mandatory mock-data layer so the output is demoable with no backend.

Status: **implemented, v0.0.1-alpha.** Design doc: [`docs/specs/2026-04-17-design-to-app-workflow-design.md`](./docs/specs/2026-04-17-design-to-app-workflow-design.md). Implementation plan: [`docs/plans/2026-04-17-design-to-app-workflow-implementation.md`](./docs/plans/2026-04-17-design-to-app-workflow-implementation.md).

---

## Install

This repo is private, so `raw.githubusercontent.com` URLs won't work without a token. Two options — pick whichever applies:

### Option A — GitHub CLI (`gh`)

If you have the [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`), this is the cleanest one-liner:

```bash
gh api repos/Vendidit/tools/contents/packages/design-and-build-skills/install.sh \
  --jq '.content' | base64 -d | bash
```

The script downloads itself, does a sparse SSH clone of only this package into a local cache, copies the skill files into `~/.claude/skills/`, and runs `npm install`. Nothing else is needed on your machine beyond Node ≥22, git, npm, and rsync.

### Option B — Clone the repo first

```bash
git clone git@github.com:Vendidit/tools.git
cd tools/packages/design-and-build-skills
./install.sh
```

---

**`design-build` is ready to use immediately after install** — no Discord credentials or other setup required. Give it any image (file path, folder, or indices from a prior designer run) and it works.

The Discord setup below is only needed if you also want the **`designer`** skill (Midjourney image generation).

---

## Updating

The first install leaves a cache at `~/.cache/vendidit-design-and-build-skills`. After that you never need the repo again:

```bash
# No repo, no clone — uses the cached installer + SSH automatically
~/.cache/vendidit-design-and-build-skills/packages/design-and-build-skills/install.sh --update

# Or via gh CLI (same as initial install one-liner, just add --update)
gh api repos/Vendidit/tools/contents/packages/design-and-build-skills/install.sh \
  --jq '.content' | base64 -d | bash -s -- --update

# Update a single skill only
~/.cache/vendidit-design-and-build-skills/packages/design-and-build-skills/install.sh --update --skill design-build
~/.cache/vendidit-design-and-build-skills/packages/design-and-build-skills/install.sh --update --skill designer
```

`--update` does a shallow re-fetch via SSH, re-rsync's both skill directories, and reruns `npm ci`. Your `~/.config/designer/config.json` is never modified.

---

## Discord setup (one-time, `designer` skill only)

> **Skip this section if you only want `design-build`** (image → Preact app, no Midjourney). Run `designer setup --skip-discord` instead to verify tools are in place.

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

---

## What it does, quickly

- `designer` reads a brief, walks up from your CWD for a `DESIGN.md`, merges project rules into a Midjourney-ready prompt, fires `/imagine` through a bot you own, waits for the reply, downloads the 2×2 grid, splits it into four variant images, and stores everything under `./designs/<request-name>/`.
- `designer upscale <request-name> <indices...>` goes back and clicks U1–U4 on the original Midjourney post to get true high-res upscales of the variants you pick.
- `design-build` accepts images from any source — numeric indices into a prior designer output, any image folder, or explicit file paths (single or multiple). It walks up for a `BUILD.md`, produces a `PLAN.md`, scaffolds `app/` with config/, src/, styles/, services/api/, and mock/ — then Claude fills in component bodies and mock fixtures based on the images. Two build modes: **exact** (mandatory zone-by-zone layout analysis, pixel-accurate replication) and **creative** (design as mood board, Claude invents a bolder layout in the same aesthetic). The `designer` workflow does not need to have been run to use `design-build`.

---

## Monorepo position

This package lives inside [`@vendidit/tools`](../../) as a sibling of `broken-link-crawler` and `test-tools`. It does not publish to a registry — the skills ship via `install.sh` which copies them into `~/.claude/skills/`.

---

## Contributing / development

```bash
cd packages/design-and-build-skills

# Install the skills from your local working copy (not from GitHub)
./install.sh --local .

# See what install.sh would do without touching disk
./install.sh --dry-run
```

---

## License

MIT
