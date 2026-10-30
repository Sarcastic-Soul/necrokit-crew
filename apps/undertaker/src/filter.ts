export type Severity = "low" | "medium" | "high" | "critical";
export type Finding = { id: string; title: string; severity: Severity };

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function filterBySeverity(findings: readonly Finding[], minSeverity: Severity): Finding[] {
  return findings.filter((finding) => RANK[finding.severity] >= RANK[minSeverity]);
}
