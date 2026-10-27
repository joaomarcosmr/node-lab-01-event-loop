// ⚠️  This server works, but it blocks the event loop in several places.
// Your job: make it non-blocking WITHOUT changing the HTTP contract.
// Run `npm run bench` to see how bad it is right now.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT ?? 3000);
const DATA = path.resolve('server/data/orders.ndjson');
const USERS = new Map([['alice', { salt: 'salt-a', hash: null }]]);

// "Rate limiting" — spaces requests out by blocking the thread. Yikes.
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function buildReport() {
  const raw = fs.readFileSync(DATA, 'utf8');
  const report = { orders: 0, revenueCents: 0, byCountry: {} };
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const o = JSON.parse(line);
    const total = o.items * o.unitCents;
    report.orders++;
    report.revenueCents += total;
    report.byCountry[o.country] = (report.byCountry[o.country] ?? 0) + total;
  }
  return report;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}
USERS.get('alice').hash = hashPassword('secret', 'salt-a');

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/health') {
    return json(res, 200, { ok: true, uptime: process.uptime() });
  }

  if (url.pathname === '/report') {
    sleepSync(100);
    return json(res, 200, buildReport());
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { username, password } = JSON.parse(body || '{}');
      const user = USERS.get(username);
      if (!user) return json(res, 401, { ok: false });
      const ok = hashPassword(password, user.salt) === user.hash;
      return json(res, ok ? 200 : 401, { ok });
    });
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => console.log(`listening on http://localhost:${PORT}`));
