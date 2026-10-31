import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApi } from "../src/api.ts";
import type { DigestResponse, Plan, WatchesResponse } from "../src/api-types.ts";
import { exportApprovedPlans } from "../src/plan-approval.ts";
import type { ScanFn } from "../src/scanner.ts";
import { openStore } from "../src/store.ts";
import type { Store } from "../src/store.ts";
import { runWatch } from "../src/watch.ts";
import { abandonedReport, healthyReport, NOW, tempDir, unscoredReport, watch } from "./helpers.ts";

// Contract: Report.score may be { score: null, band: "unknown" } when no evidence was collected.
let store: Store;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const tmp = await tempDir("unscored");
  cleanup = tmp.cleanup;
  store = openStore(join(tmp.dir, "store.json"));
});
afterEach(() => cleanup());

const json = async <T>(handle: ReturnType<typeof createApi>, method: string, target: string): Promise<T> =>
  JSON.parse((await handle({ method, target, headers: {}, body: new Uint8Array() })).body) as T;

describe("unscored reports", () => {
  it("records score null and band unknown, and makes no plan", async () => {
    const entry = await runWatch(watch({ mode: "live", subject: "left-pad" }), {
      scan: async () => unscoredReport(),
      store,
      now: () => NOW,
    });
    expect(entry).toMatchObject({ score: null, band: "unknown", findingCount: 0 });
    expect(entry?.error).toBeUndefined();
    expect(await store.listPlans()).toEqual([]);
  });

  it("counts as unknown in the summary, adds no trend point, and is not reported as worse", async () => {
    let next = healthyReport();
    const scan: ScanFn = async () => next;
    let clock = NOW;
    const handle = createApi({ store, scan, now: () => clock });
    await store.addWatch(watch({ id: "w1", kind: "repository", subject: "active" }));

    await handle({ method: "POST", target: "/api/run", headers: {}, body: Buffer.from('{"watchId":"w1"}') });
    next = unscoredReport("acme/active-lib");
    clock = "2026-10-31T13:00:00.000Z";
    await handle({ method: "POST", target: "/api/run", headers: {}, body: Buffer.from('{"watchId":"w1"}') });

    const view = await json<WatchesResponse>(handle, "GET", "/api/watches");
    expect(view.summary).toMatchObject({ unknown: 1, healthy: 0, critical: 0 });
    expect(view.watches[0]?.latest).toMatchObject({ score: null, band: "unknown" });
    expect(view.watches[0]?.trend.map((p) => p.score)).toEqual([100]);

    const digest = await json<DigestResponse>(handle, "GET", "/api/digest");
    expect(digest.worsened).toEqual([]);
    expect(digest.critical).toEqual([]);
  });

  it("exports a plan scored earlier even if a later scan is unscored", async () => {
    const entry = await runWatch(watch(), { scan: async () => abandonedReport(), store, now: () => NOW });
    expect(entry?.band).toBe("critical");
    const [plan] = (await store.listPlans()) as Plan[];
    await store.decidePlan(plan!.id, "approve", NOW);
    await runWatch(watch(), { scan: async () => unscoredReport("abandoned-glob-shim"), store, now: () => "2026-11-02T00:00:00.000Z" });
    expect(await exportApprovedPlans(store)).toContain(plan!.title);
  });
});
