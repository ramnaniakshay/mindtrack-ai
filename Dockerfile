# Stage 1: Frontend Build
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY db.js server.js safety.js gemini.js ./
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
