# ── Stage 1: build the React client ─────────────────────────────
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./

# Vite inlines VITE_* env vars into the bundle at build time (not runtime) —
# must be passed as a build ARG. Railway auto-forwards a service Variable
# as a build ARG when the Dockerfile declares an ARG of the same name, so
# set VITE_FIREBASE_API_KEY in Railway's Variables tab to make this work.
ARG VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY

RUN npm run build

# ── Stage 2: install server dependencies ────────────────────────
FROM node:20-alpine AS server-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: runtime image ──────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S verity -u 1001

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY api/ ./api/
COPY --from=client-build /app/client/dist ./client/dist

USER verity

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/index.js"]
