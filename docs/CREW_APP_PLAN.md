# Undertaker Crew App Plan

## Goal

Build a newly created, separate Kiro Crew App that makes NecroKit useful across persistent sessions and scheduled maintenance work.

## User flow

```text
create watch -> choose Package Graveyard or Repo Reaper -> run now or schedule -> inspect findings -> approve revival plan -> export
```

## Acceptance criteria

- [x] 1. The app exposes a clear scan dashboard.
- [x] 2. A user can run either scan type against bundled fixtures.
- [x] 3. Results persist locally with timestamp and source.
- [x] 4. Findings can be filtered by severity.
- [x] 5. A user can approve or dismiss a generated plan.
- [x] 6. A user can export an approved plan.
- [x] 7. The default path requires no API key or paid service.
- [x] 8. The app demonstrates persistent workspace value beyond a one-shot web scan.

All eight are covered by tests and a local run of the backend. None has been
checked inside a real Kiro Crew gateway yet.

## Scope order

- [x] 1. Kiro Crew app shell and typed API model (`app.json`, `src/api-types.ts`).
- [x] 2. Fixture-backed scan runner (`src/scanner.ts` over the NecroKit build).
- [x] 3. Local history store (JSON file with a lock; SQLite was dropped to keep the install free of native modules).
- [x] 4. Dashboard and plan actions (`ui/src/App.tsx`).
- [x] 5. Scheduler integration (hourly `command` cron; not yet run in a real gateway).
- [x] 6. Optional live adapter bridge (live mode per watch, opt-in).

## Non-goals

- No autonomous code changes.
- No automatic pull-request creation.
- No private-repository permissions.
- No required LLM provider.
- No complex multi-user sync.

## Submission write-up evidence

- [x] Repository URL: https://github.com/Sarcastic-Soul/necrokit-crew
- [x] Feature list and write-up: see the root README
- [ ] Screenshots from an installed gateway
- [ ] Short demo video

Capture the Crew app's repository URL, screenshots, feature list, and a short demo showing a scheduled scan becoming an approved maintenance plan.
