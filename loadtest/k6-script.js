/**
 * k6 load test — run this locally against a real running instance
 * (docker compose up, or `npm start` with a real MongoDB connection).
 *
 * k6 could not be installed in the environment this project was
 * upgraded in (binary download blocked by network policy, no root
 * to apt-install). Install it yourself from https://k6.io/docs/get-started/installation/
 * then run:
 *
 *   k6 run loadtest/k6-script.js
 *
 * Override the target with:
 *   k6 run -e BASE_URL=http://localhost:3000 loadtest/k6-script.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },  // ramp up to 50 concurrent users
        { duration: '40s', target: 50 },  // hold at 50
        { duration: '10s', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be under 500ms
    http_req_failed: ['rate<0.01'],   // error rate should be under 1%
  },
};

export default function () {
  // 1. Health check (no DB dependency, no auth)
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health check is 200': (r) => r.status === 200 });

  // 2. Get posts (Mongo-backed, paginated, the most common real-world read)
  const posts = http.get(`${BASE_URL}/api/post/getposts?limit=9`);
  check(posts, {
    'getposts is 200': (r) => r.status === 200,
    'getposts returns a posts array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).posts);
      } catch {
        return false;
      }
    },
  });

  // 3. Search posts (exercises the $regex search path — a known perf
  //    hotspot flagged in the code review; watch this one specifically
  //    once you have real data volume in Mongo)
  const search = http.get(`${BASE_URL}/api/post/getposts?searchTerm=test`);
  check(search, { 'search is 200': (r) => r.status === 200 });

  sleep(1);
}
