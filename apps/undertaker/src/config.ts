import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import type { Watch } from "./api-types.ts";

export const APP_NAME = "undertaker";

/**
 * Where the JSON store lives, in order:
 * 1. UNDERTAKER_DATA_DIR (local dev and tests),
 * 2. $KIROCREW_HOME/apps/<app>/data when spawned by a Kiro Crew gateway,
 * 3. <app root>/data, which is the same folder for an installed app run by the cron command.
 */
export function resolveDataDir(env: NodeJS.ProcessEnv, appRoot: string): string {
  if (env.UNDERTAKER_DATA_DIR) return resolve(env.UNDERTAKER_DATA_DIR);
  if (env.KIROCREW_HOME) return join(env.KIROCREW_HOME, "apps", env.KIROCREW_APP_NAME || APP_NAME, "data");
  return join(appRoot, "data");
}

export function storePath(dataDir: string): string {
  return join(dataDir, "store.json");
}

/** Fixture-backed watches seeded on first run, so the demo works with no network. */
export function defaultWatches(now: string): Watch[] {
  const watch = (kind: Watch["kind"], subject: string, everyHours: number): Watch => ({
    id: randomUUID(),
    kind,
    subject,
    mode: "fixture",
    everyHours,
    createdAt: now,
  });
  return [
    watch("package", "abandoned", 24),
    watch("package", "stable-old", 168),
    watch("repository", "neglected", 24),
    watch("repository", "archived", 24),
    watch("repository", "active", 168),
  ];
}
