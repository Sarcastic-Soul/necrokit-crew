# Undertaker

Kiro Crew App surface for scheduled NecroKit maintenance scans.

The first release supports fixture-backed scans, history, severity filtering, and plan approval. Live integrations are added only after the offline path is reliable.

## Offline demo

No API key, network access, or Kiro Crew gateway is needed.

```sh
corepack pnpm --filter @necrokit/undertaker dev
```

The demo runs four watches (three recorded fixtures and one subject with no fixture, which fails on purpose). It writes history to `.undertaker/store.json` in the app directory and prints a dashboard grouped by band.

Options:

- `--store <path>`: use a different store file.
- `--min-severity <low|medium|high|critical>`: filter findings in reports.
- `--decide <planId>=<approve|dismiss>`: record a decision on a generated plan.
- `--export`: print approved plans as Markdown.

Run the same command again to see scheduling in action: watches with a recent scan are skipped until their `everyHours` interval elapses.

## Modules

- `src/store.ts`: JSON scan and plan store. Writes go to a temp file, then rename.
- `src/schedule.ts`: pure `isDue` and `nextRunAt`.
- `src/watch.ts`: `runWatch` and `runWatches`. Scan failures are recorded as error entries.
- `src/plan-approval.ts`: approve or dismiss plans, export approved plans as Markdown.
- `src/filter.ts`: pure severity filter.
- `src/fixtures.ts`: recorded demo scanner.
- `src/cli.ts`: text dashboard.

## Scripts

- `test`: vitest run
- `typecheck` and `build`: tsc --noEmit
- `dev`: offline demo

No runtime dependencies beyond Node built-ins. Requires Node 22+.
