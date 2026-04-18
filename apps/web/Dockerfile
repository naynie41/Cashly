# ─── Stage 1: Dependencies ──────
FROM node:20-alpine AS deps

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile


# ─── Stage 2: Builder ────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY package.json pnpm-workspace.yaml ./

# Build the Next.js app
# NEXT_TELEMETRY_DISABLED skips the build-time telemetry prompt
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build


# ─── Stage 3: Runner ───
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output — copies only what's needed to run
# Requires `output: 'standalone'` in next.config.js (see note below)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public          ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# NOTE: standalone output puts the server at apps/web/server.js
CMD ["node", "apps/web/server.js"]
