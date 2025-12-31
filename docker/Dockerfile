# POKRABS Dockerfile
# Multi-stage build for frontend and backend

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder /app/frontend/index.html ./frontend/

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Install production dependencies
WORKDIR /app/backend
RUN npm ci --production

# Create data directory for SQLite
RUN mkdir -p /app/data

WORKDIR /app
EXPOSE 3000

# Start both frontend and backend
CMD ["node", "backend/dist/index.js"]

