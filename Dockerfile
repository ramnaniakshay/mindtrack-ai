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

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY db.js server.js safety.js gemini.js ./

RUN chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
