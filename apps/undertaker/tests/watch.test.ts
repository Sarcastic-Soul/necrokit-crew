import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "../src/store.ts";
import { runWatch, runWatches } from "../src/watch.ts";
import type { ScanResult, Watch } from "../src/watch.ts";

const NOW = "2026-10-31T12:00:00.000Z";
const OK: ScanResult = { score: 90, band: "alive", findingCount: 0, report: "# ok" };

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "undertaker-watch-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const watch = (subject: string, everyHours = 24): Watch => ({ kind: "package", subject, everyHours });

describe("runWatches", () => {
  it("keeps running other watches when one scan throws", async () => {
    const store = openStore(join(dir, "store.json"));
    const scan = async (w: Watch): Promise<ScanResult> => {
      if (w.subject === "bad") throw new Error("registry timeout");
      return OK;
    };

    const entries = await runWatches([watch("bad"), watch("good-a"), watch("good-b")], { scan, store, now: () => NOW });

    expect(entries).toMatchObject([
      { subject: "bad", score: null, error: "registry timeout" },
      { subject: "good-a", score: 90, band: "alive" },
      { subject: "good-b", score: 90, band: "alive" },
    ]);
    expect(entries[1]?.error).toBeUndefined();
    expect(await store.listScans()).toHaveLength(3);
    expect(await store.listPlans()).toHaveLength(2);
  });
});

describe("runWatch", () => {
  it("skips the scan when the watch ran less than everyHours ago", async () => {
    const store = openStore(join(dir, "store.json"));
    await store.recordScan({
      id: "prev",
      kind: "package",
      subject: "x",
      scannedAt: "2026-10-31T11:00:00.000Z",
      score: 90,
      band: "alive",
      findingCount: 0,
    });
    let calls = 0;
    const scan = async (): Promise<ScanResult> => {
      calls += 1;
      return OK;
    };

    expect(await runWatch(watch("x"), { scan, store, now: () => NOW })).toBeNull();
    expect(calls).toBe(0);
  });

  it("runs again at exactly everyHours after the last scan", async () => {
    const store = openStore(join(dir, "store.json"));
    await store.recordScan({
      id: "prev",
      kind: "package",
      subject: "x",
      scannedAt: "2026-10-30T12:00:00.000Z",
      score: 90,
      band: "alive",
      findingCount: 0,
    });

    const entry = await runWatch(watch("x"), { scan: async () => OK, store, now: () => NOW });
    expect(entry).toMatchObject({ subject: "x", score: 90, scannedAt: NOW });
  });
});
