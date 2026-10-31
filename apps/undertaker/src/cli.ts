// Text dashboard over the same store the backend uses. Handy for local checks:
//   pnpm --filter @necrokit/undertaker cli [--store path] [--min-severity warning] [--decide <planId>=approve] [--export]
import { resolve } from "node:path";
import { defaultWatches, storePath } from "./config.ts";
import { filterBySeverity, isSeverity } from "./filter.ts";
import { approvePlan, exportApprovedPlans, isDecision } from "./plan-approval.ts";
import { isDue } from "./schedule.ts";
import { createScanner } from "./scanner.ts";
import { openStore } from "./store.ts";
import type { Store } from "./store.ts";
import type { Severity } from "./filter.ts";
import { lastScanFor, runDueWatches } from "./watch.ts";

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function printDashboard(store: Store, minSeverity: Severity, now: string): Promise<void> {
  const [watches, scans, plans] = await Promise.all([store.listWatches(), store.listScans(), store.listPlans()]);

  console.log("Undertaker dashboard\n\nWatches");
  for (const watch of watches) {
    const last = lastScanFor(scans, watch.id);
    const state = isDue(last?.scannedAt ?? null, watch.everyHours, now) ? "due" : "scheduled";
    const score = last ? `${last.score ?? "-"} ${last.band ?? "error"}` : "not scanned";
    console.log(`  ${watch.kind.padEnd(10)} ${watch.mode.padEnd(7)} ${watch.subject.padEnd(16)} every ${watch.everyHours}h  ${state.padEnd(9)} ${score}`);
    for (const finding of filterBySeverity(last?.report?.findings ?? [], minSeverity)) {
      console.log(`      [${finding.severity}] ${finding.title}`);
    }
    if (last?.error) console.log(`      error: ${last.error}`);
  }

  console.log("\nPlans");
  for (const plan of plans) console.log(`  ${plan.id}  ${plan.decision ?? "pending"}  ${plan.title}`);
  if (plans.length === 0) console.log("  none");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const path = resolve(flag(args, "--store") ?? storePath(resolve(".local-data")));
  const minSeverity = flag(args, "--min-severity") ?? "info";
  if (!isSeverity(minSeverity)) throw new RangeError(`Unknown severity: ${minSeverity} (use info, warning, critical)`);

  const store = openStore(path);
  const now = () => new Date().toISOString();
  await store.seedWatches(defaultWatches(now()));

  const ran = await runDueWatches({ scan: createScanner(), store, now });
  console.log(`Ran ${ran.length} due watches. Store: ${path}\n`);

  const decide = flag(args, "--decide");
  if (decide) {
    const [planId, decision] = decide.split("=");
    if (!planId || !isDecision(decision)) throw new RangeError("--decide expects <planId>=<approve|dismiss>");
    const plan = await approvePlan(store, planId, decision, now());
    console.log(`Plan ${plan.id} -> ${plan.decision}\n`);
  }

  await printDashboard(store, minSeverity, now());
  if (args.includes("--export")) console.log(`\n${await exportApprovedPlans(store)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
