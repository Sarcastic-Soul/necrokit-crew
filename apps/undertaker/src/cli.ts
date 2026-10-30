import { resolve } from "node:path";
import { createFixtureScanner, DEMO_WATCHES } from "./fixtures.ts";
import type { Severity } from "./filter.ts";
import { approvePlan, exportApprovedPlans } from "./plan-approval.ts";
import { isDue } from "./schedule.ts";
import { openStore } from "./store.ts";
import type { PlanDecision, ScanEntry, Store } from "./store.ts";
import { lastScanFor, runWatches } from "./watch.ts";
import type { Watch } from "./watch.ts";

const SEVERITIES: readonly Severity[] = ["low", "medium", "high", "critical"];
const BANDS = ["alive", "wounded", "zombie", "error"];

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function formatScan(scan: ScanEntry): string {
  const error = scan.error ? `  error: ${scan.error}` : "";
  return `    ${scan.kind} ${scan.subject}  score ${scan.score ?? "-"}  findings ${scan.findingCount ?? "-"}${error}`;
}

async function printDashboard(store: Store, watches: readonly Watch[], now: string): Promise<void> {
  const scans = await store.listScans();
  const plans = await store.listPlans();
  const latest = watches.map((watch) => ({ watch, last: lastScanFor(scans, watch) }));

  console.log("Undertaker dashboard\n\nWatches");
  for (const { watch, last } of latest) {
    const state = isDue(last?.scannedAt ?? null, watch.everyHours, now) ? "due" : "scheduled";
    console.log(
      `  ${watch.kind.padEnd(10)} ${watch.subject.padEnd(20)} every ${watch.everyHours}h  last ${last?.scannedAt ?? "never"}  ${state}`,
    );
  }

  console.log("\nLatest scans by band");
  for (const band of BANDS) {
    const rows = latest.flatMap(({ last }) => (last && (last.band ?? "error") === band ? [last] : []));
    console.log(`  ${band} (${rows.length})`);
    for (const row of rows) console.log(formatScan(row));
  }

  console.log("\nPlans");
  for (const plan of plans) console.log(`  ${plan.id}  ${plan.decision ?? "pending"}  ${plan.title}`);
  if (plans.length === 0) console.log("  none");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const storePath = resolve(flag(args, "--store") ?? ".undertaker/store.json");
  const minSeverity = (flag(args, "--min-severity") ?? "low") as Severity;
  if (!SEVERITIES.includes(minSeverity)) throw new RangeError(`Unknown severity: ${minSeverity}`);

  const store = openStore(storePath);
  const now = () => new Date().toISOString();

  const ran = await runWatches(DEMO_WATCHES, { scan: createFixtureScanner(minSeverity), store, now });
  console.log(`Ran ${ran.length} of ${DEMO_WATCHES.length} watches. Store: ${storePath}\n`);

  const decide = flag(args, "--decide");
  if (decide) {
    const [planId, decision] = decide.split("=");
    if (!planId || !decision) throw new RangeError("--decide expects <planId>=<approve|dismiss>");
    const plan = await approvePlan(store, planId, decision as PlanDecision);
    console.log(`Plan ${plan.id} -> ${plan.decision}\n`);
  }

  await printDashboard(store, DEMO_WATCHES, now());
  if (args.includes("--export")) console.log(`\n${await exportApprovedPlans(store)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
