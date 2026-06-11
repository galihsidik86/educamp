# ============================================================
# Tazkia SIAKAD Web — production image
# ------------------------------------------------------------
# Stage 1 (build) : install deps → Vite build (DS dari root via alias)
# Stage 2 (nginx) : serve dist/ + proxy /api → api:4000
# ============================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# build-time configurasi — di prod default `/api` (same-origin via nginx proxy)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspaces --include-workspace-root

# DS source files yang di-alias `@ds` di vite.config.ts
COPY tsconfig.base.json ./
COPY tokens ./tokens
COPY components ./components
COPY assets ./assets
COPY styles.css ./styles.css

COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN npm run build

# ---------- Stage 2: nginx ----------
FROM nginx:1.27-alpine AS runtime

# remove default site & add ours
RUN rm /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# copy built SPA
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# nginx healthcheck inside-container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost/healthz || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
