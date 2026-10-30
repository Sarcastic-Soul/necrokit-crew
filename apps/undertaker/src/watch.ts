import { randomUUID } from "node:crypto";
import { isDue } from "./schedule.ts";
import type { Plan, ScanEntry, ScanKind, Store } from "./store.ts";

export type Watch = { kind: ScanKind; subject: string; everyHours: number };
export type ScanResult = { score: number; band: string; findingCount: number; report: string };
export type WatchDeps = {
  scan: (watch: Watch) => Promise<ScanResult>;
  store: Store;
  now: () => string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function lastScanFor(scans: readonly ScanEntry[], watch: Watch): ScanEntry | null {
  let latest: ScanEntry | null = null;
  for (const scan of scans) {
    const sameWatch = scan.kind === watch.kind && scan.subject === watch.subject;
    if (sameWatch && (latest === null || scan.scannedAt >= latest.scannedAt)) latest = scan;
  }
  return latest;
}

// Returns null when the watch is not due. Scan failures are recorded as error entries, never thrown.
export async function runWatch(watch: Watch, deps: WatchDeps): Promise<ScanEntry | null> {
  const now = deps.now();
  const last = lastScanFor(await deps.store.listScans(), watch);
  if (!isDue(last?.scannedAt ?? null, watch.everyHours, now)) return null;

  const base = { id: randomUUID(), kind: watch.kind, subject: watch.subject, scannedAt: now };
  let entry: ScanEntry;
  let plan: Plan | null = null;
  try {
    const result = await deps.scan(watch);
    entry = { ...base, score: result.score, band: result.band, findingCount: result.findingCount };
    plan = { id: base.id, title: `Revive ${watch.subject}`, markdown: result.report, decision: null };
  } catch (error) {
    entry = { ...base, score: null, band: null, findingCount: null, error: errorMessage(error) };
  }

  await deps.store.recordScan(entry);
  if (plan) await deps.store.addPlan(plan);
  return entry;
}

export async function runWatches(watches: readonly Watch[], deps: WatchDeps): Promise<ScanEntry[]> {
  const entries: ScanEntry[] = [];
  for (const watch of watches) {
    const entry = await runWatch(watch, deps);
    if (entry) entries.push(entry);
  }
  return entries;
}
