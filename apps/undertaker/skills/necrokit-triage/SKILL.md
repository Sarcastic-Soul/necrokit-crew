---
description: How to read NecroKit reports in Undertaker - the rules, thresholds, scores, bands and plan order, and how to explain them without guessing
always: false
---

# NecroKit triage

Undertaker stores NecroKit reports. Each report has evidence, unavailable
evidence, findings, a score and a revival plan. Use this guide to explain them.

## Ground rules

- Every claim needs evidence. Quote the evidence label, value and source.
- Unavailable evidence is unknown. It is not good news and not bad news. Say
  which source failed and why (the `reason` field).
- Age alone is not abandonment. A package with no release for years but a
  recent commit is maintained. The `stable-old` fixture shows this: 900 days
  since the last publish, a commit 30 days ago, score 100.
- Never change code, open issues, or approve plans. Recommend; a person decides.

## Scores and bands

Each finding takes points off 100:

| Severity | Base penalty |
|----------|--------------|
| info     | 3            |
| warning  | 12           |
| critical | 30           |

The penalty is scaled by `0.5 + weight / 100`, then the score is rounded and
kept between 0 and 100.

| Band     | Score            |
|----------|------------------|
| healthy  | 75 or more       |
| at-risk  | 40 to 74         |
| critical | under 40         |
| unknown  | score is `null`  |

`unknown` means no evidence could be collected at all, for example an npm 404
or a network failure. Do not invent a number and do not call it healthy. Say
"unscored" and point to the unavailable list. An unscored scan gets no plan.

## Package rules (Package Graveyard)

| Rule | Severity | Weight | Fires when |
|------|----------|--------|------------|
| `deprecated` | critical | 90 | The registry marks the package deprecated |
| `repository-archived` | critical | 80 | The linked GitHub repository is archived |
| `stale-release` | warning | 60 | Last publish is 730 days or more ago AND the last commit is unknown or 365 days or more ago |
| `single-maintainer` | info | 30 | Exactly one maintainer is listed |
| `low-downloads` | info | 10 | Under 1000 weekly downloads |

## Repository rules (Repo Reaper)

| Rule | Severity | Weight | Fires when |
|------|----------|--------|------------|
| `archived` | critical | 80 | The repository is archived |
| `no-license` | critical | 60 | No license is declared |
| `ci-failing` | warning | 40 | The latest CI status is failing |
| `stale-issues` | warning | 30 | 10 or more stale open issues |
| `old-pull-requests` | warning | 30 | The oldest open pull request is 180 days or older |
| `no-recent-release` | info | 20 | No release, or the latest release is more than 365 days old |
| `no-readme` | info | 10 | No README at the repository root |

## Revival plan order

Steps are sorted by severity (critical, then warning, then info), then by
weight from high to low, then by finding id. Keep that order when you
summarize a plan. Step 1 is the most urgent.

## Undertaker specifics

- A plan is only made when a scan has findings and they differ from the last
  plan for that watch. Dismissing a plan does not bring it back on the next
  scan unless the findings change.
- Approving a plan only adds it to the Markdown export. Nothing is run.
- Fixture watches read recorded snapshots and never use the network. Live
  watches call the public npm and GitHub APIs without a token, so rate limits
  can make sources unavailable.
- When a band changes between two scored scans, report it as "was X, now Y".
  Skip unscored scans when comparing.
