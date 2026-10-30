import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStore } from "../src/store.ts";
import type { ScanEntry } from "../src/store.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "undertaker-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const scan = (overrides: Partial<ScanEntry> = {}): ScanEntry => ({
  id: "s1",
  kind: "package",
  subject: "example-pkg-old",
  scannedAt: "2026-10-31T00:00:00.000Z",
  score: 60,
  band: "wounded",
  findingCount: 2,
  ...overrides,
});

describe("store", () => {
  it("round-trips scans through the file across instances", async () => {
    const path = join(dir, "store.json");
    const first = scan({ id: "a" });
    const second = scan({ id: "b", kind: "repository", subject: "example-repo-stale", score: null, band: null, findingCount: null, error: "timeout" });

    await openStore(path).recordScan(first);
    await openStore(path).recordScan(second);

    expect(await openStore(path).listScans()).toEqual([first, second]);
  });

  it("returns the newest scan per kind", async () => {
    const store = openStore(join(dir, "store.json"));
    await store.recordScan(scan({ id: "old", scannedAt: "2026-10-01T00:00:00.000Z" }));
    await store.recordScan(scan({ id: "new", scannedAt: "2026-10-30T00:00:00.000Z" }));
    await store.recordScan(scan({ id: "repo", kind: "repository", scannedAt: "2026-10-31T00:00:00.000Z" }));

    expect((await store.latestByKind("package"))?.id).toBe("new");
    expect((await store.latestByKind("repository"))?.id).toBe("repo");
  });

  it("treats a missing file as an empty store", async () => {
    const store = openStore(join(dir, "missing", "store.json"));
    expect(await store.listScans()).toEqual([]);
    expect(await store.latestByKind("package")).toBeNull();
  });

  it("leaves no temp files behind after a write", async () => {
    const store = openStore(join(dir, "store.json"));
    await store.recordScan(scan());
    expect(await readdir(dir)).toEqual(["store.json"]);
  });
});
