import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "../src/store.ts";
import { scan, tempDir, watch } from "./helpers.ts";

let dir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  ({ dir, cleanup } = await tempDir("store"));
});

afterEach(() => cleanup());

describe("store", () => {
  it("round-trips scans through the file across instances", async () => {
    const path = join(dir, "store.json");
    const first = scan({ id: "a" });
    const second = scan({ id: "b", kind: "repository", subject: "neglected", score: null, band: null, findingCount: null, error: "timeout" });

    await openStore(path).recordScan(first);
    await openStore(path).recordScan(second);

    expect(await openStore(path).listScans()).toEqual([first, second]);
  });

  it("keeps only the newest scans per watch", async () => {
    const store = openStore(join(dir, "store.json"), { maxScansPerWatch: 2 });
    for (const id of ["1", "2", "3"]) await store.recordScan(scan({ id, scannedAt: `2026-10-0${id}T00:00:00.000Z` }));
    await store.recordScan(scan({ id: "other", watchId: "w2" }));

    expect((await store.listScans()).map((s) => s.id)).toEqual(["2", "3", "other"]);
  });

  it("treats a missing file as an empty store", async () => {
    const store = openStore(join(dir, "missing", "store.json"));
    expect(await store.listScans()).toEqual([]);
    expect(await store.listWatches()).toEqual([]);
  });

  it("seeds watches once and never re-seeds an emptied list", async () => {
    const store = openStore(join(dir, "store.json"));
    expect(await store.seedWatches([watch()])).toBe(true);
    expect(await store.removeWatch("w1")).toBe(true);
    expect(await store.seedWatches([watch()])).toBe(false);
    expect(await store.listWatches()).toEqual([]);
  });

  it("leaves no temp or lock files behind after a write", async () => {
    const store = openStore(join(dir, "store.json"));
    await store.recordScan(scan());
    expect(await readdir(dir)).toEqual(["store.json"]);
  });

  it("waits for another process's lock and fails clearly when it never clears", async () => {
    const path = join(dir, "store.json");
    await mkdir(`${path}.lock`);
    const store = openStore(path, { lockTimeoutMs: 100 });
    await expect(store.recordScan(scan())).rejects.toThrow("Store is locked");
  });
});
