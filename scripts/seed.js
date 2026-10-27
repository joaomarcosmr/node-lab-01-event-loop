// Generates server/data/orders.ndjson (one JSON order per line) and the expected report.
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const COUNT = Number(process.env.ORDERS ?? 400_000);
const dir = path.resolve('server/data');
mkdirSync(dir, { recursive: true });

// Deterministic PRNG so every machine gets the same data.
let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const countries = ['BR', 'US', 'DE', 'JP', 'IN', 'FR', 'MX', 'CA'];
const expected = { orders: 0, revenueCents: 0, byCountry: {} };

const out = createWriteStream(path.join(dir, 'orders.ndjson'));
for (let i = 0; i < COUNT; i++) {
  const country = countries[Math.floor(rnd() * countries.length)];
  const items = 1 + Math.floor(rnd() * 5);
  const unitCents = 100 + Math.floor(rnd() * 20_000);
  const order = {
    id: i + 1,
    customerId: 1 + Math.floor(rnd() * 50_000),
    country,
    items,
    unitCents,
    note: 'x'.repeat(40 + Math.floor(rnd() * 80)),
  };
  const total = items * unitCents;
  expected.orders++;
  expected.revenueCents += total;
  expected.byCountry[country] = (expected.byCountry[country] ?? 0) + total;
  out.write(JSON.stringify(order) + '\n');
}
out.end(() => {
  writeFileSync(path.join(dir, 'expected.json'), JSON.stringify(expected, null, 2));
  console.log(`Wrote ${COUNT} orders to server/data/orders.ndjson`);
});
