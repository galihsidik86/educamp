# ============================================================
# Tazkia SIAKAD API — production image
# ------------------------------------------------------------
# Stage 1 (deps)    : install root + api workspace deps (lockfile-pinned)
# Stage 2 (build)   : prisma generate + tsc compile → dist/
# Stage 3 (runtime) : minimal alpine, non-root, migrate deploy + node
# ============================================================

# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# install all deps incl. dev for tsc + prisma cli
RUN npm ci --workspaces --include-workspace-root

# ---------- Stage 2: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY package.json ./
COPY tsconfig.base.json ./
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# generate prisma client (linux-musl engines) + compile TS
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="Tazkia SIAKAD API" \
      org.opencontainers.image.source="https://github.com/galihsidik86/educamp"

ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

# install openssl runtime needed by prisma engines + curl for healthcheck
RUN apk add --no-cache openssl tini curl

WORKDIR /app

# install only production deps for runtime
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspaces --include-workspace-root --omit=dev \
 && npm cache clean --force

# copy compiled output + prisma schema/migrations
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

# regenerate prisma client against runtime node_modules (engines)
WORKDIR /app/apps/api
RUN npx prisma generate

# non-root user
RUN addgroup -S app && adduser -S app -G app \
 && chown -R app:app /app
USER app

EXPOSE 4000

# tini for proper PID 1 signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4000/health || exit 1
