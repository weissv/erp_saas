#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -d "$REPO_ROOT/.git" ]]; then
  DEFAULT_APP_DIR="$REPO_ROOT"
else
  DEFAULT_APP_DIR="/opt/erp_saas"
fi

APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
REPO_URL="${REPO_URL:-https://github.com/weissv/erp_saas.git}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-izu}}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-mirai-edu.space}"
API_DOMAIN="${API_DOMAIN:-api.mirai-edu.space}"
BASE_DOMAIN="${BASE_DOMAIN:-mirai-edu.space}"

BACKEND_ENV_FILE="$APP_DIR/backend/.env"
FRONTEND_ENV_FILE="$APP_DIR/frontend/.env.production"
CADDYFILE_SOURCE="$APP_DIR/Caddyfile"
CADDYFILE_DEST="/etc/caddy/Caddyfile"
CLOUDFLARED_SOURCE="$APP_DIR/cloudflared/config.yml.example"
CLOUDFLARED_DIR="/etc/cloudflared"
CLOUDFLARED_CONFIG_DEST="$CLOUDFLARED_DIR/config.yml"
CLOUDFLARED_EXAMPLE_DEST="$CLOUDFLARED_DIR/config.yml.example"
CLOUDFLARED_TOKEN_FILE="$CLOUDFLARED_DIR/tunnel-token"
CLOUDFLARE_API_BASE="${CLOUDFLARE_API_BASE:-https://api.cloudflare.com/client/v4}"

GENERATED_ADMIN_PASSWORD=""

log() {
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$*"
}

run_compose() {
  (cd "$APP_DIR" && docker compose "$@")
}

decode_cloudflare_tunnel_token_field() {
  local field="$1"

  if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
    return 1
  fi

  python3 - "$field" "$CLOUDFLARE_TUNNEL_TOKEN" <<'PY'
import base64
import json
import sys

field = sys.argv[1]
token = sys.argv[2].strip()
padding = '=' * (-len(token) % 4)
payload = json.loads(base64.urlsafe_b64decode(token + padding))
value = payload.get(field)
if not value:
    raise SystemExit(1)
print(value)
PY
}

cloudflare_api_request() {
  local method="$1"
  local endpoint="$2"
  local payload="${3:-}"

  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "CLOUDFLARE_API_TOKEN is required for Cloudflare API automation" >&2
    return 1
  fi

  local curl_args=(
    -fsS
    -X "$method"
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
    -H "Content-Type: application/json"
  )

  if [[ -n "$payload" ]]; then
    curl_args+=(--data "$payload")
  fi

  curl "${curl_args[@]}" "${CLOUDFLARE_API_BASE}${endpoint}"
}

resolve_cloudflare_zone_id() {
  if [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
    printf '%s\n' "$CLOUDFLARE_ZONE_ID"
    return
  fi

  local zone_name="${CLOUDFLARE_ZONE_NAME:-$BASE_DOMAIN}"
  cloudflare_api_request \
    GET \
    "/zones?name=$(printf '%s' "$zone_name" | jq -sRr @uri)&status=active" \
    | jq -er '.result[0].id'
}

resolve_cloudflare_tunnel_id() {
  if [[ -n "${CLOUDFLARE_TUNNEL_ID:-}" ]]; then
    printf '%s\n' "$CLOUDFLARE_TUNNEL_ID"
    return
  fi

  if decode_cloudflare_tunnel_token_field t >/dev/null 2>&1; then
    decode_cloudflare_tunnel_token_field t
    return
  fi

  if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" && -n "${CLOUDFLARE_TUNNEL_NAME:-}" ]]; then
    cloudflare_api_request \
      GET \
      "/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel?name=$(printf '%s' "$CLOUDFLARE_TUNNEL_NAME" | jq -sRr @uri)" \
      | jq -er '.result[0].id'
    return
  fi

  echo "Set CLOUDFLARE_TUNNEL_TOKEN or CLOUDFLARE_TUNNEL_ID or CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_TUNNEL_NAME for automated tunnel setup" >&2
  return 1
}

resolve_cloudflare_account_id() {
  if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    printf '%s\n' "$CLOUDFLARE_ACCOUNT_ID"
    return
  fi

  if decode_cloudflare_tunnel_token_field a >/dev/null 2>&1; then
    decode_cloudflare_tunnel_token_field a
    return
  fi

  echo "Set CLOUDFLARE_ACCOUNT_ID or provide a CLOUDFLARE_TUNNEL_TOKEN that can be decoded for remote tunnel config sync" >&2
  return 1
}

upsert_cloudflare_cname_record() {
  local zone_id="$1"
  local hostname="$2"
  local target="$3"

  local existing_response
  existing_response="$({ cloudflare_api_request GET "/zones/${zone_id}/dns_records?name=$(printf '%s' "$hostname" | jq -sRr @uri)"; } )"

  local record_id
  record_id="$(printf '%s' "$existing_response" | jq -r '.result[0].id // empty')"

  local payload
  payload="$(jq -nc --arg type "CNAME" --arg name "$hostname" --arg content "$target" '{type:$type,name:$name,content:$content,proxied:true,ttl:1}')"

  if [[ -n "$record_id" ]]; then
    cloudflare_api_request PUT "/zones/${zone_id}/dns_records/${record_id}" "$payload" | jq -e '.success == true' >/dev/null
    log "Updated Cloudflare DNS record ${hostname} -> ${target}"
    return
  fi

  cloudflare_api_request POST "/zones/${zone_id}/dns_records" "$payload" | jq -e '.success == true' >/dev/null
  log "Created Cloudflare DNS record ${hostname} -> ${target}"
}

sync_cloudflare_remote_tunnel_config() {
  local account_id="$1"
  local tunnel_id="$2"

  local payload
  payload="$(jq -nc \
    --arg api_domain "$API_DOMAIN" \
    --arg frontend_domain "$FRONTEND_DOMAIN" \
    '{config:{ingress:[{service:"http://localhost:80",hostname:$api_domain,originRequest:{}},{service:"http://localhost:80",hostname:$frontend_domain,originRequest:{}},{service:"http://localhost:80",originRequest:{}}],"warp-routing":{enabled:false}}}')"

  local response
  if response="$(cloudflare_api_request PUT "/accounts/${account_id}/cfd_tunnel/${tunnel_id}/configurations" "$payload" 2>/dev/null)"; then
    printf '%s' "$response" | jq -e '.success == true' >/dev/null
    log "Synced remote Cloudflare tunnel ingress for ${tunnel_id}"
    return
  fi

  log "Skipping remote Cloudflare tunnel ingress sync because CLOUDFLARE_API_TOKEN lacks tunnel-management access"
}

replace_env_line() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi

  rm -f "${file}.bak"
}

install_base_packages() {
  log "Installing base packages"
  apt-get update
  apt-get install -y ca-certificates curl gnupg lsb-release git openssl jq
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker and Docker Compose plugin already installed"
    systemctl enable --now docker
    return
  fi

  log "Installing Docker Engine and Compose plugin"
  install_base_packages
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker

  if id "$DEPLOY_USER" >/dev/null 2>&1; then
    usermod -aG docker "$DEPLOY_USER" || true
  fi
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    log "Caddy already installed"
    systemctl enable --now caddy
    return
  fi

  log "Installing Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  chmod o+r /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
  systemctl enable --now caddy
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    log "cloudflared already installed"
    return
  fi

  log "Installing cloudflared"
  install -m 0755 -d /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  . /etc/os-release
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared ${VERSION_CODENAME} main" \
    | tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  apt-get update
  apt-get install -y cloudflared
}

ensure_repo() {
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Updating repository in $APP_DIR"
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" pull --ff-only
  else
    log "Cloning repository into $APP_DIR"
    install -d -m 0755 "$(dirname "$APP_DIR")"
    git clone "$REPO_URL" "$APP_DIR"
  fi
}

configure_env_files() {
  if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
    echo "Missing backend env file: $BACKEND_ENV_FILE" >&2
    exit 1
  fi

  if [[ ! -f "$FRONTEND_ENV_FILE" ]]; then
    echo "Missing frontend env file: $FRONTEND_ENV_FILE" >&2
    exit 1
  fi

  local db_user="${POSTGRES_USER:-erp}"
  local db_name="${POSTGRES_DB:-erp_db}"
  local master_db_name="${MASTER_POSTGRES_DB:-erp_master}"
  local db_password="${POSTGRES_PASSWORD:-}"
  local jwt_secret="${JWT_SECRET:-}"
  local encryption_key="${ENCRYPTION_KEY:-}"
  local admin_email="${INITIAL_ADMIN_EMAIL:-admin@${FRONTEND_DOMAIN}}"
  local admin_password="${INITIAL_ADMIN_PASSWORD:-}"
  local tenant_subdomain="${INITIAL_TENANT_SUBDOMAIN:-mirai}"
  local tenant_name="${INITIAL_TENANT_NAME:-Mirai ERP}"

  if [[ -z "$db_password" || "$db_password" == "CHANGE_ME_DB_PASSWORD" ]]; then
    db_password="$(openssl rand -hex 18)"
  fi

  if [[ -z "$jwt_secret" || "$jwt_secret" == "CHANGE_ME_JWT_SECRET" ]]; then
    jwt_secret="$(openssl rand -base64 48 | tr -d '\n')"
  fi

  if [[ -z "$encryption_key" || "$encryption_key" == "CHANGE_ME_64_CHAR_HEX" ]]; then
    encryption_key="$(openssl rand -hex 32)"
  fi

  if [[ -z "$admin_password" || "$admin_password" == "CHANGE_ME_INITIAL_ADMIN_PASSWORD" ]]; then
    admin_password="$(openssl rand -base64 24 | tr -d '\n')"
    GENERATED_ADMIN_PASSWORD="$admin_password"
  fi

  replace_env_line "$BACKEND_ENV_FILE" "POSTGRES_USER" "$db_user"
  replace_env_line "$BACKEND_ENV_FILE" "POSTGRES_PASSWORD" "$db_password"
  replace_env_line "$BACKEND_ENV_FILE" "POSTGRES_DB" "$db_name"
  replace_env_line "$BACKEND_ENV_FILE" "MASTER_POSTGRES_DB" "$master_db_name"
  replace_env_line "$BACKEND_ENV_FILE" "DATABASE_URL" "postgresql://${db_user}:${db_password}@postgres:5432/${db_name}?schema=public"
  replace_env_line "$BACKEND_ENV_FILE" "MASTER_DATABASE_URL" "postgresql://${db_user}:${db_password}@postgres:5432/${master_db_name}?schema=public"
  replace_env_line "$BACKEND_ENV_FILE" "REDIS_URL" "redis://redis:6379"
  replace_env_line "$BACKEND_ENV_FILE" "BASE_DOMAIN" "$BASE_DOMAIN"
  replace_env_line "$BACKEND_ENV_FILE" "CORS_ORIGINS" "https://${FRONTEND_DOMAIN},http://${FRONTEND_DOMAIN}"
  replace_env_line "$BACKEND_ENV_FILE" "FRONTEND_URL" "https://${FRONTEND_DOMAIN}"
  replace_env_line "$BACKEND_ENV_FILE" "PUBLIC_EXAM_BASE_URL" "https://${FRONTEND_DOMAIN}/exam"
  replace_env_line "$BACKEND_ENV_FILE" "BILLING_PAGE_URL" "https://${FRONTEND_DOMAIN}/billing"
  replace_env_line "$BACKEND_ENV_FILE" "JWT_SECRET" "$jwt_secret"
  replace_env_line "$BACKEND_ENV_FILE" "ENCRYPTION_KEY" "$encryption_key"
  replace_env_line "$BACKEND_ENV_FILE" "INITIAL_TENANT_SUBDOMAIN" "$tenant_subdomain"
  replace_env_line "$BACKEND_ENV_FILE" "INITIAL_TENANT_NAME" "$tenant_name"
  replace_env_line "$BACKEND_ENV_FILE" "INITIAL_ADMIN_EMAIL" "$admin_email"
  replace_env_line "$BACKEND_ENV_FILE" "INITIAL_ADMIN_PASSWORD" "$admin_password"

  replace_env_line "$FRONTEND_ENV_FILE" "VITE_API_URL" "/"
  replace_env_line "$FRONTEND_ENV_FILE" "VITE_TELEGRAM_BOT_NAME" "${VITE_TELEGRAM_BOT_NAME:-erp_bot}"

  export POSTGRES_USER="$db_user"
  export POSTGRES_PASSWORD="$db_password"
  export POSTGRES_DB="$db_name"
  export MASTER_POSTGRES_DB="$master_db_name"
  export INITIAL_ADMIN_EMAIL="$admin_email"
}

sync_caddyfile() {
  log "Installing Caddy configuration"
  install -m 0644 "$CADDYFILE_SOURCE" "$CADDYFILE_DEST"
  caddy validate --config "$CADDYFILE_DEST"
  systemctl reload caddy

  install -d -m 0755 "$CLOUDFLARED_DIR"
  install -m 0644 "$CLOUDFLARED_SOURCE" "$CLOUDFLARED_EXAMPLE_DEST"
}

sync_cloudflared_config() {
  local tunnel_id="$1"
  local rendered_config

  rendered_config="$(mktemp)"
  sed "s/REPLACE_WITH_TUNNEL_ID/${tunnel_id}/g" "$CLOUDFLARED_SOURCE" > "$rendered_config"
  install -m 0644 "$rendered_config" "$CLOUDFLARED_CONFIG_DEST"
  rm -f "$rendered_config"
}

configure_cloudflared_service() {
  local cloudflared_bin="$1"

  if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
    log "Skipping cloudflared service install because CLOUDFLARE_TUNNEL_TOKEN is not set"
    return
  fi

  log "Configuring cloudflared systemd service"
  printf '%s\n' "$CLOUDFLARE_TUNNEL_TOKEN" > "$CLOUDFLARED_TOKEN_FILE"
  chmod 0600 "$CLOUDFLARED_TOKEN_FILE"

  cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${cloudflared_bin} --config ${CLOUDFLARED_CONFIG_DEST} tunnel --no-autoupdate run --token-file ${CLOUDFLARED_TOKEN_FILE}
Restart=always
RestartSec=5s
User=root

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now cloudflared
}

configure_cloudflare_tunnel() {
  local tunnel_id=""

  if tunnel_id="$(resolve_cloudflare_tunnel_id 2>/dev/null)"; then
    log "Rendering cloudflared config for tunnel ${tunnel_id}"
    sync_cloudflared_config "$tunnel_id"

    local cloudflared_bin
    cloudflared_bin="$(command -v cloudflared)"
    configure_cloudflared_service "$cloudflared_bin"

    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
      local account_id
      local tunnel_target="${tunnel_id}.cfargotunnel.com"

      local zone_id
      if zone_id="$(resolve_cloudflare_zone_id 2>/dev/null)"; then
        upsert_cloudflare_cname_record "$zone_id" "$FRONTEND_DOMAIN" "$tunnel_target"
        upsert_cloudflare_cname_record "$zone_id" "*.${BASE_DOMAIN}" "$tunnel_target"
        upsert_cloudflare_cname_record "$zone_id" "$API_DOMAIN" "$tunnel_target"
      else
        log "Skipping Cloudflare DNS automation because CLOUDFLARE_API_TOKEN lacks zone DNS access"
      fi

      if account_id="$(resolve_cloudflare_account_id 2>/dev/null)"; then
        sync_cloudflare_remote_tunnel_config "$account_id" "$tunnel_id"
      else
        log "Skipping remote Cloudflare tunnel ingress sync because account id could not be resolved"
      fi
    else
      log "Skipping Cloudflare DNS automation because CLOUDFLARE_API_TOKEN is not set"
    fi

    return
  fi

  log "Cloudflare tunnel automation is disabled; set CLOUDFLARE_TUNNEL_ID or CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_TUNNEL_NAME"
}

wait_for_postgres() {
  log "Waiting for PostgreSQL to become ready"
  local attempt=0
  until run_compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d postgres >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ "$attempt" -ge 30 ]]; then
      echo "PostgreSQL did not become ready in time" >&2
      exit 1
    fi
    sleep 2
  done
}

ensure_databases() {
  log "Ensuring tenant and master databases exist"

  if [[ "$(run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${MASTER_POSTGRES_DB}'")" != "1" ]]; then
    run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${MASTER_POSTGRES_DB}\""
  fi

  if [[ "$(run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'")" != "1" ]]; then
    run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\""
  fi
}

provision_seeded_tenant() {
  local subdomain="$1"
  local tenant_name="$2"
  local database_name="$3"
  local admin_email="$4"
  local admin_password="$5"

  local database_url="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${database_name}?schema=public"
  local master_database_url="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${MASTER_POSTGRES_DB}?schema=public"

  log "Ensuring database for tenant '${subdomain}' exists"
  if [[ "$(run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${database_name}'")" != "1" ]]; then
    run_compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${database_name}\""
  fi

  log "Applying tenant schema for '${subdomain}'"
  run_compose run --rm \
    -e DATABASE_URL="$database_url" \
    backend npm run prisma:tenant:deploy

  log "Seeding tenant '${subdomain}'"
  run_compose run --rm \
    -e DATABASE_URL="$database_url" \
    backend npx prisma db seed

  log "Registering tenant '${subdomain}'"
  run_compose run --rm \
    -e MASTER_DATABASE_URL="$master_database_url" \
    -e DATABASE_URL="$database_url" \
    -e INITIAL_TENANT_SUBDOMAIN="$subdomain" \
    -e INITIAL_TENANT_NAME="$tenant_name" \
    -e INITIAL_ADMIN_EMAIL="$admin_email" \
    -e INITIAL_ADMIN_PASSWORD="$admin_password" \
    backend npm run bootstrap:mirai
}

deploy_stack() {
  log "Validating Compose configuration"
  run_compose config >/dev/null

  log "Building application images"
  run_compose build backend frontend

  log "Starting PostgreSQL and Redis"
  run_compose up -d postgres redis
  wait_for_postgres
  ensure_databases

  log "Applying master schema"
  run_compose run --rm backend npm run prisma:master:push

  log "Applying tenant schema"
  run_compose run --rm backend npm run prisma:tenant:deploy

  log "Bootstrapping initial tenant and admin"
  run_compose run --rm backend npm run bootstrap:mirai

  local demo_tenant_subdomain="${DEMO_TENANT_SUBDOMAIN:-demo}"
  local demo_tenant_name="${DEMO_TENANT_NAME:-Demo School}"
  local demo_tenant_db="${DEMO_TENANT_DB:-erp_demo}"
  local demo_admin_email="${DEMO_TENANT_ADMIN_EMAIL:-demo-admin@test.local}"
  local demo_admin_password="${DEMO_TENANT_ADMIN_PASSWORD:-MiraiDemo_2026!}"
  local test_tenant_subdomain="${TEST_TENANT_SUBDOMAIN:-test}"
  local test_tenant_name="${TEST_TENANT_NAME:-Test School}"
  local test_tenant_db="${TEST_TENANT_DB:-erp_test}"
  local test_admin_email="${TEST_TENANT_ADMIN_EMAIL:-admin@test.local}"
  local test_admin_password="${TEST_TENANT_ADMIN_PASSWORD:-MiraiTest_2026!}"

  provision_seeded_tenant \
    "$demo_tenant_subdomain" \
    "$demo_tenant_name" \
    "$demo_tenant_db" \
    "$demo_admin_email" \
    "$demo_admin_password"

  provision_seeded_tenant \
    "$test_tenant_subdomain" \
    "$test_tenant_name" \
    "$test_tenant_db" \
    "$test_admin_email" \
    "$test_admin_password"

  log "Starting backend and frontend"
  run_compose up -d backend frontend
}

print_next_steps() {
  log "Deployment completed"
  echo "Application directory: $APP_DIR"
  echo "Frontend URL: https://${FRONTEND_DOMAIN}"
  echo "Public API URL: https://${FRONTEND_DOMAIN}/api"
  echo "Optional dedicated API URL: https://${API_DOMAIN}"
  echo "Demo URL: https://${DEMO_TENANT_SUBDOMAIN:-demo}.${FRONTEND_DOMAIN}"
  echo "Test school URL: https://${TEST_TENANT_SUBDOMAIN:-test}.${FRONTEND_DOMAIN}"
  echo "Test school login: ${TEST_TENANT_ADMIN_EMAIL:-admin@test.local}"
  echo "Test school password: ${TEST_TENANT_ADMIN_PASSWORD:-MiraiTest_2026!}"
  echo
  if [[ -n "${CLOUDFLARE_TUNNEL_ID:-}" || ( -n "${CLOUDFLARE_ACCOUNT_ID:-}" && -n "${CLOUDFLARE_TUNNEL_NAME:-}" ) ]]; then
    echo "Cloudflare automation: enabled"
    echo "  - cloudflared config: ${CLOUDFLARED_CONFIG_DEST}"
    if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
      echo "  - cloudflared systemd service: configured"
    else
      echo "  - set CLOUDFLARE_TUNNEL_TOKEN to auto-install the cloudflared service"
    fi
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
      echo "  - Cloudflare DNS records upserted for ${FRONTEND_DOMAIN}, *.${BASE_DOMAIN}, ${API_DOMAIN}"
    else
      echo "  - set CLOUDFLARE_API_TOKEN plus CLOUDFLARE_ZONE_ID or CLOUDFLARE_ZONE_NAME to auto-create DNS records"
    fi
  else
    echo "Cloudflare Tunnel next steps:"
    echo "  1. Export CLOUDFLARE_TUNNEL_ID or CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_TUNNEL_NAME"
    echo "  2. Export CLOUDFLARE_TUNNEL_TOKEN to auto-install the cloudflared service"
    echo "  3. Export CLOUDFLARE_API_TOKEN plus CLOUDFLARE_ZONE_ID or CLOUDFLARE_ZONE_NAME to auto-create DNS records"
    echo "  4. Re-run this script"
    echo "     The script will render ${CLOUDFLARED_CONFIG_DEST} and upsert ${FRONTEND_DOMAIN}, *.${BASE_DOMAIN}, ${API_DOMAIN} automatically"
  fi
  echo
  if [[ -n "$GENERATED_ADMIN_PASSWORD" ]]; then
    echo "Initial admin email: ${INITIAL_ADMIN_EMAIL}"
    echo "Initial admin password: $GENERATED_ADMIN_PASSWORD"
    echo "Rotate this password after first login."
  fi
}

main() {
  install_base_packages
  install_docker
  install_caddy
  install_cloudflared
  ensure_repo
  configure_env_files
  sync_caddyfile
  configure_cloudflare_tunnel
  deploy_stack
  print_next_steps
}

main "$@"
