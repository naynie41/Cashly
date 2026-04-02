# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

# Install ALL deps (including devDependencies — needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy shared types package
COPY packages/types ./packages/types

# Copy API source
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter api exec prisma generate

# Compile TypeScript
RUN pnpm --filter api exec tsc --project tsconfig.json

# Prune to production deps only
RUN pnpm --filter api --prod deploy /app/pruned


# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

WORKDIR /app

# Copy pruned production node_modules
COPY --from=builder /app/pruned/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./dist

# Copy Prisma schema + generated client (needed at runtime)
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma

# Copy package.json (needed by some runtime resolvers)
COPY --from=builder /app/apps/api/package.json ./package.json

# Puppeteer: install Chromium deps on Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
 && echo "Chromium installed for Puppeteer"

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER fastify

EXPOSE 3001

# Entrypoint: run the compiled server
CMD ["node", "dist/index.js"]
