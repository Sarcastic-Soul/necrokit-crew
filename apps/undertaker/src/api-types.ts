// Shared data shapes for the store, the backend routes, and the UI.
// No runtime code and no Node imports, so the UI can import it as types only.
import type { Report, Severity } from "../vendor/necrokit.mjs";

export type { Report, Severity };

export type WatchKind = "package" | "repository";
export type WatchMode = "fixture" | "live";
export type Band = "healthy" | "at-risk" | "critical" | "unknown";
export type PlanDecision = "approve" | "dismiss";

export type Watch = {
  id: string;
  kind: WatchKind;
  /** Fixture name in fixture mode, npm package name or owner/repo in live mode. */
  subject: string;
  mode: WatchMode;
  everyHours: number;
  createdAt: string;
};

export type ScanEntry = {
  id: string;
  watchId: string;
  kind: WatchKind;
  subject: string;
  mode: WatchMode;
  scannedAt: string;
  /** null only when the scan itself threw. */
  score: number | null;
  band: Band | null;
  findingCount: number | null;
  report: Report | null;
  error?: string;
};

export type PlanStep = { priority: number; findingId: string; action: string; severity: Severity; title: string };

export type Plan = {
  id: string;
  watchId: string;
  scanId: string;
  subject: string;
  title: string;
  createdAt: string;
  score: number | null;
  band: Band;
  findingIds: string[];
  steps: PlanStep[];
  markdown: string;
  decision: PlanDecision | null;
  decidedAt: string | null;
};

export type TrendPoint = { scannedAt: string; score: number };

export type WatchView = Watch & {
  due: boolean;
  nextRunAt: string;
  latest: ScanEntry | null;
  trend: TrendPoint[];
  pendingPlanId: string | null;
};

export type WatchSummary = {
  total: number;
  due: number;
  healthy: number;
  atRisk: number;
  critical: number;
  unknown: number;
  pendingPlans: number;
};

export type WatchesResponse = { now: string; watches: WatchView[]; summary: WatchSummary };
export type FixturesResponse = Record<WatchKind, string[]>;
export type RunResponse = { ran: ScanEntry[] };
export type ScansResponse = { scans: ScanEntry[] };
export type PlansResponse = { plans: Plan[] };

export type DigestItem = { watchId: string; subject: string; from: Band | null; to: Band; score: number | null };
export type DigestResponse = {
  generatedAt: string;
  worsened: DigestItem[];
  critical: DigestItem[];
  pendingPlans: number;
  markdown: string;
};
