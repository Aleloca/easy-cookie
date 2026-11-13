# syntax=docker/dockerfile:1
# easy-cookie consent server. Build from the repository root:
#   docker build -f apps/server/Dockerfile -t easy-cookie-server .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /repo

# ---- build: install the workspace, build core + console + server ----------------
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Browser runtime assets served under /static (easy-cookie.iife.js, easy-cookie.css),
# plus the legal documents stylesheet from @easy-cookie/policy (easy-cookie-legal.css).
RUN pnpm --filter @easy-cookie/core build && pnpm --filter @easy-cookie/policy build \
  && cp packages/policy/dist/easy-cookie-legal.css packages/core/dist/
# Admin console SPA served under /admin (skipped if the app is not in the tree).
RUN if [ -f apps/console/package.json ]; then pnpm --filter @easy-cookie/console build; else mkdir -p apps/console/dist; fi
RUN pnpm --filter @easy-cookie/server build
# Standalone production install of the server (bundled code + runtime deps only).
RUN pnpm --filter @easy-cookie/server deploy --prod --legacy /prod/server \
  && cd /prod/server && ./node_modules/.bin/prisma generate

# ---- runtime ---------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    STATIC_DIR=/app/static \
    CONSOLE_DIR=/app/console
WORKDIR /app/server
COPY --from=build /prod/server /app/server
COPY --from=build /repo/packages/core/dist /app/static
COPY --from=build /repo/apps/console/dist /app/console
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
