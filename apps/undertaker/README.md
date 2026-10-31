# Undertaker (Kiro Crew App)

Scheduled NecroKit scans of npm packages and GitHub repositories, with score
history and revival plans that wait for a person to approve them. Undertaker
never changes code. See the [root README](../../README.md) for the full
write-up.

## Install

The built files (`backend/*.mjs`, `ui/dist/index.mjs`) are committed, so this
folder installs as is. Node 22 is needed on the gateway host.

```bash
kirocrew app install /absolute/path/to/necrokit-crew/apps/undertaker
# trust it: Settings -> Security -> Third-party apps
kirocrew app enable undertaker
```

## What is in this folder

| Path | Purpose |
|------|---------|
| `app.json` | Manifest: agent, skill, two crons, one page, node backend, permissions |
| `agents/undertaker.json` | Read-only triage agent |
| `skills/necrokit-triage/SKILL.md` | Rules, thresholds, bands and plan order |
| `assets/icon.png` | Store icon, 512 px, opaque (`icon.svg` is the source) |
| `ui/icon.svg` | Sidebar icon (`ui.pages[].iconUrl`) |
| `backend/server.mjs` | Backend, built from `src/server.ts` |
| `backend/run-due.mjs` | Hourly cron entry, built from `src/run-due.ts` |
| `ui/dist/index.mjs` | Page bundle, built from `ui/src/App.tsx` |
| `vendor/necrokit.mjs` | NecroKit build; see `vendor/PROVENANCE.md` |

## Crons

| Name | Kind | Schedule | Does |
|------|------|----------|------|
| `run-due-watches` | `command` | every hour | Scans watches whose interval has passed. No model call. Prints `{ran, failed, critical, dataDir}`. |
| `weekly-digest` | `message` to the `undertaker` agent | Mondays 09:00 UTC | Summarizes what got worse, what is critical, what is unscored, and pending plans. Ships paused (`enabled: false`). |

## Backend API

Reached by the page at `/apps/undertaker/api/<path>`; the gateway forwards it as
`/api/<path>`. When the gateway sets `KIROCREW_PROXY_SECRET`, every route except
`/health` needs a valid proxy v2 signature.

| Method | Path | |
|--------|------|--|
| GET | `/health` | liveness, unsigned |
| GET, POST | `/api/watches` | list with summary and trend; add (`{kind, subject, mode, everyHours}`) |
| DELETE | `/api/watches/:id` | remove |
| GET | `/api/fixtures` | fixture names |
| POST | `/api/run` | `{watchId}` runs one now; empty body runs due watches |
| GET | `/api/scans?watchId=` | history, newest first |
| GET | `/api/plans?status=pending` | plans (`pending`, `approve`, `dismiss`) |
| POST | `/api/plans/:id/decision` | `{decision: "approve" or "dismiss"}` |
| GET | `/api/plans/export` | Markdown of approved plans |
| GET | `/api/digest` | worse, critical, pending count, Markdown |

## Data

Stored in `<KIROCREW_HOME>/apps/undertaker/data/store.json` when run by the
gateway (`KIROCREW_HOME` defaults to `~/.kiro/crew`). `UNDERTAKER_DATA_DIR`
overrides it; `pnpm dev` uses `.local-data/`. The backend and the cron job share
the file through a lock directory (`store.json.lock`) and atomic renames.

## Scores

From NecroKit: healthy at 75 or more, at-risk at 40 or more, critical below
40. When no evidence could be collected the score is `null` and the band is
`unknown`; Undertaker shows "unscored", adds no trend point, makes no plan, and
does not report it as getting worse.

## Develop

```bash
pnpm dev                 # from the repo root: build, then backend on http://127.0.0.1:8787
pnpm test
pnpm typecheck
pnpm build               # backend/*.mjs and ui/dist/index.mjs
pnpm --filter @necrokit/undertaker cli --min-severity warning
pnpm --filter @necrokit/undertaker run-due
```

Run `pnpm build` and commit `backend/` and `ui/dist/` after changing `src/` or
`ui/src/`.

## Updating NecroKit

Run `pnpm build` in the NecroKit repo, copy `dist/necrokit.mjs` to
`vendor/necrokit.mjs`, update the hash in `vendor/PROVENANCE.md`, then run
`pnpm build && pnpm test` here. Keep `vendor/necrokit.d.mts` in step with
NecroKit's `contracts.ts`.
