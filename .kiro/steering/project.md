---
inclusion: always
---

# Undertaker steering

- Keep the Crew App persistent, inspectable, and approval-driven.
- Fixture-backed behavior must work without network access or secrets.
- Never apply code changes automatically.
- Every finding must preserve source, timestamp, severity, and evidence.
- Keep scan logic behind typed adapters so the app can consume both NecroKit workflows.
- Optimize for a clear judging demo: schedule, scan, inspect, approve, export.
- Never invent a score. When NecroKit returns `score: null` and band `unknown`, show it as unscored and make no plan.
- `vendor/necrokit.mjs` is a build of the NecroKit repo. Do not edit it by hand; rebuild it there and copy it (see `vendor/PROVENANCE.md`).
- Only use Kiro Crew manifest fields and SDK exports that the Kiro Crew docs describe. Mark anything else as an assumption in the README.
- Keep `ui/dist/index.mjs` and `backend/*.mjs` committed: the gateway installs the app folder as is and does not build it.
- Use plain English in UI copy. No emoji, no lucide icons in our own code.
