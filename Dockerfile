# Bun runtime için Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Dependencies install için
FROM base AS install
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Production image
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Environment variables
ENV NODE_ENV=production

# Port expose et (Koyeb otomatik PORT set eder)
EXPOSE 8080

# Uygulamayı başlat
CMD ["bun", "run", "src/index.ts"]

