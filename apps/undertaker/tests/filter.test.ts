import { describe, expect, it } from "vitest";
import { filterBySeverity } from "../src/filter.ts";
import type { Finding } from "../src/filter.ts";

const findings: Finding[] = [
  { id: "a", title: "A", severity: "low" },
  { id: "b", title: "B", severity: "medium" },
  { id: "c", title: "C", severity: "high" },
  { id: "d", title: "D", severity: "critical" },
];

describe("filterBySeverity", () => {
  it("keeps findings at or above the minimum severity", () => {
    expect(filterBySeverity(findings, "high").map((f) => f.id)).toEqual(["c", "d"]);
  });

  it("keeps everything for the lowest severity and does not mutate input", () => {
    const copy = [...findings];
    expect(filterBySeverity(findings, "low")).toHaveLength(4);
    expect(findings).toEqual(copy);
  });
});
