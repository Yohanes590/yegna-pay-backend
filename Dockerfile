# Stage 1: Install production-only dependencies
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Install all dependencies, generate Prisma Client, and compile TypeScript
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json app.ts server.ts ./
COPY lib ./lib
COPY middlewares ./middlewares
COPY routes ./routes
COPY service ./service

RUN npm run build

# Stage 3: Minimal production runtime image
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY package.json error-page.html ./
COPY prisma ./prisma

# Install Chromium and OS runtime dependencies required by bank Playwright scrapers
RUN ./node_modules/.bin/playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/uploads/qr-receipts \
    && chown -R node:node /app /ms-playwright

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]

