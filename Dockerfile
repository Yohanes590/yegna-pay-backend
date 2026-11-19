# Stage 1: Install production-only dependencies
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Install all dependencies, generate Prisma Client, and compile TypeScript
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.* tsconfig.json app.ts server.ts ./
COPY config ./config
COPY modules ./modules
COPY lib ./lib
COPY middlewares ./middlewares
COPY routes ./routes
COPY service ./service
COPY src ./src

RUN npm run build

# Stage 3: Minimal production runtime image
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY package.json error-page.html ./
COPY prisma ./prisma
COPY src ./src

# Install Chromium and OS runtime dependencies required by bank Playwright scrapers
RUN ./node_modules/.bin/playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/uploads/qr-receipts \
    && chown -R node:node /app /ms-playwright

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
