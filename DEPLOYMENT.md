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
13. Provisions a seeded read-only `demo` tenant for `demo.mirai-edu.space` and a separate private `test` school tenant for `test.mirai-edu.space`.
14. Starts the backend and frontend containers.

The backend container runs through `tsx` in production mode so deployment is not blocked by the repository's current strict TypeScript type errors.

## 6. Configure Cloudflare Tunnel

The deployment script can now automate both cloudflared service installation and Cloudflare DNS creation. The simplest case is to provide the tunnel token plus a Cloudflare API token for the zone:

```bash
export CLOUDFLARE_TUNNEL_TOKEN='<YOUR_TUNNEL_TOKEN>'
export CLOUDFLARE_API_TOKEN='<YOUR_CLOUDFLARE_API_TOKEN>'
export CLOUDFLARE_ZONE_NAME='mirai-edu.space'
```

`scripts/setup-ubuntu.sh` can derive the tunnel UUID directly from `CLOUDFLARE_TUNNEL_TOKEN`, so `CLOUDFLARE_TUNNEL_ID` is optional.

If you prefer to pin the tunnel UUID explicitly, you can still set:

```bash
export CLOUDFLARE_TUNNEL_ID='<YOUR_TUNNEL_UUID>'
```

If you prefer to resolve the tunnel by account metadata instead of hardcoding the tunnel UUID, use this pair instead of `CLOUDFLARE_TUNNEL_ID`:

```bash
export CLOUDFLARE_ACCOUNT_ID='<YOUR_CLOUDFLARE_ACCOUNT_ID>'
export CLOUDFLARE_TUNNEL_NAME='erp-saas'
```

Optional: if your API token cannot list zones, provide the zone ID directly:

```bash
export CLOUDFLARE_ZONE_ID='<YOUR_ZONE_ID>'
```

When these variables are present, `scripts/setup-ubuntu.sh` will:

1. Render `/etc/cloudflared/config.yml` from `cloudflared/config.yml.example`
2. Install and start the `cloudflared` systemd service using the tunnel token
3. Upsert Cloudflare DNS records for `mirai-edu.space`, `*.mirai-edu.space`, and `api.mirai-edu.space`
4. If the API token also has tunnel-management access, sync the remote tunnel ingress to `api.mirai-edu.space`, `mirai-edu.space`, and a final catch-all origin rule so tenant subdomains work behind the wildcard DNS record

The script treats these permissions independently: a token with DNS scopes will upsert the public CNAME records, and a token with tunnel-management scopes will update the remote-managed tunnel ingress. A single token may provide both, but it no longer has to.

That wildcard DNS record means future tenants such as `demo.mirai-edu.space`, `test.mirai-edu.space`, and any new `<tenant>.mirai-edu.space` subdomain resolve without adding anything manually in Cloudflare. For locally managed tunnels, the ingress should use a final catch-all origin rule, not a wildcard hostname entry, so those tenant hosts fall through to Caddy.

Important: if the tunnel itself was created as a remotely managed Zero Trust tunnel, Cloudflare can still override the local ingress config and keep only the public hostnames stored on the Cloudflare side. In that case a zone-scoped DNS token is not enough to add tenant routes; you also need a Cloudflare API token with tunnel-management permissions or UI access to update the tunnel hostnames.

If you are creating a brand new tunnel from scratch instead, the manual fallback is still:

```bash
cloudflared tunnel login
cloudflared tunnel create erp-saas
cloudflared tunnel route dns erp-saas mirai-edu.space
cloudflared tunnel route dns erp-saas '*.mirai-edu.space'
cloudflared tunnel route dns erp-saas api.mirai-edu.space
```

Use `cloudflared/config.yml.example` from the repository as the source of truth for ingress rules. It keeps explicit entries for the marketing apex and API host, then ends with a catch-all `service: http://127.0.0.1:80` so tenant subdomains route through the same tunnel to Caddy. If Cloudflare reports a different active ingress after the connector starts, the tunnel is being remotely managed and you must update the Cloudflare-side hostname list as well.

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
docker compose exec -T postgres psql -U erp -d erp_demo -c 'select email, role from "User";'
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
- `*.mirai-edu.space` -> wildcard Cloudflare DNS -> Cloudflare Tunnel catch-all origin -> Caddy -> frontend for `/`, backend for `/api` and `/ws`; the backend resolves the tenant from the request host so subdomains like `demo.mirai-edu.space` and `test.mirai-edu.space` work directly
- `api.mirai-edu.space` -> optional dedicated API hostname -> Cloudflare Tunnel -> Caddy -> `127.0.0.1:4000`

The root-domain API route injects `X-Tenant-Subdomain: mirai`, so the backend can resolve the tenant correctly without needing a separate API DNS record. If you later create `api.mirai-edu.space`, the dedicated API site in Caddy can serve the same backend separately.
