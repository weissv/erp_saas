# Ubuntu Deployment Guide

## 1. Connect to the server

```bash
ssh izu@192.168.1.4
```

## 2. Clone the repository

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/weissv/erp_saas.git
cd erp_saas
```

## 3. Review the production env files

Backend runtime values live in `backend/.env`.

Frontend build-time values live in `frontend/.env.production`.

The setup script will auto-generate `POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`, and `INITIAL_ADMIN_PASSWORD` if they still have placeholder values.

## 4. Run the Ubuntu setup script

```bash
sudo -E bash scripts/setup-ubuntu.sh
```

If you want to override domains or paths, export them before running the script:

```bash
export FRONTEND_DOMAIN=mirai-edu.space
export API_DOMAIN=api.mirai-edu.space
export APP_DIR=/opt/erp_saas
sudo -E bash scripts/setup-ubuntu.sh
```

## 5. What the script does

It performs these actions in order:

1. Installs Docker Engine and the Docker Compose plugin.
2. Installs Caddy from the official APT repository.
3. Installs cloudflared from the official Cloudflare package repository.
4. Clones or updates the repository.
5. Normalizes `backend/.env` and `frontend/.env.production`.
6. Copies `Caddyfile` to `/etc/caddy/Caddyfile` and reloads Caddy.
7. Builds the backend and frontend images.
8. Starts PostgreSQL and Redis.
9. Creates `erp_master` if it does not exist.
10. Runs `npm run prisma:master:push` for the control-plane schema.
11. Runs `npm run prisma:tenant:deploy` for the tenant schema, falling back to `prisma db push` when the repository has no Prisma migration folders.
12. Runs `npm run bootstrap:mirai` to create or update the `mirai` tenant and the first admin user.
13. Provisions a seeded `test` school tenant with demo ERP/LMS data and fixed login defaults (`admin` / `change_me_123`) unless you override the `TEST_TENANT_*` env vars.
14. Starts the backend and frontend containers.

The backend container runs through `tsx` in production mode so deployment is not blocked by the repository's current strict TypeScript type errors.

## 6. Configure Cloudflare Tunnel

If you already have a Cloudflare Tunnel token from the dashboard, the fastest path is:

```bash
sudo cloudflared service install <YOUR_TUNNEL_TOKEN>
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

If you are creating a brand new tunnel from scratch instead, run these commands after the setup script finishes:

```bash
cloudflared tunnel login
cloudflared tunnel create erp-saas
sudo cp /etc/cloudflared/config.yml.example /etc/cloudflared/config.yml
sudo nano /etc/cloudflared/config.yml
cloudflared tunnel route dns erp-saas mirai-edu.space
cloudflared tunnel route dns erp-saas '*.mirai-edu.space'
cloudflared tunnel route dns erp-saas api.mirai-edu.space
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Use `cloudflared/config.yml.example` from the repository as the source of truth for the ingress rules. It now includes a wildcard `*.mirai-edu.space` ingress so tenant subdomains such as `test.mirai-edu.space` resolve through the same tunnel.

## 7. Validate the deployment locally on the server

Check containers:

```bash
cd /opt/erp_saas
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Check Caddy routing before Cloudflare DNS propagates:

```bash
curl -H 'Host: mirai-edu.space' http://127.0.0.1/
curl -H 'Host: mirai-edu.space' http://127.0.0.1/api/health
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:4000/api/health
```

Check database bootstrap:

```bash
docker compose exec -T postgres psql -U erp -d erp_master -c 'select id, subdomain, name, status from tenants;'
docker compose exec -T postgres psql -U erp -d erp_db -c 'select email, role from "User";'
docker compose exec -T postgres psql -U erp -d erp_test -c 'select email, role from "User";'
```

## 8. Common operational commands

Restart the stack:

```bash
cd /opt/erp_saas
docker compose up -d --build
sudo systemctl reload caddy
```

Stop the stack:

```bash
cd /opt/erp_saas
docker compose down
```

Tail logs:

```bash
cd /opt/erp_saas
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

## 9. DNS and routing model

- `mirai-edu.space` -> Cloudflare Tunnel -> Caddy -> frontend for `/`, backend for `/api` and `/ws`; frontend production build uses relative `/api` requests to avoid scheme-based CORS issues
- `*.mirai-edu.space` -> Cloudflare Tunnel -> Caddy -> frontend for `/`, backend for `/api` and `/ws`; the backend resolves the tenant from the request host so subdomains like `test.mirai-edu.space` work directly
- `api.mirai-edu.space` -> optional dedicated API hostname -> Cloudflare Tunnel -> Caddy -> `127.0.0.1:4000`

The root-domain API route injects `X-Tenant-Subdomain: mirai`, so the backend can resolve the tenant correctly without needing a separate API DNS record. If you later create `api.mirai-edu.space`, the dedicated API site in Caddy can serve the same backend separately.
