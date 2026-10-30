import { describe, expect, it } from "vitest";
import { isDue, nextRunAt } from "../src/schedule.ts";

const NOW = "2026-10-31T12:00:00.000Z";

describe("isDue", () => {
  it("is due when the watch has never run", () => {
    expect(isDue(null, 6, NOW)).toBe(true);
  });

  it("is due at exactly everyHours after the last run", () => {
    expect(isDue("2026-10-31T06:00:00.000Z", 6, NOW)).toBe(true);
  });

  it("is not due one millisecond before everyHours elapses", () => {
    expect(isDue("2026-10-31T06:00:00.001Z", 6, NOW)).toBe(false);
  });

  it("is not due when the last run is recent", () => {
    expect(isDue("2026-10-31T11:00:00.000Z", 6, NOW)).toBe(false);
  });

  it("rejects non-positive intervals", () => {
    expect(() => isDue(null, 0, NOW)).toThrow(RangeError);
  });
});

describe("nextRunAt", () => {
  it("returns now for a watch that never ran", () => {
    expect(nextRunAt(null, 24, NOW)).toBe(NOW);
  });

  it("adds everyHours to the last run", () => {
    expect(nextRunAt("2026-10-31T00:00:00.000Z", 24, NOW)).toBe("2026-11-01T00:00:00.000Z");
  });
});
