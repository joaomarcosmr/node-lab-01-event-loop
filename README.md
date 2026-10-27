# Node Lab 01 — The Event Loop (NestJS + Prisma + Postgres)

> Interview question: **"How does the Node.js event loop work, and what happens when you block it?"**

## The scenario

You maintain the back-office API of an e-commerce company (NestJS, Prisma, Postgres). Every
morning the managers open the sales dashboard, which calls `GET /reports/sales`. Since the orders
table grew to 300k rows, the whole API "freezes" for seconds whenever someone opens it: the health
check fails, Kubernetes restarts the pod, logins time out. Ops is blaming "Node being
single-threaded". Your job is to fix it.

## Setup

```bash
npm install            # also runs `prisma generate`
cp .env.example .env
npm run db:up          # Postgres 16 on localhost:5441 (docker compose)
npm run db:setup       # applies migrations and seeds 300k orders + user alice/secret (~20 s)
npm run start:dev      # API on :3000
npm run bench          # another terminal — watch /health latency go to seconds
```

Requires Node 20+ and Docker.

## Project structure

```
prisma/schema.prisma                     Order, User
prisma/seed.ts                           300k deterministic orders, user alice
src/
  prisma/prisma.service.ts               PrismaClient as an injectable (global module)
  health/health.controller.ts            GET  /health
  reports/reports.service.ts             GET  /reports/sales   ← loads 300k rows into Node and loops over them
  auth/auth.service.ts                   POST /auth/login      ← pbkdf2Sync on the main thread
scripts/bench.mjs                        load test; computes the expected report with SQL
puzzles/                                 optional warm-up on event-loop ordering
```

## Your task

Make `ReportsService` and `AuthService` stop blocking the event loop, without changing the HTTP
contract. The benchmark runs 10 concurrent `/reports/sales` and 10 concurrent `/auth/login`
clients while probing `/health` every 50 ms.

Hints:
- `findMany()` is async, but turning 300k rows into JavaScript objects and looping over them is
  synchronous CPU work. Who should do the aggregation: Node or Postgres? Look at Prisma's
  `groupBy` / `aggregate`, or `$queryRaw`.
- If you ever really need every row (e.g. a CSV export), don't load them all at once: paginate with
  a cursor and stream the response.
- `crypto.pbkdf2` has an async version. Which thread runs it then? What is `UV_THREADPOOL_SIZE`?

### Acceptance criteria

`npm run bench` must be all green:

- [ ] `/health` p99 < 50 ms and max < 250 ms while under load
- [ ] `/reports/sales` matches the SQL aggregate computed by the benchmark, every time
- [ ] `/reports/sales` completes at least 20 requests in the 15 s run
- [ ] `/auth/login` has zero errors (`alice` / `secret` still logs in)
- [ ] No `pbkdf2Sync` and no full-table `findMany()` in `src/` (`grep -rn "Sync\|findMany()" src/`)
- [ ] Short `NOTES.md`: what was blocking, why `/health` suffered although it does nothing, and
      how you'd detect this in production (event-loop lag metric)

### Stretch goal

Add `GET /reports/orders.csv` that streams all 300k orders as CSV using cursor pagination
(`take` + `cursor`) and a Node `Readable`, keeping `/health` responsive and memory flat.

### Warm-up (optional, ~10 min): predict the output

`puzzles/` has 5 tiny scripts. Write the exact output order in `puzzles/answers.json` without
running them, then `npm run check:puzzles`. They cover nextTick vs microtasks vs timers,
`setTimeout(0)` vs `setImmediate`, `async/await`, and why the same code behaves differently as an
ES module (puzzle 05). Interviewers love these.

## What a senior answer sounds like

Node runs your JavaScript on one thread; I/O is handled by libuv and comes back through the event
loop phases. Anything synchronous and long — materializing huge result sets, big `JSON.parse`,
`*Sync` crypto/fs calls, tight loops — stalls *every* request, including the health check. Push
aggregation to the database, stream big exports, use the async APIs (thread pool) or a worker
(Lab 02), and measure event-loop lag (`perf_hooks.monitorEventLoopDelay`) in production.
