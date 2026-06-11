#!/usr/bin/env bash
set -eu

cd "$(dirname "$0")/.."

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# 1. --help exits 0 and mentions expected flags
out=$(./install.sh --help 2>&1)
echo "$out" | grep -q -- "--dry-run" || fail "help missing --dry-run"
echo "$out" | grep -q -- "--skill"   || fail "help missing --skill"
echo "$out" | grep -q -- "--local"   || fail "help missing --local"
pass "install.sh --help"

# 2. --local <bogus> dies with clear message
tmp=$(mktemp -d)
out=$(./install.sh --local "$tmp" --dry-run 2>&1 || true)
echo "$out" | grep -q "does not look like" || fail "missing skills/ should be rejected, got: $out"
pass "install.sh rejects invalid --local path"
rm -rf "$tmp"

# 3. --skill foo is rejected
out=$(./install.sh --skill foo --dry-run 2>&1 || true)
echo "$out" | grep -q "must be 'design' or 'build'" || fail "invalid --skill not rejected, got: $out"
pass "install.sh rejects invalid --skill"

# 4. uninstall.sh --help works
out=$(./uninstall.sh --help 2>&1)
echo "$out" | grep -q -- "--purge" || fail "uninstall help missing --purge"
pass "uninstall.sh --help"

# 5. update.sh forwards to install.sh --update (--help passes through)
out=$(./update.sh --help 2>&1 || true)
echo "$out" | grep -q -- "--update" || fail "update.sh didn't pass through to install.sh --help"
pass "update.sh forwards args"

echo
echo "all install-script tests passed"
