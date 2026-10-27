import 'dotenv/config';
import * as crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const ORDERS = Number(process.env.ORDERS ?? 300_000);

async function main() {
  const salt = 'salt-a';
  const passwordHash = crypto.pbkdf2Sync('secret', salt, 100_000, 64, 'sha512').toString('hex');
  await prisma.user.upsert({ where: { username: 'alice' }, update: {}, create: { username: 'alice', salt, passwordHash } });

  const existing = await prisma.order.count();
  if (existing >= ORDERS) { console.log(`orders already seeded (${existing})`); return; }
  await prisma.order.deleteMany();

  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const countries = ['BR', 'US', 'DE', 'JP', 'IN', 'FR', 'MX', 'CA'];
  const BATCH = 10_000;
  for (let start = 0; start < ORDERS; start += BATCH) {
    const data = Array.from({ length: Math.min(BATCH, ORDERS - start) }, () => ({
      customerId: 1 + Math.floor(rnd() * 50_000),
      country: countries[Math.floor(rnd() * countries.length)],
      items: 1 + Math.floor(rnd() * 5),
      unitCents: 100 + Math.floor(rnd() * 20_000),
      note: 'x'.repeat(40 + Math.floor(rnd() * 80)),
    }));
    await prisma.order.createMany({ data });
    process.stdout.write(`\rseeding orders: ${Math.min(start + BATCH, ORDERS)}/${ORDERS}`);
  }
  console.log('\nseed done');
}

main().finally(() => prisma.$disconnect());
