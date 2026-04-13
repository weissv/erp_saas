#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/erp_saas}"
ENV_FILE="${ENV_FILE:-/etc/erp-saas/backend.env}"
BRANCH="${BRANCH:-main}"
RUN_USER="${RUN_USER:-izu}"
USER_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

run_as_user() {
  runuser -u "$RUN_USER" -- env HOME="$USER_HOME" bash -lc "$1"
}

cd "$APP_DIR"
run_as_user "cd '$APP_DIR' && git fetch origin '$BRANCH' >/dev/null"
local_sha="$(run_as_user "cd '$APP_DIR' && git rev-parse HEAD")"
remote_sha="$(run_as_user "cd '$APP_DIR' && git rev-parse origin/$BRANCH")"

if [ "${FORCE_DEPLOY:-0}" != "1" ] && [ "$local_sha" = "$remote_sha" ]; then
  echo "[autodeploy] No new commits on origin/$BRANCH"
  exit 0
fi

echo "[autodeploy] Deploying $remote_sha"
run_as_user "cd '$APP_DIR' && git checkout '$BRANCH' >/dev/null 2>&1 && git pull --ff-only origin '$BRANCH'"
install -o "$RUN_USER" -g "$RUN_USER" -m 600 "$ENV_FILE" "$APP_DIR/backend/.env"
install -m 644 "$APP_DIR/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy
run_as_user "cd '$APP_DIR' && docker compose build backend frontend"
run_as_user "cd '$APP_DIR' && docker compose up -d postgres redis"
run_as_user "cd '$APP_DIR' && docker compose run --rm backend npm run prisma:master:push"
run_as_user "cd '$APP_DIR' && docker compose run --rm backend npm run prisma:tenant:deploy"
run_as_user "cd '$APP_DIR' && docker compose run --rm backend npm run bootstrap:mirai"
run_as_user "cd '$APP_DIR' && docker compose up -d backend frontend"
echo "[autodeploy] Deploy complete at $(date -Iseconds)"