# syntax=docker/dockerfile:1.7

# Multi-stage build for production

FROM node:20 AS deps
ENV npm_config_fetch_retries=5 \
	npm_config_fetch_retry_mintimeout=20000 \
	npm_config_fetch_retry_maxtimeout=120000 \
	npm_config_fetch_timeout=600000 \
	npm_config_prefer_offline=true \
	npm_config_progress=false \
	npm_config_audit=false \
	npm_config_fund=false \
	CYPRESS_INSTALL_BINARY=0
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only build/runtime dependencies to avoid pulling heavy test tooling in CI
RUN --mount=type=cache,target=/root/.npm \
	set -eux; \
	heartbeat() { while true; do echo "[docker] frontend npm ci is still running..."; sleep 20; done; }; \
	for attempt in 1 2 3; do \
		heartbeat & heartbeat_pid=$!; \
		if npm ci --omit=dev --prefer-offline; then \
			status=0; \
		else \
			status=$?; \
		fi; \
		kill "$heartbeat_pid" || true; \
		wait "$heartbeat_pid" 2>/dev/null || true; \
		if [ "$status" -eq 0 ]; then \
			exit 0; \
		fi; \
		echo "npm ci failed on attempt ${attempt}; retrying after backoff..."; \
		rm -rf node_modules; \
		if [ "$attempt" -eq 3 ]; then \
			exit "$status"; \
		fi; \
		sleep $((attempt * 15)); \
	done

# Stage 1: Development (for docker-compose)
FROM deps AS development

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 2: Build the application
FROM deps AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Production image
FROM node:20 AS production

WORKDIR /app
ENV NODE_ENV=production \
	PORT=80

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts/serve-dist.mjs ./serve-dist.mjs

# Expose port 80
EXPOSE 80

# Start static server
CMD ["node", "./serve-dist.mjs"]
