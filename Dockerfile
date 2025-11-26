FROM mirror.gcr.io/library/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM mirror.gcr.io/library/node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts

# App listens on 5000; expose matching port
EXPOSE 5000

# Production defaults; use DATABASE_URL to enable Postgres
ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Run migrations on container start if DATABASE_URL is set, then start server
CMD [ "sh", "-c", "node scripts/check-db.js && node dist/index.js" ]