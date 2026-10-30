# NecroKit Crew

**Undertaker** is the separate Kiro Crew App for the NecroKit Skeleton Crew submission.

It turns the NecroKit scan-and-plan workflow into a persistent maintenance workspace:

- schedule Package Graveyard and Repo Reaper scans
- run fixture-backed scans without secrets
- store scan history
- group findings by severity
- compare health over time
- generate and approve revival plans

This repository is intentionally separate from the main `necrokit` repository because the Kiroween Best Kiro Crew App rules require a separate GitHub repository submission.

## Planned stack

- Kiro Crew App SDK
- TypeScript and Node.js 22+
- React for the dashboard surface
- SQLite for local history
- `@necrokit/core` behavior mirrored through a small adapter boundary
- Vitest for tests

The app must remain useful without a live LLM or paid API. The default demo uses recorded scan fixtures.

## Planned workflow

```text
schedule -> scan -> persist -> summarize -> approve plan -> export
```

See [`docs/CREW_APP_PLAN.md`](docs/CREW_APP_PLAN.md) for scope and acceptance criteria.
