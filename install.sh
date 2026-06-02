#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${DESIGNER_SKILLS_REPO:-git@github.com:rw3iss/design-build-skills.git}"
REPO_REF="${DESIGNER_SKILLS_REF:-main}"
CACHE_DIR="${DESIGNER_SKILLS_CACHE:-$HOME/.cache/design-build-skills}"
INSTALL_ROOT="${DESIGNER_SKILLS_INSTALL_ROOT:-$HOME/.claude/skills}"
COMMANDS_ROOT="${DESIGNER_SKILLS_COMMANDS_ROOT:-$HOME/.claude/commands}"

DRY_RUN=0
UPDATE=0
SKILL_FILTER=""
LOCAL_PATH=""
SOURCE_DIR=""

usage() {
  cat <<EOF
Usage: install.sh [options]
  --update                  Re-fetch and re-install (idempotent)
  --ref <sha|tag|branch>    Pin to a revision (default: \$REPO_REF or main)
  --skill <name>            Only install one of: designer, design-build
  --local <path>            Install from a local checkout (skip git fetch)
  --dry-run                 Print actions without touching disk
  -h, --help                Show this help

Environment overrides:
  DESIGNER_SKILLS_REPO, DESIGNER_SKILLS_REF, DESIGNER_SKILLS_CACHE,
  DESIGNER_SKILLS_INSTALL_ROOT, DESIGNER_SKILLS_COMMANDS_ROOT
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

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

preflight() {
  command -v git   >/dev/null || die "git not found (need ≥2.25 for sparse-checkout)"
  command -v node  >/dev/null || die "node not found (need ≥22)"
  command -v npm   >/dev/null || die "npm not found"
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

fetch_source() {
  if [[ -n "$LOCAL_PATH" ]]; then
    local abs
    abs=$(cd "$LOCAL_PATH" && pwd)
    if [[ -f "$abs/install.sh" && -d "$abs/skills" ]]; then
      SOURCE_DIR="$abs"
    else
      die "--local $LOCAL_PATH does not look like the repo root (missing install.sh or skills/)"
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
    log "cloning $REPO_URL @ $REPO_REF into $CACHE_DIR"
    run "git clone --depth 1 --branch '$REPO_REF' '$REPO_URL' '$CACHE_DIR'"
  fi
  SOURCE_DIR="$CACHE_DIR"
  if [[ $DRY_RUN -eq 0 ]]; then
    [[ -d "$SOURCE_DIR/skills" ]] || die "source missing $SOURCE_DIR/skills after fetch"
  fi
}

install_skills() {
  local skills=(designer design-build)
  if [[ -n "$SKILL_FILTER" ]]; then
    skills=("$SKILL_FILTER")
  fi

  for name in "${skills[@]}"; do
    local src="$SOURCE_DIR/skills/$name"
    local dst="$INSTALL_ROOT/$name"

    if [[ $DRY_RUN -eq 0 ]]; then
      [[ -d "$src" ]] || die "skill source missing: $src"
    fi

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

# Install the /design and /build slash commands. Runs on both fresh installs and
# --update (so existing installations pick up new/changed commands), and respects
# --skill (designer → /design, design-build → /build). cp overwrites so updates
# refresh the command bodies.
install_commands() {
  local src_dir="$SOURCE_DIR/commands"
  if [[ ! -d "$src_dir" ]]; then
    warn "no commands/ in source — skipping slash-command install"
    return
  fi

  local cmds=(design.md build.md)
  case "$SKILL_FILTER" in
    designer)     cmds=(design.md);;
    design-build) cmds=(build.md);;
  esac

  run "mkdir -p '$COMMANDS_ROOT'"
  local installed=()
  for c in "${cmds[@]}"; do
    if [[ -f "$src_dir/$c" || $DRY_RUN -eq 1 ]]; then
      run "cp '$src_dir/$c' '$COMMANDS_ROOT/$c'"
      installed+=("/${c%.md}")
    fi
  done
  log "installed commands into $COMMANDS_ROOT: ${installed[*]:-none}"
}

post_install() {
  local config="$HOME/.config/designer/config.json"
  printf '\n'
  log "installed skills:"
  for name in designer design-build; do
    if [[ -d "$INSTALL_ROOT/$name" ]]; then
      local v="unknown"
      [[ -f "$INSTALL_ROOT/$name/VERSION" ]] && v=$(cat "$INSTALL_ROOT/$name/VERSION")
      printf '  - %-14s  (v%s)\n' "$name" "$v"
    fi
  done
  for c in design build; do
    [[ -f "$COMMANDS_ROOT/$c.md" ]] && printf '  - /%-13s (slash command)\n' "$c"
  done
  printf '\n'

  # design-build works immediately — no Discord setup needed.
  if [[ -z "$SKILL_FILTER" || "$SKILL_FILTER" == "design-build" ]]; then
    printf '  design-build is ready to use right now — no Discord setup required.\n'
    printf '  Give it any image (file path, folder, or indices from a prior\n'
    printf '  designer run) and Claude will scaffold a Preact app from it.\n\n'
  fi

  if [[ ! -f "$config" ]]; then
    if [[ "$SKILL_FILTER" == "design-build" ]]; then
      printf '  To also use the designer skill (Midjourney image generation), install\n'
      printf '  it and run:  ~/.claude/skills/designer/bin/designer setup\n\n'
      return
    fi
    log "designer skill: one-time Discord setup required for image generation"
    cat <<EOF

  You need three things in place to use the designer skill:
    (a) a Discord application with a bot (in the developer portal)
    (b) a Discord server you own, with both your custom bot AND
        the Midjourney bot invited into it
    (c) "Message Content Intent" enabled on your bot so it can read
        Midjourney's replies

  ─────────────────────────────────────────────────────────────────────
  STEP 1 — Create your Discord application + bot
  ─────────────────────────────────────────────────────────────────────
    • Open:  https://discord.com/developers/applications
    • Click "New Application", give it a name (e.g. "Design Ingest").
    • Left sidebar → "Bot":
        - Click "Reset Token" and COPY the token now. You will not be
          able to see it again. Save it somewhere safe — you'll paste
          it during STEP 5.
        - Scroll to "Privileged Gateway Intents" and TOGGLE ON:
            [x] Message Content Intent
          Without this the bot cannot read Midjourney's replies.

  ─────────────────────────────────────────────────────────────────────
  STEP 2 — Create (or pick) a Discord server you own
  ─────────────────────────────────────────────────────────────────────
    In the Discord app, click the "+" button at the bottom of the
    server list on the left → "Create My Own" → "For me and my friends".
    Name it whatever you like.

  ─────────────────────────────────────────────────────────────────────
  STEP 3 — Invite YOUR bot into that server
  ─────────────────────────────────────────────────────────────────────
    Back in the developer portal:
    • Left sidebar → "OAuth2" → "URL Generator"
    • Under "Scopes", check:
        [x] bot
        [x] applications.commands
    • A "Bot Permissions" section appears. Check:
        [x] View Channels
        [x] Read Message History
        [x] Send Messages
        [x] Use Application Commands
    • Scroll to the bottom, COPY the "Generated URL".
    • Paste it into your browser, select your server, click Authorize.
    • Confirm your bot now appears in the server's member list.

  ─────────────────────────────────────────────────────────────────────
  STEP 4 — Invite the Midjourney bot into the SAME server
  ─────────────────────────────────────────────────────────────────────
    You need an active Midjourney subscription first:
        https://www.midjourney.com/account
    Then, either:
      (a) From the Midjourney account page, use "Invite the Bot" and
          choose your server; OR
      (b) In Discord, open "Explore Apps" → search "Midjourney Bot" →
          "Add to Server".

  ─────────────────────────────────────────────────────────────────────
  STEP 5 — Run the setup check
  ─────────────────────────────────────────────────────────────────────
    ~/.claude/skills/designer/bin/designer setup

    It will ask for:
      • Your bot token        (from STEP 1)
      • Your server (guild) ID
      • Your channel ID       (the channel where Midjourney lives)

    To copy server/channel IDs: enable Developer Mode in Discord
    (User Settings → Advanced → Developer Mode), then right-click
    the server icon or a channel name → "Copy Server ID" / "Copy
    Channel ID".

    It will also ask whether to use "manual" or "user-token" trigger
    mode. Default: manual (safe, ToS-compliant). Only pick user-token
    if you accept the Discord Terms of Service risk to your personal
    account — the prompt will require explicit acknowledgment.

  ─────────────────────────────────────────────────────────────────────
  When done, your config will live at:
    \$HOME/.config/designer/config.json

EOF
  else
    log "config present at $config — you're ready to use the designer skill"
    printf '\n'
    printf 'To re-verify Discord connectivity, or to change trigger mode:\n'
    printf '  ~/.claude/skills/designer/bin/designer setup\n\n'
  fi
}

log "preflight checks"
preflight

log "fetching source"
fetch_source
log "source ready at: $SOURCE_DIR"

log "installing skills into $INSTALL_ROOT"
install_skills

log "installing slash commands into $COMMANDS_ROOT"
install_commands

if [[ $DRY_RUN -eq 0 ]]; then
  post_install
fi
