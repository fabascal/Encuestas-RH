# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@portal/shared --workspace=@portal/web --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@portal/shared \
  && npm run build --workspace=@portal/web

FROM nginx:1.27-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
RUN chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/run \
  && touch /var/run/nginx.pid && chown app:app /var/run/nginx.pid
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
