import { randomUUID } from "node:crypto";
import type { ScanEntry, Watch } from "./api-types.ts";
import { planFromReport, sameFindings } from "./plans.ts";
import { isDue } from "./schedule.ts";
import type { ScanFn } from "./scanner.ts";
import type { Store } from "./store.ts";

export type WatchDeps = { scan: ScanFn; store: Store; now: () => string };
export type RunOptions = { force?: boolean };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function scansFor(scans: readonly ScanEntry[], watchId: string): ScanEntry[] {
  return scans.filter((scan) => scan.watchId === watchId).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

export function lastScanFor(scans: readonly ScanEntry[], watchId: string): ScanEntry | null {
  return scansFor(scans, watchId).at(-1) ?? null;
}

// Returns null when the watch is not due. Scan failures are recorded as error entries, never thrown.
export async function runWatch(watch: Watch, deps: WatchDeps, options: RunOptions = {}): Promise<ScanEntry | null> {
  const now = deps.now();
  const last = lastScanFor(await deps.store.listScans(), watch.id);
  if (!options.force && !isDue(last?.scannedAt ?? null, watch.everyHours, now)) return null;

  const base = { id: randomUUID(), watchId: watch.id, kind: watch.kind, subject: watch.subject, mode: watch.mode, scannedAt: now };
  let entry: ScanEntry;
  try {
    const report = await deps.scan(watch, new Date(now));
    entry = { ...base, score: report.score.score, band: report.score.band, findingCount: report.findings.length, report };
  } catch (error) {
    entry = { ...base, score: null, band: null, findingCount: null, report: null, error: errorMessage(error) };
  }
  await deps.store.recordScan(entry);

  const plan = entry.report ? planFromReport(entry.report, entry) : null;
  if (plan) {
    // A plan already decided or pending for the same findings is not repeated.
    const previous = (await deps.store.listPlans()).filter((p) => p.watchId === watch.id).at(-1);
    if (!previous || !sameFindings(previous, plan)) await deps.store.addPlan(plan);
  }
  return entry;
}

export async function runWatches(watches: readonly Watch[], deps: WatchDeps, options: RunOptions = {}): Promise<ScanEntry[]> {
  const entries: ScanEntry[] = [];
  for (const watch of watches) {
    const entry = await runWatch(watch, deps, options);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function runDueWatches(deps: WatchDeps): Promise<ScanEntry[]> {
  return runWatches(await deps.store.listWatches(), deps);
}
