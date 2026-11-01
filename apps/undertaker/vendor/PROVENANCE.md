# vendor/necrokit.mjs

Built from the NecroKit repo (sibling `necrokit/`, commit cf17a40) with `pnpm build`, which writes `dist/necrokit.mjs`. Copied here unchanged on 2026-11-02.

- sha256: 1a9fda556fc69954d8d5ddcbb94da936628625819ac6192975fbdf500083c4a8
- Exports used by Undertaker: scanPackage, scanRepository, scanPackageLive, scanRepositoryLive, toMarkdown, PACKAGE_FIXTURES, REPO_FIXTURES.
- Types: `necrokit.d.mts` is hand-written to match `packages/necrokit-core/src/contracts.ts`. `Report.score` is either a number with a band (healthy, at-risk, critical) or `{ score: null, band: "unknown" }` when no evidence was collected.

To update: run `pnpm build` in the NecroKit repo, copy `dist/necrokit.mjs` here, update the hash above, and run `pnpm test` in this repo.
