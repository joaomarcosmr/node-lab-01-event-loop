# Node Lab 01 — The Event Loop

> Interview question this lab trains: **"How does the Node.js event loop work, and what happens when you block it?"**

You will (1) prove you can predict event-loop ordering and (2) fix a real HTTP server that freezes
under load because it blocks the loop. Everything you need (data generator, broken server, benchmark)
is already here. Focus on the solution.

## Setup

```bash
npm install          # no dependencies, but keeps the workflow familiar
npm run seed         # generates server/data/orders.ndjson (~65 MB, 400k orders) + expected.json
```

Requires Node 20+.

## Part 1 — Predict the output (`puzzles/`)

Each file in `puzzles/` prints a few lines. **Without running them**, write the exact output order
in `puzzles/answers.json`, e.g.:

```json
{ "01-basics.cjs": ["A", "E", "D", "C", "B"], ... }
```

Then verify:

```bash
npm run check:puzzles
```

Concepts you must be able to explain for each puzzle:

| Puzzle | Concept |
|---|---|
| 01 | Sync code → `process.nextTick` queue → Promise microtasks → timers |
| 02 | The nextTick queue is drained fully before microtasks, and Node alternates between them until both are empty |
| 03 | Event-loop phases: timers → pending callbacks → poll → check (`setImmediate`) → close. Why is `setTimeout(0)` vs `setImmediate` only deterministic inside an I/O callback? |
| 04 | `async/await` is Promises; every `await` yields to the microtask queue |
| 05 | Same code as 01 but as an ES module gives a different order. Why? |

Write your explanation for puzzle 05 in a short `NOTES.md` (2–5 sentences).

## Part 2 — Unblock the server (`server/server.js`)

The server exposes three endpoints:

| Endpoint | What it does | Why it is broken |
|---|---|---|
| `GET /health` | returns `{ ok: true }` | nothing wrong — but it becomes unresponsive because the other handlers block the loop |
| `GET /report` | aggregates all orders from `orders.ndjson` | `readFileSync` + parsing a 65 MB file synchronously + a busy-wait "rate limiter" |
| `POST /login` | verifies a password with PBKDF2 | `pbkdf2Sync` runs 100k iterations on the main thread |

See it fail:

```bash
npm start          # terminal 1
npm run bench      # terminal 2 → /health p99 will be in the seconds
```

### Your task

Rewrite `server/server.js` so that it **never blocks the event loop**, keeping the exact same
HTTP contract (same paths, methods, status codes and JSON bodies).

Hints (you don't have to use all of them):

- Replace `readFileSync` + `split('\n')` with a stream and `readline` (the file is NDJSON on purpose).
- Replace the busy-wait with a timer-based delay (the 100 ms delay must stay — a client should still
  observe it).
- Use the async `crypto.pbkdf2` — which thread actually does the work then? Look up `UV_THREADPOOL_SIZE`.
- Think about whether the report needs to be recomputed on every request. Caching with
  invalidation on file `mtime` is a valid optimization, but the first request must still not block.
- `/login` must keep returning `{ ok: true }` for `alice` / `secret`.

### Acceptance criteria

Run `npm run check` (puzzles + benchmark). All of the following must be green while the benchmark is
hammering the server with 10 concurrent `/report` and 10 concurrent `/login` loops for 15 seconds:

- [ ] All 5 puzzles correctly predicted in `puzzles/answers.json`
- [ ] `NOTES.md` explains the ESM twist (puzzle 05)
- [ ] `/health` p99 latency < 50 ms under load
- [ ] `/health` max latency < 250 ms under load
- [ ] `/report` returns the exact same totals as `server/data/expected.json` every time
- [ ] `/report` completes at least 5 requests during the run
- [ ] `/login` has zero errors
- [ ] No `*Sync` call from `fs` or `crypto` remains in the request path (`grep -n Sync server/server.js`)

### Stretch goals

- Add a `/metrics` endpoint that reports event-loop lag (`perf_hooks.monitorEventLoopDelay`) and show the
  before/after numbers in `NOTES.md`.
- Run the benchmark with `UV_THREADPOOL_SIZE=1` and `UV_THREADPOOL_SIZE=16` and explain what changes
  for `/login`.

## What a senior answer sounds like

After finishing, you should be able to explain in your own words: the phases of the loop, the
difference between `nextTick`, microtasks and macrotasks, why "Node is single-threaded" is only
half true (libuv thread pool, worker threads), and how to detect a blocked loop in production
(event-loop lag metrics, `--cpu-prof`, `clinic doctor`).
