import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Report } from "../vendor/necrokit.mjs";
import { openStore } from "../src/store.ts";
import type { Store } from "../src/store.ts";
import type { ScanFn } from "../src/scanner.ts";
import { runDueWatches, runWatch, runWatches } from "../src/watch.ts";
import { abandonedReport, healthyReport, NOW, scan as scanEntry, tempDir, watch } from "./helpers.ts";

let store: Store;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const tmp = await tempDir("watch");
  store = openStore(join(tmp.dir, "store.json"));
  cleanup = tmp.cleanup;
});

afterEach(() => cleanup());

const fixed = (report: Report): ScanFn => async () => report;

describe("runWatches", () => {
  it("keeps running other watches when one scan throws", async () => {
    const scan: ScanFn = async (target) => {
      if (target.subject === "bad") throw new Error("registry timeout");
      return abandonedReport();
    };
    const watches = [watch({ id: "a", subject: "bad" }), watch({ id: "b" }), watch({ id: "c" })];

    const entries = await runWatches(watches, { scan, store, now: () => NOW });

    expect(entries).toMatchObject([
      { watchId: "a", score: null, band: null, error: "registry timeout" },
      { watchId: "b", band: "critical" },
      { watchId: "c", band: "critical" },
    ]);
    expect(entries[1]?.error).toBeUndefined();
    expect(await store.listScans()).toHaveLength(3);
    expect(await store.listPlans()).toHaveLength(2);
  });
});

describe("runWatch", () => {
  it("records NecroKit's score, band, and findings", async () => {
    const entry = await runWatch(watch(), { scan: fixed(abandonedReport()), store, now: () => NOW });
    expect(entry).toMatchObject({ score: 2, band: "critical", findingCount: 5 });
    expect(entry?.report?.findings.map((f) => f.severity)).toContain("critical");
  });

  it("builds the plan from the report's ordered steps, most severe first", async () => {
    await runWatch(watch(), { scan: fixed(abandonedReport()), store, now: () => NOW });
    const [plan] = await store.listPlans();
    expect(plan?.steps.map((s) => s.severity)).toEqual(["critical", "critical", "warning", "info", "info"]);
    expect(plan?.markdown).toContain("## Revival plan");
    expect(plan?.decision).toBeNull();
  });

  it("creates no plan when the report has nothing to fix", async () => {
    await runWatch(watch(), { scan: fixed(healthyReport()), store, now: () => NOW });
    expect(await store.listPlans()).toEqual([]);
  });

  it("does not repeat a plan for the same findings, even after it was dismissed", async () => {
    const deps = { scan: fixed(abandonedReport()), store, now: () => NOW };
    await runWatch(watch(), deps, { force: true });
    const [first] = await store.listPlans();
    await store.decidePlan(first?.id ?? "", "dismiss", NOW);
    await runWatch(watch(), deps, { force: true });
    expect(await store.listPlans()).toHaveLength(1);
  });

  it("skips the scan when the watch ran less than everyHours ago", async () => {
    await store.recordScan(scanEntry({ scannedAt: "2026-10-31T11:00:00.000Z" }));
    let calls = 0;
    const scan: ScanFn = async () => {
      calls += 1;
      return healthyReport();
    };

    expect(await runWatch(watch(), { scan, store, now: () => NOW })).toBeNull();
    expect(calls).toBe(0);
  });

  it("runs a watch that is not due when forced", async () => {
    await store.recordScan(scanEntry({ scannedAt: "2026-10-31T11:00:00.000Z" }));
    const entry = await runWatch(watch(), { scan: fixed(healthyReport()), store, now: () => NOW }, { force: true });
    expect(entry).toMatchObject({ band: "healthy", scannedAt: NOW });
  });

  it("runs again at exactly everyHours after the last scan", async () => {
    await store.recordScan(scanEntry({ scannedAt: "2026-10-30T12:00:00.000Z" }));
    const entry = await runWatch(watch(), { scan: fixed(healthyReport()), store, now: () => NOW });
    expect(entry).toMatchObject({ score: 100, scannedAt: NOW });
  });
});

describe("runDueWatches", () => {
  it("scans the stored watches that are due", async () => {
    await store.seedWatches([watch({ id: "a" }), watch({ id: "b" })]);
    await store.recordScan(scanEntry({ watchId: "b", scannedAt: "2026-10-31T11:00:00.000Z" }));
    const ran = await runDueWatches({ scan: fixed(healthyReport()), store, now: () => NOW });
    expect(ran.map((e) => e.watchId)).toEqual(["a"]);
  });
});
