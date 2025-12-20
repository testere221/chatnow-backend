# Node.js base image
FROM node:20-alpine AS builder

WORKDIR /app

# Package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY backend/ ./

# Runtime
FROM node:20-alpine

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
