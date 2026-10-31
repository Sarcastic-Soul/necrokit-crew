import { toMarkdown } from "../vendor/necrokit.mjs";
import type { Report } from "../vendor/necrokit.mjs";
import type { Plan, PlanStep, ScanEntry } from "./api-types.ts";

/** Builds an approvable plan from a NecroKit report, or null when there is nothing to do. */
export function planFromReport(report: Report, scan: Pick<ScanEntry, "id" | "watchId" | "scannedAt">): Plan | null {
  if (report.plan.steps.length === 0) return null;
  const byId = new Map(report.findings.map((finding) => [finding.id, finding]));
  const steps: PlanStep[] = report.plan.steps.map((step) => {
    const finding = byId.get(step.findingId);
    return { ...step, severity: finding?.severity ?? "info", title: finding?.title ?? step.findingId };
  });
  return {
    id: scan.id,
    watchId: scan.watchId,
    scanId: scan.id,
    subject: report.subject,
    title: `Revival plan for ${report.subject}`,
    createdAt: scan.scannedAt,
    score: report.score.score,
    band: report.score.band,
    findingIds: report.findings.map((finding) => finding.id).sort(),
    steps,
    markdown: toMarkdown(report),
    decision: null,
    decidedAt: null,
  };
}

/** True when both plans cover the same set of findings. */
export function sameFindings(a: Pick<Plan, "findingIds">, b: Pick<Plan, "findingIds">): boolean {
  return a.findingIds.length === b.findingIds.length && a.findingIds.every((id, i) => id === b.findingIds[i]);
}
