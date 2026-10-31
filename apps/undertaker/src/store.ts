import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rmdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Plan, PlanDecision, ScanEntry, Watch } from "./api-types.ts";

export type { Plan, PlanDecision, ScanEntry, Watch };

/** `watches` is absent until the first seed, so an emptied list is not re-seeded. */
type StoreData = { watches?: Watch[]; scans: ScanEntry[]; plans: Plan[] };

export type Store = {
  listWatches(): Promise<Watch[]>;
  seedWatches(defaults: readonly Watch[]): Promise<boolean>;
  addWatch(watch: Watch): Promise<void>;
  removeWatch(id: string): Promise<boolean>;
  recordScan(entry: ScanEntry): Promise<void>;
  listScans(): Promise<ScanEntry[]>;
  addPlan(plan: Plan): Promise<void>;
  listPlans(): Promise<Plan[]>;
  decidePlan(planId: string, decision: PlanDecision, decidedAt: string): Promise<Plan>;
};

export type StoreOptions = { maxScansPerWatch?: number; lockTimeoutMs?: number };

const LOCK_STALE_MS = 30_000;
const LOCK_RETRY_MS = 25;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The backend and the cron command are separate processes sharing one file,
// so each read-modify-write holds a lock directory (mkdir is atomic).
async function withFileLock<T>(lockPath: string, timeoutMs: number, run: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const age = await stat(lockPath).then((s) => Date.now() - s.mtimeMs, () => 0);
      if (age > LOCK_STALE_MS) await rmdir(lockPath).catch(() => undefined);
      else if (Date.now() > deadline) throw new Error(`Store is locked: ${lockPath}`);
      else await sleep(LOCK_RETRY_MS);
    }
  }
  try {
    return await run();
  } finally {
    await rmdir(lockPath).catch(() => undefined);
  }
}

export function openStore(filePath: string, options: StoreOptions = {}): Store {
  const maxScans = options.maxScansPerWatch ?? 30;
  const lockTimeout = options.lockTimeoutMs ?? 5_000;
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<StoreData> {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<StoreData>;
      const data: StoreData = { scans: parsed.scans ?? [], plans: parsed.plans ?? [] };
      if (parsed.watches) data.watches = parsed.watches;
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { scans: [], plans: [] };
      throw error;
    }
  }

  async function write(data: StoreData): Promise<void> {
    const tmp = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, filePath);
  }

  // Serialized per instance, and locked across processes.
  function update<T>(mutate: (data: StoreData) => T): Promise<T> {
    const run = queue.then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      return withFileLock(`${filePath}.lock`, lockTimeout, async () => {
        const data = await read();
        const result = mutate(data);
        await write(data);
        return result;
      });
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    listWatches: async () => (await read()).watches ?? [],
    seedWatches: (defaults) =>
      update((data) => {
        if (data.watches) return false;
        data.watches = [...defaults];
        return true;
      }),
    addWatch: (watch) =>
      update((data) => {
        data.watches = [...(data.watches ?? []), watch];
      }),
    removeWatch: (id) =>
      update((data) => {
        const before = data.watches ?? [];
        data.watches = before.filter((watch) => watch.id !== id);
        return data.watches.length !== before.length;
      }),
    recordScan: (entry) =>
      update((data) => {
        data.scans.push(entry);
        const own = data.scans.filter((scan) => scan.watchId === entry.watchId);
        if (own.length > maxScans) {
          const drop = new Set(own.slice(0, own.length - maxScans).map((scan) => scan.id));
          data.scans = data.scans.filter((scan) => !drop.has(scan.id));
        }
      }),
    listScans: async () => (await read()).scans,
    addPlan: (plan) =>
      update((data) => {
        data.plans.push(plan);
      }),
    listPlans: async () => (await read()).plans,
    decidePlan: (planId, decision, decidedAt) =>
      update((data) => {
        const plan = data.plans.find((candidate) => candidate.id === planId);
        if (!plan) throw new Error(`Unknown plan: ${planId}`);
        plan.decision = decision;
        plan.decidedAt = decidedAt;
        return { ...plan };
      }),
  };
}
