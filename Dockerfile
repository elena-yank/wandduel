FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# App listens on 5000; expose matching port
EXPOSE 5000

# Production defaults; use DATABASE_URL to enable Postgres
ENV NODE_ENV=production
ENV PORT=5000
ENV FORCE_MEMORY_STORAGE=true

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

CMD [ "node", "dist/index.js" ]