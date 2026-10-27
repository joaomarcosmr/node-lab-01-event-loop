// Hammers /report and /login while measuring /health latency.
// Pass criteria are printed at the end. Run with the server already started.
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const DURATION_MS = Number(process.env.DURATION_MS ?? 15_000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);
const expected = JSON.parse(readFileSync('server/data/expected.json', 'utf8'));

const health = [];
let reports = 0, reportErrors = 0, wrongReports = 0, logins = 0, loginErrors = 0;
const deadline = Date.now() + DURATION_MS;

async function healthProbe() {
  while (Date.now() < deadline) {
    const t = performance.now();
    try {
      const r = await fetch(`${BASE}/health`);
      await r.json();
      health.push(performance.now() - t);
    } catch {
      health.push(Infinity);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function reportLoop() {
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/report`);
      const body = await r.json();
      reports++;
      if (JSON.stringify(body) !== JSON.stringify(expected)) wrongReports++;
    } catch {
      reportErrors++;
    }
  }
}

async function loginLoop() {
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'secret' }),
      });
      const body = await r.json();
      if (!body.ok) loginErrors++; else logins++;
    } catch {
      loginErrors++;
    }
  }
}

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

console.log(`Benchmarking ${BASE} for ${DURATION_MS / 1000}s with ${CONCURRENCY}x /report + ${CONCURRENCY}x /login ...`);
await Promise.all([
  healthProbe(),
  ...Array.from({ length: CONCURRENCY }, reportLoop),
  ...Array.from({ length: CONCURRENCY }, loginLoop),
]);

const p50 = pct(health, 50), p99 = pct(health, 99), max = Math.max(...health);
const fmt = (n) => (n === Infinity ? 'timeout' : `${n.toFixed(1)}ms`);
console.log('\n/health latency while under load:');
console.log(`  samples: ${health.length}  p50: ${fmt(p50)}  p99: ${fmt(p99)}  max: ${fmt(max)}`);
console.log(`/report: ${reports} ok, ${wrongReports} wrong, ${reportErrors} errors`);
console.log(`/login:  ${logins} ok, ${loginErrors} errors`);

const checks = [
  ['/health p99 < 50ms', p99 < 50],
  ['/health max < 250ms', max < 250],
  ['/report returned correct totals every time', reports > 0 && wrongReports === 0],
  ['/report completed at least 5 requests', reports >= 5],
  ['/login had no errors', logins > 0 && loginErrors === 0],
];
console.log('');
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
