import { randomUUID } from "node:crypto";
import type {
  Band,
  DigestItem,
  DigestResponse,
  FixturesResponse,
  Plan,
  ScanEntry,
  Watch,
  WatchesResponse,
  WatchView,
} from "./api-types.ts";
import { APP_NAME } from "./config.ts";
import { approvePlan, exportApprovedPlans, isDecision } from "./plan-approval.ts";
import type { NonceCache } from "./proxy-auth.ts";
import { verifyProxyV1, verifyProxyV2 } from "./proxy-auth.ts";
import { isDue, nextRunAt } from "./schedule.ts";
import { fixtureNames, validateTarget } from "./scanner.ts";
import type { ScanFn } from "./scanner.ts";
import type { Store } from "./store.ts";
import { runDueWatches, runWatch, scansFor } from "./watch.ts";

export type ApiRequest = {
  method: string;
  /** Raw request target as it arrived on the wire: path plus query. */
  target: string;
  headers: Record<string, string | string[] | undefined>;
  body: Uint8Array;
};

export type ApiResponse = { status: number; headers: Record<string, string>; body: string };

export type ApiDeps = {
  store: Store;
  scan: ScanFn;
  now: () => string;
  /** KIROCREW_PROXY_SECRET. When set, every route except /health needs a valid gateway signature. */
  secret?: string;
  nonces?: NonceCache;
};

const TREND_POINTS = 20;
const MAX_EVERY_HOURS = 24 * 30;
const BAND_RANK: Record<Band, number> = { healthy: 0, unknown: 1, "at-risk": 2, critical: 3 };

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (status: number, data: unknown): ApiResponse => ({
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  body: JSON.stringify(data),
});

const header = (req: ApiRequest, name: string): string | undefined => {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

function parseBody(req: ApiRequest): Record<string, unknown> {
  if (req.body.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.from(req.body).toString("utf8"));
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, "Body must be a JSON object");
}

/** The gateway forwards /apps/undertaker/api/<path> as /api/<path>. Also accept the manifest routes prefix. */
export function routePath(target: string): string {
  const path = target.split("?")[0] ?? "/";
  for (const prefix of [`/api/apps/${APP_NAME}`, "/api"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length).replace(/\/+$/, "") || "/";
  }
  return path.replace(/\/+$/, "") || "/";
}

function query(target: string): URLSearchParams {
  const index = target.indexOf("?");
  return new URLSearchParams(index === -1 ? "" : target.slice(index + 1));
}

function viewWatch(watch: Watch, scans: readonly ScanEntry[], plans: readonly Plan[], now: string): WatchView {
  const own = scansFor(scans, watch.id);
  const latest = own.at(-1) ?? null;
  const last = latest?.scannedAt ?? null;
  const trend = own.flatMap((scan) => (scan.score === null ? [] : [{ scannedAt: scan.scannedAt, score: scan.score }]));
  const pending = plans.filter((plan) => plan.watchId === watch.id && plan.decision === null).at(-1);
  return {
    ...watch,
    due: isDue(last, watch.everyHours, now),
    nextRunAt: nextRunAt(last, watch.everyHours, now),
    latest,
    trend: trend.slice(-TREND_POINTS),
    pendingPlanId: pending?.id ?? null,
  };
}

async function listWatches(deps: ApiDeps): Promise<WatchesResponse> {
  const now = deps.now();
  const [watches, scans, plans] = await Promise.all([deps.store.listWatches(), deps.store.listScans(), deps.store.listPlans()]);
  const views = watches.map((watch) => viewWatch(watch, scans, plans, now));
  const count = (band: Band) => views.filter((view) => view.latest?.band === band).length;
  return {
    now,
    watches: views,
    summary: {
      total: views.length,
      due: views.filter((view) => view.due).length,
      healthy: count("healthy"),
      atRisk: count("at-risk"),
      critical: count("critical"),
      unknown: count("unknown"),
      pendingPlans: plans.filter((plan) => plan.decision === null).length,
    },
  };
}

async function addWatch(deps: ApiDeps, body: Record<string, unknown>): Promise<Watch> {
  const problem = validateTarget(body);
  if (problem) throw new HttpError(400, problem);
  const everyHours = body.everyHours ?? 24;
  if (typeof everyHours !== "number" || !Number.isFinite(everyHours) || everyHours <= 0 || everyHours > MAX_EVERY_HOURS) {
    throw new HttpError(400, `everyHours must be a number between 0 and ${MAX_EVERY_HOURS}`);
  }
  const watch: Watch = {
    id: randomUUID(),
    kind: body.kind as Watch["kind"],
    subject: String(body.subject).trim(),
    mode: body.mode as Watch["mode"],
    everyHours,
    createdAt: deps.now(),
  };
  const existing = await deps.store.listWatches();
  if (existing.some((w) => w.kind === watch.kind && w.mode === watch.mode && w.subject === watch.subject)) {
    throw new HttpError(409, `Already watching ${watch.kind} ${watch.subject} (${watch.mode})`);
  }
  await deps.store.addWatch(watch);
  return watch;
}

async function run(deps: ApiDeps, body: Record<string, unknown>): Promise<{ ran: ScanEntry[] }> {
  const runDeps = { scan: deps.scan, store: deps.store, now: deps.now };
  if (body.watchId === undefined) return { ran: await runDueWatches(runDeps) };
  const watch = (await deps.store.listWatches()).find((w) => w.id === body.watchId);
  if (!watch) throw new HttpError(404, `Unknown watch: ${String(body.watchId)}`);
  const entry = await runWatch(watch, runDeps, { force: true });
  return { ran: entry ? [entry] : [] };
}

/** Watches whose band got worse since the previous scan, plus every watch currently critical. */
export async function digest(deps: Pick<ApiDeps, "store" | "now">): Promise<DigestResponse> {
  const [watches, scans, plans] = await Promise.all([deps.store.listWatches(), deps.store.listScans(), deps.store.listPlans()]);
  const worsened: DigestItem[] = [];
  const critical: DigestItem[] = [];
  for (const watch of watches) {
    // An unscored scan (no evidence) says nothing about health, so it is skipped here.
    const scored = scansFor(scans, watch.id).filter((scan) => scan.band !== null && scan.band !== "unknown");
    const latest = scored.at(-1);
    if (!latest?.band) continue;
    const previous = scored.at(-2)?.band ?? null;
    const item: DigestItem = { watchId: watch.id, subject: latest.report?.subject ?? watch.subject, from: previous, to: latest.band, score: latest.score };
    if (previous !== null && BAND_RANK[latest.band] > BAND_RANK[previous]) worsened.push(item);
    if (latest.band === "critical") critical.push(item);
  }
  const pendingPlans = plans.filter((plan) => plan.decision === null).length;
  const line = (i: DigestItem) => `- ${i.subject}: ${i.from ?? "new"} -> ${i.to} (score ${i.score ?? "unscored"})`;
  const markdown = [
    "# Undertaker digest",
    "",
    "## Got worse since the previous scan",
    ...(worsened.length ? worsened.map(line) : ["- None"]),
    "",
    "## Critical now",
    ...(critical.length ? critical.map(line) : ["- None"]),
    "",
    `Pending plans waiting for a human decision: ${pendingPlans}`,
  ].join("\n");
  return { generatedAt: deps.now(), worsened, critical, pendingPlans, markdown: `${markdown}\n` };
}

async function route(deps: ApiDeps, req: ApiRequest, path: string): Promise<ApiResponse> {
  const method = req.method.toUpperCase();
  const parts = path.split("/").filter(Boolean);

  if (method === "GET" && path === "/watches") return json(200, await listWatches(deps));
  if (method === "POST" && path === "/watches") return json(201, await addWatch(deps, parseBody(req)));
  if (method === "DELETE" && parts[0] === "watches" && parts.length === 2) {
    if (!(await deps.store.removeWatch(parts[1] ?? ""))) throw new HttpError(404, `Unknown watch: ${parts[1]}`);
    return json(200, { removed: parts[1] });
  }
  if (method === "POST" && path === "/run") return json(200, await run(deps, parseBody(req)));
  if (method === "GET" && path === "/fixtures") {
    const fixtures: FixturesResponse = { package: fixtureNames("package"), repository: fixtureNames("repository") };
    return json(200, fixtures);
  }
  if (method === "GET" && path === "/scans") {
    const watchId = query(req.target).get("watchId");
    const scans = await deps.store.listScans();
    const picked = watchId ? scansFor(scans, watchId) : [...scans];
    return json(200, { scans: picked.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)) });
  }
  if (method === "GET" && path === "/plans/export") {
    return { status: 200, headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" }, body: await exportApprovedPlans(deps.store) };
  }
  if (method === "GET" && path === "/plans") {
    const status = query(req.target).get("status");
    const plans = (await deps.store.listPlans()).filter((plan) => {
      if (status === "pending") return plan.decision === null;
      if (status === "approve" || status === "dismiss") return plan.decision === status;
      return true;
    });
    return json(200, { plans: plans.reverse() });
  }
  if (method === "POST" && parts[0] === "plans" && parts[2] === "decision" && parts.length === 3) {
    const { decision } = parseBody(req);
    if (!isDecision(decision)) throw new HttpError(400, 'decision must be "approve" or "dismiss"');
    const known = (await deps.store.listPlans()).some((plan) => plan.id === parts[1]);
    if (!known) throw new HttpError(404, `Unknown plan: ${parts[1]}`);
    return json(200, await approvePlan(deps.store, parts[1] ?? "", decision, deps.now()));
  }
  if (method === "GET" && path === "/digest") return json(200, await digest(deps));
  throw new HttpError(404, `${method} ${path} not found`);
}

export function createApi(deps: ApiDeps): (req: ApiRequest) => Promise<ApiResponse> {
  return async (req) => {
    const path = routePath(req.target);
    // The gateway health probe is unsigned, so /health must never require a signature.
    if (req.method.toUpperCase() === "GET" && path === "/health") return json(200, { status: "ok", app: APP_NAME });

    if (deps.secret && deps.nonces) {
      const signed = {
        method: req.method.toUpperCase(),
        target: req.target,
        body: req.body,
        signature: header(req, "x-kirocrew-proxy-v2"),
        nonce: header(req, "x-kirocrew-proxy-nonce"),
      };
      const now = Math.floor(Date.now() / 1000);
      // Prefer the replay-proof v2 header; gateways that only send v1 are checked with v1.
      const ok = signed.signature
        ? verifyProxyV2(signed, deps.secret, now, deps.nonces)
        : verifyProxyV1(header(req, "x-kirocrew-proxy"), signed, deps.secret, now);
      if (!ok) {
        return json(401, { error: "Request was not signed by the Kiro Crew gateway" });
      }
    }

    try {
      return await route(deps, req, path);
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      return json(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };
}

