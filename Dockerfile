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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Run migrations on container start if DATABASE_URL is set, then start server
CMD [ "sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then echo 'Running db:push...'; npm run db:push; else echo 'Skipping db:push (no DATABASE_URL)'; fi; node dist/index.js" ]