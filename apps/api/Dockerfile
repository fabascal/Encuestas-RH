# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace=@portal/shared --workspace=@portal/api --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=@portal/shared \
  && npm run build --workspace=@portal/api

# Production-only node_modules (no devDependencies) to keep the runtime image lean.
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace=@portal/shared --workspace=@portal/api --include-workspace-root

FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]

FROM runtime AS api
CMD ["node", "dist/server.js"]

FROM runtime AS worker
CMD ["node", "dist/worker.js"]
