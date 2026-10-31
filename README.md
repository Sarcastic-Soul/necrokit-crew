# NecroKit Crew: Undertaker

Undertaker is a Kiro Crew App that keeps watch over npm packages and GitHub
repositories. It runs [NecroKit](https://github.com/Sarcastic-Soul/necrokit)
scans on a schedule, keeps the score history, and turns new findings into
revival plans that wait for a person to approve or dismiss them. It never
changes code.

This repo is the Kiroween 2026 "Best Kiro Crew App" entry. It is separate from
the main NecroKit repo because the rules ask for a separate repository.

## Features

- **Watches.** A package or a repository, in fixture mode (recorded data, no
  network) or live mode (public npm and GitHub APIs), each with its own interval.
  Five fixture watches are added on first start, so the app works offline.
- **Scheduled scans.** An hourly Kiro Crew command cron runs only the watches
  that are due. No model call, no API key.
- **History and trend.** The last 30 scans per watch are kept; the page draws a
  small score trend per watch.
- **Evidence on every finding.** Each finding shows its rule, explanation, and
  the evidence label, value and source. Sources that could not be read are
  listed as unavailable with the reason.
- **No invented scores.** When NecroKit collects no evidence at all (for
  example an npm 404), the report has `score: null` and band `unknown`.
  Undertaker shows that as "unscored" and makes no plan from it.
- **Revival plans that wait for you.** New findings become a ranked plan
  (critical first, then by weight). Approve or dismiss. The same findings do
  not make a new plan again.
- **Markdown export** of approved plans, ready for an issue or a pull request.
- **Agent and skill.** An `undertaker` agent with the `necrokit-triage` skill
  explains reports in plain language, and a weekly digest cron (paused by
  default) summarizes what got worse.

## Architecture

```text
                 Kiro Crew gateway
   +---------------------------------------------------+
   |  dashboard page        reverse proxy     scheduler |
   |  ui/dist/index.mjs  /apps/undertaker/api  crons    |
   +--------|------------------|----------------|-------+
            | useAppApi        | signed v2      | hourly command cron
            v                  v                v
      React page  ------>  backend/server.mjs   backend/run-due.mjs
                            (node:http)          (no model call)
                                   \              /
                                    v            v
                         <KIROCREW_HOME>/apps/undertaker/data/store.json
                                   ^
                                   | read only (weekly digest, paused)
                             agent "undertaker" + skill necrokit-triage

   scanning: src/scanner.ts -> vendor/necrokit.mjs (built from the NecroKit repo)
```

Details are in [.kiro/specs/undertaker/design.md](.kiro/specs/undertaker/design.md).

## Repository layout

```text
apps/undertaker/          the Crew App (this folder is what gets installed)
  app.json                manifest
  agents/undertaker.json  agent
  skills/necrokit-triage/ skill
  assets/icon.png         store icon (512 px, opaque)
  backend/*.mjs           bundled backend and cron entry (built, committed)
  ui/dist/index.mjs       bundled page (built, committed)
  ui/src/App.tsx          page source
  src/                    backend source
  tests/                  Vitest tests
  vendor/necrokit.mjs     NecroKit build, see vendor/PROVENANCE.md
.kiro/                    Kiro steering, hook and the spec this was built from
docs/CREW_APP_PLAN.md     original plan
```

## Install into Kiro Crew

Requires Node 22 on the gateway host. The built files are committed, so no
build step is needed to install.

```bash
git clone https://github.com/Sarcastic-Soul/necrokit-crew.git
kirocrew app install /absolute/path/to/necrokit-crew/apps/undertaker
```

Then trust the app in **Settings → Security → Third-party apps** (enable
refuses untrusted third-party apps), and enable it:

```bash
kirocrew app enable undertaker
```

Open **Undertaker** in the sidebar. The five fixture watches are due on the
first visit; press **Run due watches**.

## Local development

```bash
pnpm install
pnpm dev          # builds and starts the backend on http://127.0.0.1:8787, data in apps/undertaker/.local-data
pnpm test         # Vitest
pnpm typecheck    # backend, tests and UI
pnpm build        # backend/*.mjs and ui/dist/index.mjs
```

Try the API while `pnpm dev` runs (no signature is needed when
`KIROCREW_PROXY_SECRET` is not set):

```bash
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/api/run
curl http://127.0.0.1:8787/api/watches
curl http://127.0.0.1:8787/api/plans/export
```

Text dashboard over the same store that `pnpm dev` uses:

```bash
pnpm --filter @necrokit/undertaker cli
pnpm --filter @necrokit/undertaker cli --min-severity warning
pnpm --filter @necrokit/undertaker cli --decide <planId>=approve --export
```

## How it relates to NecroKit

NecroKit is the main project: an evidence-first scanner with two apps,
Package Graveyard (npm packages) and Repo Reaper (GitHub repositories), built on
a shared core (evidence, rules, scoring, revival plan). It answers "is this
being looked after?" once.

Undertaker reuses that core without copying the rules. `vendor/necrokit.mjs` is
the bundle that `pnpm build` produces in the NecroKit repo, and
`src/scanner.ts` is the only file that calls it. Undertaker adds what a
one-off scan cannot: a schedule, history, a decision step, and an export.

## Crew App write-up

**What it is.** Undertaker is a maintenance watch for the open-source code you
depend on. You list packages and repositories; Kiro Crew's scheduler scans them
with NecroKit every hour that they are due; the page shows each subject's score,
its trend, and the evidence behind every finding. When a scan finds something
new, Undertaker writes a revival plan and waits. You approve it or dismiss it.
Approved plans export as one Markdown file.

**Why it is a Crew App and not a web page.** A dependency rarely dies in one
day. It gets a failing CI, then a stale release, then an archived repo. A
one-off scan misses that slope. Undertaker needs things only a long-running
host gives it: a scheduler that runs while the browser is closed, a data
folder that survives updates, a backend behind the gateway's signed proxy, and
an agent that can read the history and write a weekly digest.

**What Kiro Crew features it uses.**

- `crons` with a `command` job (no model call) for the hourly scan, and a
  paused `message` job for the agent's weekly digest
- a `node` backend behind the gateway reverse proxy, with `/health` and proxy
  signature v2 checks
- a `ui` page built against `@kirocrew/app-sdk` and `@kirocrew/app-sdk/ui`
  (`useAppApi`, `useNavBadge`, `useNotify`, `PageHeader`, `StatCard`,
  `SegmentedControl`, `EmptyState`)
- an agent and a skill shipped in the app
- `permissions` limited to its own API routes, storage, cron and network

**How Kiro was used to build it.** The `.kiro` folder holds the steering rules
(always included), an EARS requirements spec, a design, and a task list that
maps each task to requirement numbers. A file-edit hook asks Kiro to run
typecheck and tests after any change to the app and fix failures without
weakening tests.

**Safety.** Undertaker never edits code, never opens issues or pull requests,
and never approves its own plans. Live scans use public APIs with no token.
When evidence is missing it says so instead of guessing.

**Try it.** Install as above. The default watches use recorded fixtures, so it
works with no network, no key and no model.

## Checked in a real gateway

Installed into Kiro Crew 0.11.0 on Linux on 2026-10-31:

- `kirocrew app install` accepts the manifest; `kirocrew app enable` registers 1 agent and 1 skill and starts the backend, and `/health` answers.
- The hourly `run-due-watches` cron is a `script` job (`cron.py:run_due`). The first version used a shell `command` with `${KIROCREW_HOME:-...}`, which Kiro Crew rejects. Triggering the new job from the gateway (`kirocrew cron trigger`) scanned all 5 fixture watches.
- Kiro Crew runs third-party app code only when it is trusted: add `undertaker` to `agent.apps_trusted` (`kirocrew config set agent.apps_trusted '["undertaker"]'`). On Ubuntu 23.10 or newer, `kirocrew service install` must also install its AppArmor profile, or the sandbox is unavailable and the app cannot start.

Not yet checked:

- The Undertaker page inside the signed-in dashboard.
- The weekly digest agent reading `data/store.json`. It ships paused.
- `@kirocrew/app-sdk` is provided by the dashboard at runtime and is not on npm, so `ui/package.json` does not list it; `ui/src/kirocrew-sdk.d.ts` types only the parts this app uses, copied from the Kiro Crew source.

## License

MIT
