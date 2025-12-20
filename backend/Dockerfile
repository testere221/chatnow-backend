# Node.js base image (Chainguard - Docker Hub yok)
FROM cgr.dev/chainguard/node:20 AS builder

WORKDIR /app

# Package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Runtime
FROM cgr.dev/chainguard/node:20

WORKDIR /app

# Copy from builder
COPY --from=builder /app /app

# Environment
ENV NODE_ENV=production
# PORT environment variable Koyeb tarafından otomatik set edilir
# Backend kodunda process.env.PORT || 3000 kullanılıyor

# Koyeb PORT'u otomatik set eder, ama expose için bir port belirtmeliyiz
EXPOSE 8080

# Start
CMD ["node", "index.js"]

