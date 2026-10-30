import { filterBySeverity } from "./filter.ts";
import type { Finding, Severity } from "./filter.ts";
import type { ScanResult, Watch } from "./watch.ts";

const WEIGHT: Record<Severity, number> = { low: 5, medium: 15, high: 25, critical: 40 };

// Recorded fixtures for offline demo. A subject without a fixture fails its scan on purpose.
const FIXTURES: Record<string, Finding[]> = {
  "example-pkg-old": [
    { id: "f1", title: "Last release three years ago", severity: "medium" },
    { id: "f2", title: "Deprecated transitive dependency", severity: "high" },
  ],
  "example-pkg-fresh": [{ id: "f3", title: "Missing README badge", severity: "low" }],
  "example-repo-stale": [
    { id: "f4", title: "No commits in 18 months", severity: "high" },
    { id: "f5", title: "Unpinned CI actions", severity: "critical" },
  ],
};

export const DEMO_WATCHES: Watch[] = [
  { kind: "package", subject: "example-pkg-old", everyHours: 24 },
  { kind: "package", subject: "example-pkg-fresh", everyHours: 168 },
  { kind: "repository", subject: "example-repo-stale", everyHours: 24 },
  { kind: "package", subject: "broken-pkg", everyHours: 24 },
];

export function bandFor(score: number): string {
  if (score >= 80) return "alive";
  if (score >= 50) return "wounded";
  return "zombie";
}

export function createFixtureScanner(minSeverity: Severity): (watch: Watch) => Promise<ScanResult> {
  return async (watch) => {
    const all = FIXTURES[watch.subject];
    if (!all) throw new Error(`No recorded fixture for ${watch.subject}`);

    const score = Math.max(0, 100 - all.reduce((sum, finding) => sum + WEIGHT[finding.severity], 0));
    const shown = filterBySeverity(all, minSeverity);
    const report = [
      `# ${watch.kind}: ${watch.subject}`,
      "",
      `Score ${score} (${bandFor(score)})`,
      "",
      ...shown.map((finding) => `- [${finding.severity}] ${finding.title}`),
    ].join("\n");

    return { score, band: bandFor(score), findingCount: shown.length, report };
  };
}
