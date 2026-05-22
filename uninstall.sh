#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${DESIGNER_SKILLS_INSTALL_ROOT:-$HOME/.claude/skills}"
CACHE_DIR="${DESIGNER_SKILLS_CACHE:-$HOME/.cache/vendidit-design-and-build-skills}"
CONFIG="$HOME/.config/designer/config.json"

PURGE=0
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge) PURGE=1; shift;;
    -y|--yes) YES=1; shift;;
    -h|--help)
      echo "Usage: uninstall.sh [--purge] [-y|--yes]"
      echo "  --purge   Also remove the source cache at $CACHE_DIR"
      echo "  -y|--yes  Do not prompt before removing config"
      exit 0;;
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
