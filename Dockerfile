# Node.js base image for Railway backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./

# Runtime
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app /app

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start
CMD ["node", "index.js"]
