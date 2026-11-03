# Match the existing production Node major and use glibc for Chromium/ONNX/Sharp.
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22.23.4-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates curl fontconfig fonts-noto-cjk fonts-liberation \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 \
      libpango-1.0-0 libcairo2 libcups2 libxshmfence1 \
      python3 python3-venv libsndfile1 espeak-ng \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@10.14.0

FROM base AS build
ARG TARGETARCH
RUN test "$TARGETARCH" = amd64 || (echo 'Build this release for linux/amd64.' >&2; exit 1)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Compile on the build machine; rendering never triggers a production webpack build.
RUN pnpm build && pnpm build:video && rm -rf .next/cache && pnpm prune --prod
RUN pnpm exec remotion browser ensure \
    && pnpm setup:smart-clean \
    && pnpm setup:compositor \
    && chmod -R a+rX .runtime

FROM base AS runtime
LABEL org.opencontainers.image.title="house-video-studio"
ENV NODE_ENV=production \
    PORT=4340 \
    PREBUILT_VIDEO_BUNDLES=1 \
    STUDIO_TEMPORARY_MEDIA=1 \
    STUDIO_DB_CONFIG=/run/studio/mysql.json \
    STUDIO_SESSION_STORE=/var/lib/studio/sessions/sessions.json \
    STUDIO_SMART_CLEAN_DIR=/app/.runtime/smart-clean \
    STUDIO_COMPOSITOR_DIR=/app/.runtime/compositor \
    NODE_OPTIONS=--max-old-space-size=768
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/tsconfig.json /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/.video-bundles ./.video-bundles
COPY --from=build /app/.runtime ./.runtime
COPY --from=build /app/src ./src
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/public ./public
COPY --from=build /app/deploy/docker/entrypoint.sh /usr/local/bin/studio-entrypoint
RUN mkdir -p /app/data /app/.next/cache /run/studio /var/lib/studio/sessions \
    && chown node:node /app/data /app/.next/cache /var/lib/studio/sessions \
    && chmod 0700 /app/data /var/lib/studio/sessions \
    && chmod 0755 /usr/local/bin/studio-entrypoint
USER node
ENTRYPOINT ["/usr/local/bin/studio-entrypoint"]
CMD ["node", "--import", "tsx", "server/index.ts", "--production"]
