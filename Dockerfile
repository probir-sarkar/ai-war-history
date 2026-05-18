# ========================================
# Build Stage
# ========================================
FROM dhi.io/node:24-alpine3.22-dev AS build

WORKDIR /app

RUN corepack enable
RUN corepack use pnpm@latest-11


COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm build

# ========================================
# Production Stage
# ========================================
FROM dhi.io/node:24-alpine3.22

WORKDIR /app

ENV NODE_ENV=production

# Copy only build output
COPY --from=build /app/.output ./.output


EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]