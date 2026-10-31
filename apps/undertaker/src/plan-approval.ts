import type { Plan, PlanDecision, Store } from "./store.ts";

const DECISIONS: readonly PlanDecision[] = ["approve", "dismiss"];

export function isDecision(value: unknown): value is PlanDecision {
  return typeof value === "string" && (DECISIONS as readonly string[]).includes(value);
}

export async function approvePlan(store: Store, planId: string, decision: PlanDecision, decidedAt: string): Promise<Plan> {
  if (!isDecision(decision)) throw new RangeError(`Invalid decision: ${String(decision)}`);
  return store.decidePlan(planId, decision, decidedAt);
}

function section(plan: Plan): string {
  const steps = plan.steps.map((step) => `${step.priority}. [${step.severity}] ${step.action} (${step.title})`);
  return [
    `## ${plan.title}`,
    `Plan id: ${plan.id}  \nApproved: ${plan.decidedAt ?? "unknown"}  \nScore when planned: ${plan.score ?? "unscored"} (${plan.band})`,
    "### Steps",
    steps.join("\n"),
    "### Scan report",
    plan.markdown.trim().replace(/^#/gm, "####"),
  ].join("\n\n");
}

export async function exportApprovedPlans(store: Store): Promise<string> {
  const approved = (await store.listPlans()).filter((plan) => plan.decision === "approve");
  const intro = approved.length === 0 ? ["No approved plans yet."] : approved.map(section);
  return ["# Approved revival plans", ...intro].join("\n\n") + "\n";
}
