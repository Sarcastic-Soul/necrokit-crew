import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PACKAGE_FIXTURES, REPO_FIXTURES, scanPackage, scanRepository } from "../vendor/necrokit.mjs";
import type { Report } from "../vendor/necrokit.mjs";
import type { Plan, ScanEntry, Watch } from "../src/api-types.ts";

export const NOW = "2026-10-31T12:00:00.000Z";

export async function tempDir(prefix: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), `undertaker-${prefix}-`));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export const watch = (overrides: Partial<Watch> = {}): Watch => ({
  id: "w1",
  kind: "package",
  subject: "abandoned",
  mode: "fixture",
  everyHours: 24,
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

/** Real NecroKit reports from the vendored fixtures. */
export const abandonedReport = (at = NOW): Report => scanPackage(PACKAGE_FIXTURES.abandoned, at);
export const healthyReport = (at = NOW): Report => scanRepository(REPO_FIXTURES.active, at);

export const scan = (overrides: Partial<ScanEntry> = {}): ScanEntry => ({
  id: "s1",
  watchId: "w1",
  kind: "package",
  subject: "abandoned",
  mode: "fixture",
  scannedAt: "2026-10-31T00:00:00.000Z",
  score: 68,
  band: "at-risk",
  findingCount: 2,
  report: null,
  ...overrides,
});

export const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "p1",
  watchId: "w1",
  scanId: "s1",
  subject: "alpha",
  title: "Revival plan for alpha",
  createdAt: NOW,
  score: 40,
  band: "at-risk",
  findingIds: ["a"],
  steps: [{ priority: 1, findingId: "a", action: "bump alpha", severity: "warning", title: "Old release" }],
  markdown: "# alpha\n\n- bump alpha\n",
  decision: null,
  decidedAt: null,
  ...overrides,
});

/** What NecroKit returns when no evidence could be collected (for example an npm 404). */
export const unscoredReport = (subject = "left-pad", at = NOW): Report => ({
  subject,
  kind: "package",
  generatedAt: at,
  evidence: [],
  unavailable: [{ id: "registry", source: "npm registry", reason: "HTTP 404" }],
  findings: [],
  score: { score: null, band: "unknown", breakdown: { info: 0, warning: 0, critical: 0 } },
  plan: { steps: [] },
});
