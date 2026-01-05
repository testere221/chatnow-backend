# Node.js base image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy chatnow-backend package files
COPY chatnow-backend/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy chatnow-backend source code
COPY chatnow-backend/ ./

# Runtime
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app /app

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start - Elysia/Bun backend uses src/index.ts
CMD ["node", "src/index.js"]
