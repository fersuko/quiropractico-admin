# Multi-stage production Dockerfile for Next.js (standalone mode)
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source
COPY . .

# Generate Prisma client and compile Next.js standalone bundle
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build output and static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Create persistent storage folder for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# Run migrations and start the standalone Next.js server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
