import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApi, routePath } from "../src/api.ts";
import type { ApiRequest, ApiResponse } from "../src/api.ts";
import type { Plan, WatchesResponse } from "../src/api-types.ts";
import { defaultWatches } from "../src/config.ts";
import { createNonceCache, signV2 } from "../src/proxy-auth.ts";
import { createScanner } from "../src/scanner.ts";
import { openStore } from "../src/store.ts";
import type { Store } from "../src/store.ts";
import { NOW, tempDir } from "./helpers.ts";

let store: Store;
let cleanup: () => Promise<void>;
let handle: (req: ApiRequest) => Promise<ApiResponse>;
let clock = NOW;

const req = (method: string, target: string, body?: unknown): ApiRequest => ({
  method,
  target,
  headers: {},
  body: body === undefined ? new Uint8Array() : Buffer.from(JSON.stringify(body)),
});

const call = async <T = unknown>(method: string, target: string, body?: unknown) => {
  const res = await handle(req(method, target, body));
  return { status: res.status, data: res.headers["content-type"]?.startsWith("application/json") ? (JSON.parse(res.body) as T) : (res.body as T) };
};

beforeEach(async () => {
  const tmp = await tempDir("api");
  cleanup = tmp.cleanup;
  store = openStore(join(tmp.dir, "store.json"));
  clock = NOW;
  await store.seedWatches(defaultWatches(NOW));
  handle = createApi({ store, scan: createScanner(), now: () => clock });
});

afterEach(() => cleanup());

describe("routing", () => {
  it("maps gateway and manifest prefixes to the same route", () => {
    expect(routePath("/api/watches?x=1")).toBe("/watches");
    expect(routePath("/api/apps/undertaker/watches/")).toBe("/watches");
    expect(routePath("/health")).toBe("/health");
  });

  it("answers /health and 404s unknown routes", async () => {
    expect(await call("GET", "/health")).toEqual({ status: 200, data: { status: "ok", app: "undertaker" } });
    expect((await call("GET", "/api/nope")).status).toBe(404);
  });
});

describe("watches", () => {
  it("lists seeded fixture watches as due before the first scan", async () => {
    const { status, data } = await call<WatchesResponse>("GET", "/api/watches");
    expect(status).toBe(200);
    expect(data.watches).toHaveLength(5);
    expect(data.watches.every((w) => w.mode === "fixture" && w.due && w.latest === null)).toBe(true);
    expect(data.summary).toMatchObject({ total: 5, due: 5, critical: 0 });
  });

  it("adds, rejects duplicates and bad input, and removes", async () => {
    const added = await call<{ id: string }>("POST", "/api/watches", { kind: "package", mode: "live", subject: "left-pad", everyHours: 12 });
    expect(added.status).toBe(201);
    expect((await call("POST", "/api/watches", { kind: "package", mode: "live", subject: "left-pad" })).status).toBe(409);
    expect((await call("POST", "/api/watches", { kind: "package", mode: "fixture", subject: "nope" })).status).toBe(400);
    expect((await call("POST", "/api/watches", { kind: "package", mode: "live", subject: "x", everyHours: -1 })).status).toBe(400);
    expect((await handle({ ...req("POST", "/api/watches"), body: Buffer.from("not json") })).status).toBe(400);

    expect((await call("DELETE", `/api/watches/${added.data.id}`)).status).toBe(200);
    expect((await call("DELETE", `/api/watches/${added.data.id}`)).status).toBe(404);
  });
});

describe("run and history", () => {
  it("runs due watches, then nothing until the interval passes", async () => {
    const first = await call<{ ran: unknown[] }>("POST", "/api/run");
    expect(first.data.ran).toHaveLength(5);
    expect((await call<{ ran: unknown[] }>("POST", "/api/run")).data.ran).toHaveLength(0);

    const { data } = await call<WatchesResponse>("GET", "/api/watches");
    expect(data.summary).toMatchObject({ due: 0, critical: 2, atRisk: 1, healthy: 2 });
  });

  it("runs one watch now even when not due, and builds a score trend", async () => {
    const { data } = await call<WatchesResponse>("GET", "/api/watches");
    const id = data.watches[0]?.id;
    await call("POST", "/api/run", { watchId: id });
    clock = "2026-10-31T13:00:00.000Z";
    await call("POST", "/api/run", { watchId: id });

    const after = await call<WatchesResponse>("GET", "/api/watches");
    expect(after.data.watches[0]?.trend).toHaveLength(2);
    const history = await call<{ scans: { scannedAt: string }[] }>("GET", `/api/scans?watchId=${id}`);
    expect(history.data.scans.map((s) => s.scannedAt)).toEqual(["2026-10-31T13:00:00.000Z", NOW]);
    expect((await call("POST", "/api/run", { watchId: "missing" })).status).toBe(404);
  });
});

describe("plans", () => {
  it("lists pending plans, records decisions, and exports only approved ones", async () => {
    await call("POST", "/api/run");
    const pending = await call<{ plans: Plan[] }>("GET", "/api/plans?status=pending");
    expect(pending.data.plans.length).toBe(3);
    const [first, second] = pending.data.plans;

    const approved = await call<Plan>("POST", `/api/plans/${first?.id}/decision`, { decision: "approve" });
    expect(approved.data).toMatchObject({ decision: "approve", decidedAt: NOW });
    await call("POST", `/api/plans/${second?.id}/decision`, { decision: "dismiss" });
    expect((await call("POST", `/api/plans/${first?.id}/decision`, { decision: "maybe" })).status).toBe(400);
    expect((await call("POST", "/api/plans/nope/decision", { decision: "approve" })).status).toBe(404);

    const exported = await handle(req("GET", "/api/plans/export"));
    expect(exported.headers["content-type"]).toContain("text/markdown");
    expect(exported.body).toContain(first?.title);
    expect(exported.body).not.toContain(second?.title);
  });

  it("reports newly critical watches in the digest", async () => {
    await call("POST", "/api/run");
    const digest = await call<{ critical: { subject: string }[]; pendingPlans: number }>("GET", "/api/digest");
    expect(digest.data.critical.map((c) => c.subject).sort()).toEqual(["abandoned-glob-shim", "acme/retired-parser"]);
    expect(digest.data.pendingPlans).toBe(3);
  });
});

describe("gateway signature", () => {
  const secret = "test-secret";
  const signed = (method: string, target: string, nonce: string, ts = Math.floor(Date.now() / 1000)): ApiRequest => ({
    ...req(method, target),
    headers: {
      "x-kirocrew-proxy-v2": `${ts}:${signV2(secret, ts, nonce, method, target, new Uint8Array())}`,
      "x-kirocrew-proxy-nonce": nonce,
    },
  });

  beforeEach(() => {
    handle = createApi({ store, scan: createScanner(), now: () => clock, secret, nonces: createNonceCache() });
  });

  it("keeps /health unsigned but refuses unsigned API calls", async () => {
    expect((await handle(req("GET", "/health"))).status).toBe(200);
    expect((await handle(req("GET", "/api/watches"))).status).toBe(401);
  });

  it("accepts a valid signature once and refuses a replay or a stale timestamp", async () => {
    const nonce = "0123456789abcdef0123456789abcdef";
    expect((await handle(signed("GET", "/api/watches", nonce))).status).toBe(200);
    expect((await handle(signed("GET", "/api/watches", nonce))).status).toBe(401);
    const stale = signed("GET", "/api/watches", "f".repeat(32), Math.floor(Date.now() / 1000) - 120);
    expect((await handle(stale)).status).toBe(401);
  });
});
