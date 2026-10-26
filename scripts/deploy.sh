#!/usr/bin/env bash
# Build (and restart) mytree on the server.
#
#   ./scripts/deploy.sh            pull latest, install, sync DB, build, restart
#   ./scripts/deploy.sh --no-pull  same, but skip `git pull` (deploy what is checked out)
#
# Run from anywhere; it always operates on the repo this script lives in.
# Env overrides: PM2_NAME (default mytree), PORT (default 3100; 3000 is often taken by other apps).
set -euo pipefail

cd "$(dirname "$0")/.."

PM2_NAME="${PM2_NAME:-mytree}"
PORT="${PORT:-3100}"
PULL=1
[ "${1:-}" = "--no-pull" ] && PULL=0

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

step "Checking environment"
command -v node >/dev/null || fail "node is not installed"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || fail "Node.js 20+ is required (found $(node -v))"
[ -f .env ] || fail ".env is missing. Run: cp .env.example .env  and fill in DATABASE_URL and JWT_SECRET"

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

step "Restarting on port $PORT"
if command -v pm2 >/dev/null; then
  # Delete + start (instead of restart) so a changed port or name always takes effect.
  pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
  pm2 start npm --name "$PM2_NAME" -- start -- -p "$PORT"
  pm2 save
  pm2 status "$PM2_NAME"
else
  printf 'pm2 not found. Build finished; start the server manually with: npm run start -- -p %s\n' "$PORT"
fi

step "Done"
