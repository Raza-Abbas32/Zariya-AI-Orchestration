# ==========================================
# Stage 1: Build Frontend static assets
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production service runtime
# ==========================================
FROM node:20-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --only=production

# Copy backend files and built frontend assets
COPY server/ ./server/
COPY --from=builder /usr/src/app/dist ./dist

# Keep db files local in runtime volume or directory fallback
RUN mkdir -p server/data && \
    echo "[]" > server/data/bookings.json && \
    echo "[]" > server/data/users.json && \
    echo "{}" > server/data/sessions.json

EXPOSE 3001

CMD ["node", "server/server.js"]
