import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type ScanKind = "package" | "repository";
export type PlanDecision = "approve" | "dismiss";

export type ScanEntry = {
  id: string;
  kind: ScanKind;
  subject: string;
  scannedAt: string;
  score: number | null;
  band: string | null;
  findingCount: number | null;
  error?: string;
};

export type Plan = {
  id: string;
  title: string;
  markdown: string;
  decision: PlanDecision | null;
};

type StoreData = { scans: ScanEntry[]; plans: Plan[] };

export type Store = {
  recordScan(entry: ScanEntry): Promise<void>;
  listScans(): Promise<ScanEntry[]>;
  latestByKind(kind: ScanKind): Promise<ScanEntry | null>;
  addPlan(plan: Plan): Promise<void>;
  listPlans(): Promise<Plan[]>;
  decidePlan(planId: string, decision: PlanDecision): Promise<Plan>;
};

export function openStore(filePath: string): Store {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<StoreData> {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<StoreData>;
      return { scans: parsed.scans ?? [], plans: parsed.plans ?? [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { scans: [], plans: [] };
      throw error;
    }
  }

  async function write(data: StoreData): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, filePath);
  }

  // Writes are serialized per store instance so concurrent updates do not lose each other.
  function update<T>(mutate: (data: StoreData) => T): Promise<T> {
    const run = queue.then(async () => {
      const data = await read();
      const result = mutate(data);
      await write(data);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    recordScan: (entry) =>
      update((data) => {
        data.scans.push(entry);
      }),
    listScans: async () => (await read()).scans,
    latestByKind: async (kind) => {
      const scans = (await read()).scans.filter((scan) => scan.kind === kind);
      return scans.reduce<ScanEntry | null>(
        (latest, scan) => (latest === null || scan.scannedAt >= latest.scannedAt ? scan : latest),
        null,
      );
    },
    addPlan: (plan) =>
      update((data) => {
        data.plans.push(plan);
      }),
    listPlans: async () => (await read()).plans,
    decidePlan: (planId, decision) =>
      update((data) => {
        const plan = data.plans.find((candidate) => candidate.id === planId);
        if (!plan) throw new Error(`Unknown plan: ${planId}`);
        plan.decision = decision;
        return { ...plan };
      }),
  };
}
