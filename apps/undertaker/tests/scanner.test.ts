import { describe, expect, it } from "vitest";
import { createScanner, fixtureNames, validateTarget } from "../src/scanner.ts";
import { NOW } from "./helpers.ts";

const at = new Date(NOW);
const offline = (async () => {
  throw new Error("getaddrinfo ENOTFOUND registry.npmjs.org");
}) as unknown as typeof fetch;

describe("fixture mode", () => {
  it("lists the bundled NecroKit fixtures per kind", () => {
    expect(fixtureNames("package")).toEqual(["abandoned", "stable-old"]);
    expect(fixtureNames("repository")).toEqual(["active", "archived", "neglected"]);
  });

  it("scans a package fixture into a real NecroKit report", async () => {
    const report = await createScanner()({ kind: "package", subject: "abandoned", mode: "fixture" }, at);
    expect(report.subject).toBe("abandoned-glob-shim");
    expect(report.score).toMatchObject({ band: "critical" });
    expect(report.findings.map((f) => f.ruleId)).toEqual(
      expect.arrayContaining(["deprecated", "repository-archived", "stale-release"]),
    );
    expect(report.generatedAt).toBe(NOW);
  });

  it("treats an old but maintained package as healthy (age alone is not abandonment)", async () => {
    const report = await createScanner()({ kind: "package", subject: "stable-old", mode: "fixture" }, at);
    expect(report.score).toMatchObject({ band: "healthy" });
    expect(report.findings).toEqual([]);
  });

  it("scans a repository fixture", async () => {
    const report = await createScanner()({ kind: "repository", subject: "neglected", mode: "fixture" }, at);
    expect(report.score).toMatchObject({ band: "at-risk" });
    expect(report.findings.every((f) => ["info", "warning", "critical"].includes(f.severity))).toBe(true);
  });

  it("rejects an unknown fixture name", async () => {
    await expect(createScanner()({ kind: "package", subject: "nope", mode: "fixture" }, at)).rejects.toThrow("No package fixture");
  });
});

describe("live mode", () => {
  it("turns a failing network into unavailable evidence instead of throwing", async () => {
    const report = await createScanner({ fetch: offline })({ kind: "package", subject: "left-pad", mode: "live" }, at);
    expect(report.score.score).toBeNull();
    expect(report.score.band).toBe("unknown");
    expect(report.unavailable.length).toBeGreaterThan(0);
    expect(report.plan.steps).toEqual([]);
  });

  it("does the same for repositories", async () => {
    const report = await createScanner({ fetch: offline })({ kind: "repository", subject: "acme/tool", mode: "live" }, at);
    expect(report.unavailable.length).toBeGreaterThan(0);
  });
});

describe("validateTarget", () => {
  it("checks kind, mode, and subject shape", () => {
    expect(validateTarget({ kind: "package", subject: "abandoned", mode: "fixture" })).toBeNull();
    expect(validateTarget({ kind: "crate", subject: "x", mode: "fixture" })).toMatch(/kind/);
    expect(validateTarget({ kind: "package", subject: "x", mode: "cloud" })).toMatch(/mode/);
    expect(validateTarget({ kind: "repository", subject: "no-slash", mode: "live" })).toMatch(/owner\/name/);
    expect(validateTarget({ kind: "package", subject: "bad name!", mode: "live" })).toMatch(/npm package name/);
  });
});
