# Undertaker requirements

Undertaker is a Kiro Crew App that keeps NecroKit scans running over time. NecroKit
(Package Graveyard and Repo Reaper) answers "is this package or repository being
looked after?" once. Undertaker answers it every day, keeps the history, and turns
new findings into plans that a person approves.

## Requirement 1: Watches

**User story:** As a maintainer, I want to keep a list of packages and repositories
to watch, so that I do not have to remember to scan them.

### Acceptance criteria

1. WHEN the app starts with an empty store THE SYSTEM SHALL seed five fixture watches (packages `abandoned` and `stable-old`, repositories `neglected`, `archived` and `active`) exactly once.
2. WHEN a user adds a watch with kind `package` or `repository`, mode `fixture` or `live`, a subject and an interval THE SYSTEM SHALL store it and answer 201.
3. WHEN a fixture watch names a fixture that does not exist THE SYSTEM SHALL refuse it with 400 and list the known fixture names.
4. WHEN a live package watch is not a valid npm name, or a live repository watch is not `owner/name`, THE SYSTEM SHALL refuse it with 400.
5. WHEN the interval is outside 0 to 720 hours THE SYSTEM SHALL refuse it with 400.
6. WHEN a watch with the same kind, mode and subject already exists THE SYSTEM SHALL refuse it with 409.
7. WHEN a user removes a watch THE SYSTEM SHALL delete it, and answer 404 for an unknown id.

## Requirement 2: Scheduled and manual scans

**User story:** As a maintainer, I want scans to run on their own and on demand,
so that the data is fresh without extra work.

### Acceptance criteria

1. WHEN the hourly cron job runs THE SYSTEM SHALL scan only the watches whose interval has passed since their last scan, without calling a model.
2. WHEN a user presses Run now on a watch THE SYSTEM SHALL scan that watch even if it is not due.
3. WHEN a user presses Run due watches THE SYSTEM SHALL scan every due watch.
4. WHEN a watch is in fixture mode THE SYSTEM SHALL scan the bundled NecroKit fixture and SHALL NOT use the network.
5. WHEN a watch is in live mode THE SYSTEM SHALL call NecroKit's live scanner for the public npm or GitHub APIs.
6. WHEN a scan throws THE SYSTEM SHALL record a failed scan with the error message and keep running the other watches.

## Requirement 3: History

**User story:** As a maintainer, I want to see how a subject's health changes,
so that I notice when something starts to decline.

### Acceptance criteria

1. WHEN a scan finishes THE SYSTEM SHALL store the full NecroKit report with its timestamp, score, band and finding count.
2. WHEN a watch has more than 30 scans THE SYSTEM SHALL drop the oldest ones for that watch.
3. WHEN the watch list is shown THE SYSTEM SHALL include a score trend of up to 20 scored points per watch.
4. WHEN the backend and the cron job write at the same time THE SYSTEM SHALL serialize writes with a lock and write the store atomically.

## Requirement 4: Evidence-backed findings

**User story:** As a reviewer, I want every finding to show the evidence behind it,
so that I can trust or challenge it.

### Acceptance criteria

1. WHEN a user selects a watch THE SYSTEM SHALL show its findings with severity, rule id, explanation and the evidence label, value and source.
2. WHEN a user picks a minimum severity THE SYSTEM SHALL show only findings at or above it.
3. WHEN a source could not be read THE SYSTEM SHALL list it under unavailable evidence with the reason.
4. WHEN NecroKit returns `score: null` and band `unknown` THE SYSTEM SHALL show the watch as unscored, SHALL NOT invent a score, SHALL NOT add a trend point, and SHALL NOT count it as getting worse.

## Requirement 5: Revival plans and approval

**User story:** As a maintainer, I want suggested fixes collected into a plan that
waits for me, so that nothing changes without my say.

### Acceptance criteria

1. WHEN a scan has findings that differ from the last plan for that watch THE SYSTEM SHALL create a pending plan with steps ordered by severity, then weight, then id.
2. WHEN the findings are the same as the last plan THE SYSTEM SHALL NOT create another plan, even if the last one was dismissed.
3. WHEN a scan has no findings or is unscored THE SYSTEM SHALL NOT create a plan.
4. WHEN a user approves or dismisses a plan THE SYSTEM SHALL record the decision and its time.
5. THE SYSTEM SHALL NOT change code, open issues or open pull requests.

## Requirement 6: Export

**User story:** As a maintainer, I want approved plans as one Markdown file, so that
I can paste them into an issue or a pull request.

### Acceptance criteria

1. WHEN a user exports THE SYSTEM SHALL return Markdown with one section per approved plan, its steps, and the NecroKit report.
2. WHEN no plan is approved THE SYSTEM SHALL say so in the export.
3. WHEN a plan is dismissed THE SYSTEM SHALL leave it out of the export.

## Requirement 7: Kiro Crew integration

**User story:** As a Kiro Crew user, I want Undertaker to install like any other app,
so that it lives next to my agents and schedules.

### Acceptance criteria

1. THE SYSTEM SHALL ship an `app.json` with an agent, a skill, crons, a UI page, a node backend and declared permissions.
2. WHEN the gateway probes `/health` without a signature THE SYSTEM SHALL answer 200.
3. WHEN `KIROCREW_PROXY_SECRET` is set THE SYSTEM SHALL refuse any other request without a valid v2 proxy signature, and SHALL refuse a replayed nonce or a timestamp more than 60 seconds off.
4. THE SYSTEM SHALL store data under `<KIROCREW_HOME>/apps/undertaker/data` when run by the gateway.
5. THE SYSTEM SHALL ship a weekly digest cron for the agent, paused by default.

## Requirement 8: Offline judging

**User story:** As a judge, I want to try the app with no keys and no network,
so that the demo always works.

### Acceptance criteria

1. WHEN the app runs with only fixture watches THE SYSTEM SHALL work with no network, no API key and no model.
2. WHEN a developer runs `pnpm dev` THE SYSTEM SHALL start the backend locally and print its URL.
3. WHEN a developer runs the CLI THE SYSTEM SHALL print a text dashboard from the same store.
