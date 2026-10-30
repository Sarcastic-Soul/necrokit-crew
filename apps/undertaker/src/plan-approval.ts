import type { Plan, PlanDecision, Store } from "./store.ts";

const DECISIONS: readonly PlanDecision[] = ["approve", "dismiss"];

export async function approvePlan(store: Store, planId: string, decision: PlanDecision): Promise<Plan> {
  if (!DECISIONS.includes(decision)) throw new RangeError(`Invalid decision: ${String(decision)}`);
  return store.decidePlan(planId, decision);
}

export async function exportApprovedPlans(store: Store): Promise<string> {
  const approved = (await store.listPlans()).filter((plan) => plan.decision === "approve");
  const sections = approved.map((plan) => `## ${plan.title}\n\nPlan id: ${plan.id}\n\n${plan.markdown.trim()}`);
  return ["# Approved revival plans", ...sections].join("\n\n") + "\n";
}
