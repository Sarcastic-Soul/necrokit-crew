# vendor/necrokit.mjs

Built from the NecroKit repo (sibling `necrokit/`, commit 0bfd903) with `pnpm build`, which writes `dist/necrokit.mjs`. Copied here unchanged on 2026-10-31.

- sha256: 6b64ea86ac14b6d65f39776dcd9825ad3da19ba38850f5594cbd5b60bd3ee36a
- Exports used by Undertaker: scanPackage, scanRepository, scanPackageLive, scanRepositoryLive, toMarkdown, PACKAGE_FIXTURES, REPO_FIXTURES.
- Types: `necrokit.d.mts` is hand-written to match `packages/necrokit-core/src/contracts.ts`. `Report.score` is either a number with a band (healthy, at-risk, critical) or `{ score: null, band: "unknown" }` when no evidence was collected.

To update: run `pnpm build` in the NecroKit repo, copy `dist/necrokit.mjs` here, update the hash above, and run `pnpm test` in this repo.
