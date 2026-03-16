import { addActivity } from "@/lib/activityStore";
import { ensureAgentWallet, updateAgentOperationalStatus } from "@/lib/agentStore";
import { runOperationsCycle } from "@/services/operationsEngine";

export const activateOperator = async (agentId: string) => {
  const agent = await ensureAgentWallet(agentId);
  if (!agent) {
    throw new Error("Operator not found");
  }

  await updateAgentOperationalStatus(agent.id, "active");

  await addActivity({
    type: "automation_triggered",
    title: "Operator activated",
    detail: `${agent.name} is now active for operations.`,
    agentId: agent.id,
  });

  return runOperationsCycle(agent.id);
};
