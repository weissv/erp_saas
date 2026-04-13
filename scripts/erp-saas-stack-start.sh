#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/erp_saas}"
ENV_FILE="${ENV_FILE:-/etc/erp-saas/backend.env}"
RUN_USER="${RUN_USER:-izu}"
USER_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

run_as_user() {
  runuser -u "$RUN_USER" -- env HOME="$USER_HOME" bash -lc "$1"
}

cd "$APP_DIR"
install -o "$RUN_USER" -g "$RUN_USER" -m 600 "$ENV_FILE" "$APP_DIR/backend/.env"
install -m 644 "$APP_DIR/Caddyfile" /etc/caddy/Caddyfile
systemctl restart caddy
run_as_user "cd '$APP_DIR' && docker compose config >/dev/null"
run_as_user "cd '$APP_DIR' && docker compose up -d"
echo "[boot] Stack ensured at $(date -Iseconds)"