import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { approvePlan, exportApprovedPlans } from "../src/plan-approval.ts";
import { openStore } from "../src/store.ts";
import type { PlanDecision } from "../src/store.ts";
import { NOW, plan, tempDir } from "./helpers.ts";

let path: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const tmp = await tempDir("plans");
  path = join(tmp.dir, "store.json");
  cleanup = tmp.cleanup;
});

afterEach(() => cleanup());

async function seed(): Promise<void> {
  const store = openStore(path);
  await store.addPlan(plan({ id: "p1", title: "Revive alpha" }));
  await store.addPlan(plan({ id: "p2", title: "Revive beta", markdown: "- drop beta" }));
  await store.addPlan(plan({ id: "p3", title: "Revive gamma", markdown: "- review gamma" }));
}

describe("approvePlan", () => {
  it("persists approve and dismiss decisions across store instances", async () => {
    await seed();
    await approvePlan(openStore(path), "p1", "approve", NOW);
    await approvePlan(openStore(path), "p2", "dismiss", NOW);

    const plans = await openStore(path).listPlans();
    expect(plans.map((p) => [p.id, p.decision, p.decidedAt])).toEqual([
      ["p1", "approve", NOW],
      ["p2", "dismiss", NOW],
      ["p3", null, null],
    ]);
  });

  it("rejects an unknown decision", async () => {
    await seed();
    await expect(approvePlan(openStore(path), "p1", "maybe" as PlanDecision, NOW)).rejects.toThrow(RangeError);
  });

  it("rejects an unknown plan id", async () => {
    await seed();
    await expect(approvePlan(openStore(path), "nope", "approve", NOW)).rejects.toThrow("Unknown plan: nope");
  });
});

describe("exportApprovedPlans", () => {
  it("contains only approved plans, with their steps", async () => {
    await seed();
    await approvePlan(openStore(path), "p1", "approve", NOW);
    await approvePlan(openStore(path), "p2", "dismiss", NOW);

    const markdown = await exportApprovedPlans(openStore(path));
    expect(markdown).toContain("## Revive alpha");
    expect(markdown).toContain("1. [warning] bump alpha");
    expect(markdown).not.toContain("Revive beta");
    expect(markdown).not.toContain("Revive gamma");
  });

  it("says so when nothing is approved", async () => {
    await seed();
    expect(await exportApprovedPlans(openStore(path))).toContain("No approved plans yet.");
  });
});
