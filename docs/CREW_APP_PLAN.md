# Undertaker Crew App Plan

## Goal

Build a newly created, separate Kiro Crew App that makes NecroKit useful across persistent sessions and scheduled maintenance work.

## User flow

```text
create watch -> choose Package Graveyard or Repo Reaper -> run now or schedule -> inspect findings -> approve revival plan -> export
```

## Acceptance criteria

1. The app exposes a clear scan dashboard.
2. A user can run either scan type against bundled fixtures.
3. Results persist locally with timestamp and source.
4. Findings can be filtered by severity.
5. A user can approve or dismiss a generated plan.
6. A user can export an approved plan.
7. The default path requires no API key or paid service.
8. The app demonstrates persistent workspace value beyond a one-shot web scan.

## Scope order

1. Kiro Crew app shell and typed event model.
2. Fixture-backed scan runner.
3. Local history store.
4. Dashboard and plan actions.
5. Scheduler integration.
6. Optional live adapter bridge.

## Non-goals

- No autonomous code changes.
- No automatic pull-request creation.
- No private-repository permissions.
- No required LLM provider.
- No complex multi-user sync.

## Submission write-up evidence

Capture the Crew app's repository URL, screenshots, feature list, and a short demo showing a scheduled scan becoming an approved maintenance plan.
