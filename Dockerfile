# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

# ── Stage 2: deps (install all workspace dependencies) ────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib/db/package.json                 lib/db/
COPY lib/api-zod/package.json            lib/api-zod/
COPY lib/api-spec/package.json           lib/api-spec/
COPY lib/api-client-react/package.json   lib/api-client-react/
COPY artifacts/api-server/package.json   artifacts/api-server/
COPY artifacts/satara-dashboard/package.json artifacts/satara-dashboard/
COPY artifacts/mockup-sandbox/package.json   artifacts/mockup-sandbox/
COPY scripts/package.json                scripts/
RUN pnpm install --frozen-lockfile

# ── Stage 3: migrate (schema push — run once on first deploy) ─────────────────
FROM deps AS migrate
COPY lib/ ./lib/
CMD ["pnpm", "--filter", "@workspace/db", "push"]

# ── Stage 4: build (compile API + Vite frontend) ──────────────────────────────
FROM deps AS build
COPY . .
RUN NODE_ENV=production PORT=3000 \
    pnpm --filter @workspace/satara-dashboard run build
RUN pnpm --filter @workspace/api-server run build

# ── Stage 5: prune (production-only node_modules for runtime) ──────────────────
FROM deps AS prune
RUN pnpm --filter @workspace/api-server deploy --prod /app/pruned

# ── Stage 6: runtime (minimal production image) ───────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/artifacts/api-server/dist      ./dist
COPY --from=build /app/artifacts/satara-dashboard/dist/public ./public
COPY --from=prune /app/pruned/node_modules             ./node_modules
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
