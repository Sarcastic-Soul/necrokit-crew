import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approvePlan, exportApprovedPlans } from "../src/plan-approval.ts";
import { openStore } from "../src/store.ts";
import type { PlanDecision } from "../src/store.ts";

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "undertaker-plans-"));
  path = join(dir, "store.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function seed(): Promise<void> {
  const store = openStore(path);
  await store.addPlan({ id: "p1", title: "Revive alpha", markdown: "- bump alpha", decision: null });
  await store.addPlan({ id: "p2", title: "Revive beta", markdown: "- drop beta", decision: null });
  await store.addPlan({ id: "p3", title: "Revive gamma", markdown: "- review gamma", decision: null });
}

describe("approvePlan", () => {
  it("persists approve and dismiss decisions across store instances", async () => {
    await seed();
    await approvePlan(openStore(path), "p1", "approve");
    await approvePlan(openStore(path), "p2", "dismiss");

    const plans = await openStore(path).listPlans();
    expect(plans.map((plan) => [plan.id, plan.decision])).toEqual([
      ["p1", "approve"],
      ["p2", "dismiss"],
      ["p3", null],
    ]);
  });

  it("rejects an unknown decision", async () => {
    await seed();
    await expect(approvePlan(openStore(path), "p1", "maybe" as PlanDecision)).rejects.toThrow(RangeError);
  });

  it("rejects an unknown plan id", async () => {
    await seed();
    await expect(approvePlan(openStore(path), "nope", "approve")).rejects.toThrow("Unknown plan: nope");
  });
});

describe("exportApprovedPlans", () => {
  it("contains only approved plans", async () => {
    await seed();
    await approvePlan(openStore(path), "p1", "approve");
    await approvePlan(openStore(path), "p2", "dismiss");

    const markdown = await exportApprovedPlans(openStore(path));
    expect(markdown).toContain("## Revive alpha");
    expect(markdown).toContain("- bump alpha");
    expect(markdown).not.toContain("Revive beta");
    expect(markdown).not.toContain("Revive gamma");
  });
});
