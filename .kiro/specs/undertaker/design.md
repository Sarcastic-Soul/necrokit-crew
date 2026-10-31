# Undertaker design

## Overview

Undertaker is a Kiro Crew App with four parts that share one JSON store:

```text
                 Kiro Crew gateway
   +---------------------------------------------------+
   |  dashboard page        reverse proxy     scheduler |
   |  ui/dist/index.mjs  /apps/undertaker/api  crons    |
   +--------|------------------|----------------|-------+
            | useAppApi        | signed v2      | hourly command cron
            v                  v                v
      React page  ------>  backend/server.mjs   backend/run-due.mjs
                            (node:http, api.ts)  (no model call)
                                   \              /
                                    v            v
                         <KIROCREW_HOME>/apps/undertaker/data/store.json
                                   ^
                                   | read only (weekly digest, paused)
                             agent "undertaker" + skill necrokit-triage

   scan: src/scanner.ts -> vendor/necrokit.mjs (NecroKit build)
         fixture mode: PACKAGE_FIXTURES / REPO_FIXTURES, no network
         live mode:    scanPackageLive / scanRepositoryLive (npm, GitHub)
```

## Modules (apps/undertaker/src)

| File | Job |
|------|-----|
| `api-types.ts` | Types shared by the backend and the UI. No Node imports, so the UI can import them as types. |
| `scanner.ts` | The only place that calls NecroKit. `validateTarget` checks input; `createScanner` returns `(target, now) => Promise<Report>`. |
| `store.ts` | JSON store. Writes go through a per-process queue, a cross-process `mkdir` lock (`store.json.lock`, stale after 30 s), and a temp-file rename. Keeps the last 30 scans per watch. |
| `schedule.ts` | `isDue` and `nextRunAt` from the last scan time and the interval. |
| `watch.ts` | `runWatch`: scan, record, then make a plan if findings changed. A thrown scan becomes a failed scan entry. |
| `plans.ts` | Builds a plan from a report: steps keep NecroKit's order and add each finding's severity and title. |
| `plan-approval.ts` | Approve or dismiss, and the Markdown export of approved plans. |
| `filter.ts` | Severity order and filter, used by the CLI. |
| `proxy-auth.ts` | Kiro Crew proxy signature v2: HMAC-SHA256 over `v2:<ts>:<nonce>:<method>:<target>:<sha256(body)>`, 60 s window, nonce replay cache. |
| `api.ts` | Pure request handler `(req) => Promise<res>`. Tested without a port. |
| `server.ts` | node:http wrapper: body limit 64 KB, binds `127.0.0.1:$PORT`. |
| `run-due.ts` | Cron entry: run due watches once, print a JSON summary. |
| `config.ts` | Data dir: `UNDERTAKER_DATA_DIR`, else `$KIROCREW_HOME/apps/undertaker/data`, else `./data`. Default watches. |
| `cli.ts` | Text dashboard over the same store. |

## HTTP API

The gateway forwards `/apps/undertaker/api/<path>` to the backend as `/api/<path>`.
The handler also accepts `/api/apps/undertaker/<path>` (the manifest's `routes`).

| Method | Path | Result |
|--------|------|--------|
| GET | `/health` | `{status: "ok"}`, no signature needed |
| GET | `/api/watches` | Watches with due state, latest scan, trend and a summary |
| POST | `/api/watches` | Add a watch; 201, 400 or 409 |
| DELETE | `/api/watches/:id` | Remove a watch; 404 if unknown |
| GET | `/api/fixtures` | Fixture names per kind |
| POST | `/api/run` | `{watchId}` runs one watch now; empty body runs due watches |
| GET | `/api/scans?watchId=` | Scan history, newest first |
| GET | `/api/plans?status=` | Plans, filtered by `pending`, `approve` or `dismiss` |
| POST | `/api/plans/:id/decision` | `{decision: "approve" | "dismiss"}` |
| GET | `/api/plans/export` | Markdown of approved plans |
| GET | `/api/digest` | Watches that got worse, critical watches, pending plan count |

## Data model

- `Watch {id, kind, subject, mode, everyHours, createdAt}`
- `ScanEntry {id, watchId, kind, subject, mode, scannedAt, score, band, findingCount, report, error?}`.
  `band` is `null` only for a failed scan. An unscored report has `score: null, band: "unknown"`.
- `Plan {id, watchId, scanId, subject, title, createdAt, score, band, findingIds, steps, markdown, decision, decidedAt}`

## Scoring contract (from NecroKit)

Severities are info, warning, critical. Penalties 3, 12, 30, scaled by
`0.5 + weight/100`. Bands: healthy at 75 or more, at-risk at 40 or more, else
critical. With no evidence at all the score is `null` and the band is `unknown`.
Undertaker shows that as "unscored", skips it in trends and in the digest's
"got worse" list, and makes no plan from it.

## Decisions

- **No timer in the backend.** The gateway's scheduler runs `run-due.mjs` every hour. Each watch has its own interval, so an hourly tick is enough.
- **One store file, two processes.** The backend and the cron job can both write, so the store uses a lock directory and atomic renames. The backend reads the file fresh on each request.
- **Fixture first.** All default watches are fixtures, so the app works offline and the demo is repeatable. Live mode is opt-in per watch.
- **Approval only records a decision.** There is no code path that edits files, opens issues or opens pull requests.
- **Bundled backend.** esbuild bundles the backend and NecroKit into single `.mjs` files, so the installed app needs no `npm install`.

## Assumptions (not confirmed by the Kiro Crew docs)

- The `command` cron runs in a POSIX shell, so `${KIROCREW_HOME:-$HOME/.kiro/crew}` expands. The docs say a command cron is a "shell command" and that `KIROCREW_HOME` defaults to `~/.kiro/crew`, but do not say which shell or which environment the job gets.
- `kirocrew app install` copies the app folder to `<KIROCREW_HOME>/apps/undertaker/`, which is where the cron command looks for `backend/run-due.mjs`.
- The weekly digest agent can read the store file with its core tools.

## Testing

Vitest, in `apps/undertaker/tests`: store (locking, trimming, seeding), schedule,
filter, watch runs and plan creation, approval and export, scanner (fixture and a
failing live fetch), the API handler (routes, errors, signature checks), and the
unscored contract.
