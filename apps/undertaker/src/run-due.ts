// Cron entry point. Bundled to backend/run-due.mjs and run by the manifest's
// "run-due-watches" command cron: scans every due watch, no model call.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultWatches, resolveDataDir, storePath } from "./config.ts";
import { createScanner } from "./scanner.ts";
import { openStore } from "./store.ts";
import { runDueWatches } from "./watch.ts";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolveDataDir(process.env, appRoot);
const store = openStore(storePath(dataDir));
const now = () => new Date().toISOString();

try {
  await store.seedWatches(defaultWatches(now()));
  const ran = await runDueWatches({ scan: createScanner(), store, now });
  const failed = ran.filter((entry) => entry.error).length;
  const critical = ran.filter((entry) => entry.band === "critical").map((entry) => entry.report?.subject ?? entry.subject);
  console.log(JSON.stringify({ ran: ran.length, failed, critical, dataDir }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
