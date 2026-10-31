import { describe, expect, it } from "vitest";
import { filterBySeverity, isSeverity } from "../src/filter.ts";
import type { Severity } from "../src/filter.ts";

const findings: { id: string; severity: Severity }[] = [
  { id: "a", severity: "info" },
  { id: "b", severity: "warning" },
  { id: "c", severity: "critical" },
];

describe("filterBySeverity", () => {
  it("keeps findings at or above the minimum severity", () => {
    expect(filterBySeverity(findings, "warning").map((f) => f.id)).toEqual(["b", "c"]);
    expect(filterBySeverity(findings, "critical").map((f) => f.id)).toEqual(["c"]);
  });

  it("keeps everything for info and does not mutate input", () => {
    const copy = [...findings];
    expect(filterBySeverity(findings, "info")).toHaveLength(3);
    expect(findings).toEqual(copy);
  });

  it("only accepts NecroKit's severity scale", () => {
    expect(isSeverity("warning")).toBe(true);
    expect(isSeverity("high")).toBe(false);
  });
});
