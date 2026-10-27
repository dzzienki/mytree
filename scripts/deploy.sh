#!/usr/bin/env bash
# Build (and restart) mytree on the server.
#
#   ./scripts/deploy.sh            pull latest, install, sync DB, build, restart
#   ./scripts/deploy.sh --no-pull  same, but skip `git pull` (deploy what is checked out)
#
# Run from anywhere; it always operates on the repo this script lives in.
# The app runs as a systemd *user* unit (scripts/systemd/mytree.service), so it can also be
# controlled directly:  systemctl --user {status|restart|stop} mytree   /   journalctl --user -u mytree -f
# Env overrides: PORT (default 3100; 3000 is often taken by other apps), PM2_NAME (legacy pm2 app to retire, default mytree).
set -euo pipefail

cd "$(dirname "$0")/.."
DIR="$(pwd -P)"

PM2_NAME="${PM2_NAME:-mytree}"
PORT="${PORT:-3100}"
UNIT_NAME="mytree"
UNIT_TPL="$DIR/scripts/systemd/$UNIT_NAME.service"
UNIT_DST="$HOME/.config/systemd/user/$UNIT_NAME.service"
PULL=1
[ "${1:-}" = "--no-pull" ] && PULL=0

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

step "Checking environment"
command -v node >/dev/null || fail "node is not installed"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || fail "Node.js 20+ is required (found $(node -v))"
[ -f .env ] || fail ".env is missing. Run: cp .env.example .env  and fill in DATABASE_URL and JWT_SECRET"
command -v systemctl >/dev/null && systemctl --user show-environment >/dev/null 2>&1 \
  || fail "systemctl --user is not available (log in via SSH/console so the user session exists)"

# Read values without sourcing the file, so special characters in passwords are not interpreted.
env_value() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
[ -n "$(env_value DATABASE_URL)" ] || fail "DATABASE_URL is empty in .env"
[ "$(env_value JWT_SECRET | wc -c)" -ge 33 ] || fail "JWT_SECRET must be 32+ characters (generate: openssl rand -base64 48)"

if [ "$PULL" -eq 1 ]; then
  step "Pulling latest code"
  git pull --ff-only
fi

step "Installing dependencies (also runs prisma generate)"
npm ci

# Without --accept-data-loss, prisma refuses any change that would drop data, so this is safe to run every time.
step "Syncing database schema"
npm run db:push

step "Building"
npm run build

# One-time migration: retire the old pm2 app so it releases the port before systemd takes over.
if command -v pm2 >/dev/null && pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  step "Retiring legacy pm2 app '$PM2_NAME'"
  pm2 delete "$PM2_NAME" >/dev/null
  pm2 save >/dev/null
fi

step "Installing systemd user unit"
mkdir -p "$(dirname "$UNIT_DST")"
TMP_UNIT="$(mktemp)"
sed -e "s|@DIR@|$DIR|g" -e "s|@PORT@|$PORT|g" -e "s|@NODE_BIN@|$(dirname "$(command -v node)")|g" \
  "$UNIT_TPL" > "$TMP_UNIT"
if ! cmp -s "$TMP_UNIT" "$UNIT_DST"; then
  install -m 644 "$TMP_UNIT" "$UNIT_DST"
  systemctl --user daemon-reload
  echo "installed: $UNIT_DST"
fi
rm -f "$TMP_UNIT"
systemctl --user enable "$UNIT_NAME" >/dev/null 2>&1
if [ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null)" != "yes" ]; then
  echo "WARN: to keep it running after logout/reboot, run once: sudo loginctl enable-linger $USER"
fi

step "Restarting on port $PORT"
systemctl --user restart "$UNIT_NAME"
sleep 2
systemctl --user is-active --quiet "$UNIT_NAME" || {
  systemctl --user status "$UNIT_NAME" --no-pager -n 20 || true
  fail "$UNIT_NAME failed to start"
}
systemctl --user status "$UNIT_NAME" --no-pager -n 5 || true

step "Done"
