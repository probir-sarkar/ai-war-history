# ========================================
# Build Stage
# ========================================
FROM oven/bun:latest AS build

WORKDIR /app

COPY . .

RUN bun install

RUN bun run build

# ========================================
# Production Stage
# ========================================
FROM oven/bun:latest

WORKDIR /app

ENV NODE_ENV=production

# Copy only build output
COPY --from=build /app/.output ./.output

USER bun
EXPOSE 3000/tcp

CMD ["bun", "run", ".output/server/index.mjs"]