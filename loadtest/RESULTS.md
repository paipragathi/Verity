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

## Result 3 — Full end-to-end k6 run against the live Railway deployment

Run by the project owner (not in the sandboxed build environment —
k6's binary is blocked there, see note above) against the actual
deployed app at Railway, with a real MongoDB Atlas connection:

```bash
k6 run -e BASE_URL=https://<railway-app-url> loadtest/k6-script.js
```

Scenario: ramping virtual users, 0 -> 50 over 20s, hold 50 for 40s,
ramp down over 10s (70s total steady-load window). Each iteration
hits `/api/health`, `/api/post/getposts?limit=9`, and
`/api/post/getposts?searchTerm=test` (the `$regex` search path).

| Metric | Value |
|---|---|
| Total requests | 3,120 |
| Total iterations | 1,040 (0 interrupted) |
| Throughput | 43.47 req/sec |
| Error rate | **0.00%** (0 failed requests out of 3,120) |
| Checks passed | **100%** (4,160/4,160 — every health/getposts/search assertion) |
| avg latency | 563.11 ms |
| p90 latency | 800.26 ms |
| **p95 latency** | **858.38 ms** |
| max latency | 1.91 s |
| Max concurrent VUs | 50 |

**Threshold result: `p(95)<500ms` — FAILED** (actual: 858.38ms).
`http_req_failed rate<1%` — passed (actual: 0.00%).

### What this honestly means

Reliability is excellent — every single request succeeded under 50
concurrent users sustained for 70 seconds, zero errors, zero timeouts.
Latency under load is higher than the 500ms target I set going in.
Likely contributors, in rough order of impact:

1. **Free-tier hosting on both ends** — Railway's free/hobby compute
   tier and MongoDB Atlas's M0 free cluster are both intentionally
   resource-constrained (shared CPU, low IOPS). This is expected
   behavior for free-tier infrastructure under concurrent load, not
   evidence of a code-level bug.
2. **Cross-provider network latency** — Atlas and Railway are
   different providers/regions unless deliberately co-located; every
   request pays that round-trip on top of query time.
3. **The `$regex` search path** — flagged earlier in the code review
   as unable to use a standard index for unanchored substring
   matching. Under concurrent load this is the most likely single
   largest per-request cost among the three endpoints hit.
4. **No caching layer** — `getposts()` hits MongoDB on every request,
   including the same query repeated across VUs. A Redis cache in
   front of frequently-read queries (documented as a known follow-up
   in CHANGELOG.md) would directly reduce this.

None of this contradicts the indexing work already done — those
indexes prevent full collection scans, but they don't eliminate
network/infra latency or the unindexable regex search cost. The
honest takeaway: the system is **reliable** (0% errors under load)
but not yet **fast enough** to meet an aggressive sub-500ms p95 target
on free-tier infrastructure. Upgrading to paid tiers, co-locating
Atlas and Railway in the same region, and adding the text-index +
caching follow-ups already identified would be the concrete next
steps to close that gap.
