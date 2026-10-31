import {
  PACKAGE_FIXTURES,
  REPO_FIXTURES,
  scanPackage,
  scanPackageLive,
  scanRepository,
  scanRepositoryLive,
} from "../vendor/necrokit.mjs";
import type { Report } from "../vendor/necrokit.mjs";
import type { Watch, WatchKind } from "./api-types.ts";

export type ScanTarget = Pick<Watch, "kind" | "subject" | "mode">;
export type ScanFn = (target: ScanTarget, now: Date) => Promise<Report>;
export type ScannerOptions = { fetch?: typeof fetch; timeoutMs?: number };

const FIXTURES: Record<WatchKind, Record<string, unknown>> = { package: PACKAGE_FIXTURES, repository: REPO_FIXTURES };
const PACKAGE_NAME = /^(@[\w.-]+\/)?[\w.-]+$/;
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

export function fixtureNames(kind: WatchKind): string[] {
  return Object.keys(FIXTURES[kind]).sort();
}

/** Returns a reason the target cannot be scanned, or null when it is valid. */
export function validateTarget(target: { kind?: unknown; subject?: unknown; mode?: unknown }): string | null {
  const { kind, subject, mode } = target;
  if (kind !== "package" && kind !== "repository") return 'kind must be "package" or "repository"';
  if (mode !== "fixture" && mode !== "live") return 'mode must be "fixture" or "live"';
  if (typeof subject !== "string" || subject.trim() === "") return "subject is required";
  if (mode === "fixture" && !(subject in FIXTURES[kind])) {
    return `No ${kind} fixture named "${subject}". Known: ${fixtureNames(kind).join(", ")}`;
  }
  if (mode === "live" && kind === "package" && !PACKAGE_NAME.test(subject)) return "Not a valid npm package name";
  if (mode === "live" && kind === "repository" && !REPO_NAME.test(subject)) return 'Repository must look like "owner/name"';
  return null;
}

/**
 * Fixture mode reads recorded snapshots and never touches the network.
 * Live mode calls the public npm and GitHub APIs; NecroKit never throws there,
 * failed sources come back in report.unavailable.
 */
export function createScanner(options: ScannerOptions = {}): ScanFn {
  return async (target, now) => {
    const problem = validateTarget(target);
    if (problem) throw new Error(problem);
    if (target.mode === "fixture") {
      const fixture = FIXTURES[target.kind][target.subject];
      const generatedAt = now.toISOString();
      return target.kind === "package" ? scanPackage(fixture, generatedAt) : scanRepository(fixture, generatedAt);
    }
    const live = { now, ...options };
    return target.kind === "package" ? scanPackageLive(target.subject, live) : scanRepositoryLive(target.subject, live);
  };
}

