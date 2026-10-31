// Types for vendor/necrokit.mjs (only the exports Undertaker uses). Mirrors ReportSchema in
// necrokit/packages/necrokit-core/src/contracts.ts. Keep in sync when that contract changes.

export type Severity = "info" | "warning" | "critical";

export type Evidence = {
  id: string;
  source: string;
  label: string;
  value: string | number | boolean | null;
  observedAt: string | null;
  url: string | null;
};

export type Unavailable = { id: string; source: string; reason: string };

export type Finding = {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  weight: number;
  explanation: string;
  evidenceIds: string[];
  suggestedAction: string;
};

export type Breakdown = { info: number; warning: number; critical: number };

export type HealthScore = { score: number; band: "healthy" | "at-risk" | "critical"; breakdown: Breakdown };

/** Used when no evidence could be collected: no number is invented. */
export type Unscored = { score: null; band: "unknown"; breakdown: Breakdown };

export type RevivalStep = { priority: number; findingId: string; action: string };

export type Report = {
  subject: string;
  kind: string;
  generatedAt: string;
  evidence: Evidence[];
  unavailable: Unavailable[];
  findings: Finding[];
  score: HealthScore | Unscored;
  plan: { steps: RevivalStep[] };
};

export type LiveOptions = { githubToken?: string; fetch?: typeof fetch; timeoutMs?: number; now?: Date };

export function scanPackage(fixture: unknown, generatedAt: string): Report;
export function scanRepository(snapshot: unknown, generatedAt: string): Report;
/** npm registry + downloads API. Never throws; failures land in report.unavailable. */
export function scanPackageLive(name: string, opts?: LiveOptions): Promise<Report>;
/** GitHub public REST. Accepts owner/name or a github.com URL; token optional. Never throws. */
export function scanRepositoryLive(input: string, opts?: LiveOptions): Promise<Report>;
export function toMarkdown(report: Report): string;

export const PACKAGE_FIXTURES: Record<string, unknown>;
export const REPO_FIXTURES: Record<string, unknown>;
