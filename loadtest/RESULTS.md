# Load Test Results

## What was actually run, and why

The task called for k6. k6's binary could not be downloaded in the
build environment — GitHub release assets are blocked by network
policy (only `github.com` itself is reachable, not
`release-assets.githubusercontent.com`), and there was no root access
to `apt-get install` a mirror-provided binary. A real MongoDB
(`mongod`) binary is blocked for the same reason, which also ruled out
`mongodb-memory-server` for integration testing (see `tests/` commit
for that decision).

**What was measured for real, in this environment:** middleware/framework
overhead (helmet, CORS, JSON parsing, cookie parsing, pino request
logging, rate limiting) via `autocannon` — a pure Node.js load tester
with no external binary dependency — against a harness
(`loadtest/harness.mjs`) that mounts the identical middleware stack
used in `api/index.js`, minus the MongoDB connection.

**What is NOT measured here:** MongoDB query latency under load
(`getposts`, `getPostComments`, `signin`, etc). `loadtest/k6-script.js`
is provided, ready to run against a real deployment
(`docker compose up`, which includes a real MongoDB) — run it
yourself and drop the results into this file.

## Result 1 — Middleware stack throughput (`/api/health`)

Command:
```
npx autocannon -c 50 -d 20 -p 10 http://localhost:4000/api/health
```
50 concurrent connections, 10x pipelining, 20 second duration.

| Metric | Value |
|---|---|
| Requests completed | 73,000 in 20.06s |
| Avg throughput | 3,620 req/sec |
| Avg latency | 137.36 ms |
| p50 latency | 129 ms |
| p97.5 latency | 229 ms |
| p99 latency | 257 ms |
| Max latency | 1,709 ms |
| Errors | 0 |

This isolates the cost of the middleware stack itself (helmet, CORS,
body parsing, structured logging) with no database round-trip — it is
the ceiling on throughput for any endpoint, since every request pays
this cost before reaching a controller.

## Result 2 — Rate limiter correctness under load

Command: 400 sequential requests against a route behind `apiLimiter`
(configured for 300 requests / 15 minutes).

| Outcome | Count |
|---|---|
| 200 OK | 300 |
| 429 Too Many Requests | 100 |

Confirms the rate limiter engages at exactly the configured threshold
— the previously-unprotected `/api/auth/signin` and `/signup` endpoints
now have this same protection via `authLimiter` (20 req/15min).

## Next step — full end-to-end load test (not run here)

Run this yourself once Docker is available:

```bash
docker compose up -d
npm run seed   # if you add a seed script — otherwise sign up a test user and create a few posts manually first
k6 run loadtest/k6-script.js
```

This will exercise `getposts` (including the `$regex` search path
flagged in the code review as a scan hotspot at scale) and the full
Mongo-backed request lifecycle, including the new indexes added on
`userId`, `category`, `updatedAt`, and the compound `(postId, createdAt)`
index on comments. Compare p95 latency before/after those indexes by
temporarily dropping them (`db.posts.dropIndexes()`) and re-running.
