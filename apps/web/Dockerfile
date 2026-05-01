# ─── Dev stage: hot reload via bind mount (selected by docker-compose.override.yml)
FROM node:20-alpine AS dev

RUN npm install -g pnpm

WORKDIR /app

# Pre-install deps inside the image so the container starts immediately.
# Source code is bind-mounted at runtime; only node_modules live in the image.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1
# Bind-mounted file events on Windows/macOS Docker Desktop don't reach Linux
# inotify reliably — fall back to polling so next dev picks up edits.
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "dev"]


# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests + lockfile + base tsconfig for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile


# ─── Stage 2: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy root configs and lockfile (needed by pnpm for workspace resolution)
COPY --from=deps /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/tsconfig.base.json ./

# Copy hoisted node_modules + per-workspace symlinks
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source
COPY packages/types ./packages/types
COPY apps/web ./apps/web

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ─── Stage 3: Runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Alpine BusyBox flags — link nextjs user to nodejs group with -G
RUN addgroup -S -g 1001 nodejs \
 && adduser  -S -u 1001 -G nodejs nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output — requires `output: 'standalone'` in next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public          ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"


CMD ["node", "apps/web/server.js"]
