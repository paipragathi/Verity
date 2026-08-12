# Verity

A full-stack MERN content management / blogging platform — React
(Vite, Redux Toolkit, Tailwind) frontend, Express + MongoDB backend,
JWT + Firebase authentication.

See [`CHANGELOG.md`](./CHANGELOG.md) for a full production-readiness
upgrade log (bug fixes, security hardening, indexing, tests, load
test results) and [`loadtest/RESULTS.md`](./loadtest/RESULTS.md) for
measured performance numbers.

## Local development

```bash
cp .env.example .env   # fill in MONGO, JWT_SECRET, etc.
npm install
npm install --prefix client

npm run dev             # API on :3000 (nodemon)
npm run dev --prefix client   # Vite dev server on :5173
```

## Run with Docker (includes local MongoDB)

```bash
docker compose up --build
```

App available at `http://localhost:3000`.

## Tests

```bash
npm test              # run the Jest suite
npm run test:coverage # with coverage report
```

## Load testing

```bash
# Middleware-only (no DB required) — already run, see loadtest/RESULTS.md
npx autocannon -c 50 -d 20 http://localhost:4000/api/health

# Full end-to-end against a real running instance (requires Docker/k6)
k6 run loadtest/k6-script.js
```
