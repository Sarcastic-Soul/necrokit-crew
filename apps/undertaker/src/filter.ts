import type { Severity } from "../vendor/necrokit.mjs";

export type { Severity };

export const SEVERITIES: readonly Severity[] = ["info", "warning", "critical"];

const RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

export function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && (SEVERITIES as readonly string[]).includes(value);
}

export function filterBySeverity<T extends { severity: Severity }>(findings: readonly T[], minSeverity: Severity): T[] {
  return findings.filter((finding) => RANK[finding.severity] >= RANK[minSeverity]);
}
