#!/usr/bin/env bash
# Deploy the consent server to a VPS running nginx + pm2 + Postgres (no Docker).
#
#   scripts/deploy-pm2.sh <ssh-host> [app-dir] [pm2-name]
#
# One-time setup on the host (see apps/server/README.md):
#   <app-dir>/shared/.env       DATABASE_URL, HOST=127.0.0.1, PORT, PUBLIC_URL, TRUST_PROXY=true,
#                               STATIC_DIR/POLICY_DIR/CONSOLE_DIR pointing into <app-dir>/current, ADMIN_*
#   <app-dir>/ecosystem.config.cjs  pm2 app with cwd <app-dir>/current/apps/server, script dist/index.js
#   nginx vhost proxying to 127.0.0.1:<PORT>, overwriting X-Forwarded-For with $remote_addr
#
# Each run uploads the committed HEAD into releases/<timestamp>, builds it there, applies migrations,
# smoke-tests it on a spare port, then swaps the `current` symlink and reloads pm2. Rollback: point
# `current` at a previous release and `pm2 reload <pm2-name>`.
set -euo pipefail

HOST=${1:?usage: deploy-pm2.sh <ssh-host> [app-dir] [pm2-name]}
APP=${2:-/var/www/easy-cookie}
NAME=${3:-consent.aleloca.dev}
REL=$(date +%Y%m%d-%H%M%S)

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean: only committed code is deployed." >&2
  exit 1
fi

echo "→ uploading $(git rev-parse --short HEAD) to $HOST:$APP/releases/$REL"
git archive --format=tar HEAD | ssh "$HOST" "mkdir -p $APP/releases/$REL && tar -x -C $APP/releases/$REL"

ssh "$HOST" "APP=$APP REL=$REL NAME=$NAME bash -s" <<'REMOTE'
set -euo pipefail
cd "$APP/releases/$REL"
ln -s "$APP/shared/.env" apps/server/.env
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=true
echo "→ install + build"
pnpm install --frozen-lockfile >/dev/null
pnpm --filter @easy-cookie/core build >/dev/null
pnpm --filter @easy-cookie/policy build >/dev/null
cp packages/policy/dist/easy-cookie-legal.css packages/core/dist/
pnpm --filter @easy-cookie/console build >/dev/null
pnpm --filter @easy-cookie/server build >/dev/null

echo "→ migrations"
(cd apps/server && ./node_modules/.bin/prisma migrate deploy >/dev/null)

echo "→ smoke test on :8799"
(cd apps/server && PORT=8799 HOST=127.0.0.1 \
  STATIC_DIR="$APP/releases/$REL/packages/core/dist" \
  POLICY_DIR="$APP/releases/$REL/packages/policy/dist" \
  CONSOLE_DIR="$APP/releases/$REL/apps/console/dist" \
  node dist/index.js >/tmp/easy-cookie-smoke.log 2>&1 &
  echo $! > /tmp/easy-cookie-smoke.pid)
sleep 4
ok=0
curl -fsS http://127.0.0.1:8799/health >/dev/null && curl -fsS -o /dev/null http://127.0.0.1:8799/admin/ && ok=1
kill "$(cat /tmp/easy-cookie-smoke.pid)" 2>/dev/null || true
if [ "$ok" != 1 ]; then
  echo "Smoke test failed; current release untouched. Log:" >&2
  cat /tmp/easy-cookie-smoke.log >&2
  exit 1
fi

echo "→ switch + reload"
ln -sfn "$APP/releases/$REL" "$APP/current.tmp" && mv -T "$APP/current.tmp" "$APP/current"
pm2 reload "$NAME" --update-env >/dev/null || pm2 start "$APP/ecosystem.config.cjs" >/dev/null
pm2 save >/dev/null
sleep 3
curl -fsS "http://127.0.0.1:$(sed -n 's/^PORT=//p' "$APP/shared/.env")/health"; echo

# Keep the last 5 releases.
ls -1dt "$APP"/releases/* | tail -n +6 | xargs -r rm -rf
REMOTE
echo "✓ deployed $REL"
