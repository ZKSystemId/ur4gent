import { prisma } from "@/lib/db";
import { ensureAgentWallet } from "@/lib/agentStore";
import { getAgentTemplateById } from "@/lib/marketplaceStore";

const RENTAL_PLANS = {
  starter: { days: 1, credits: 5, priceFactor: 0.2 },
  pro: { days: 7, credits: 30, priceFactor: 0.6 },
  enterprise: { days: 30, credits: 120, priceFactor: 1 },
};

const upsertMemory = async (agentId: string, key: string, value: string) => {
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId, key } },
    update: { value, type: "long_term" },
    create: { agentId, key, value, type: "long_term" },
  });
};

export const rentAgent = async (
  templateId: string,
  ownerId: string = "default-user",
  plan: keyof typeof RENTAL_PLANS = "enterprise",
) => {
  const template = await getAgentTemplateById(templateId);
  if (!template) {
    throw new Error("Agent template not found");
  }

  const planConfig = RENTAL_PLANS[plan] ?? RENTAL_PLANS.enterprise;
  const expiresAt = new Date(Date.now() + planConfig.days * 24 * 60 * 60 * 1000);
  const retainerHbar = Number((template.price * planConfig.priceFactor).toFixed(2));

  // Create the agent instance from template
  const agent = await prisma.agent.create({
    data: {
      templateId: template.id,
      name: `${template.name} (${new Date().toLocaleTimeString()})`, // Unique-ish name
      role: template.role,
      permissions: template.capabilities, // Capabilities map to permissions
      operationalStatus: "inactive", // Start inactive, user must start manually
      strategy: "standard", // Default
      riskLevel: "medium", // Default
      decisionStyle: "balanced", // Default
      status: "active",
      reputation: 100,
      balance: 0.0,
      ownerId: ownerId,
      rentedAt: new Date(),
      // Expires in 30 days for example
      expiresAt,
    },
  });

  // Create wallet but DO NOT auto-activate in orchestrator yet
  await ensureAgentWallet(agent.id);

  await upsertMemory(agent.id, "rental_plan", plan);
  await upsertMemory(agent.id, "rental_expires_at", expiresAt.toISOString());
  await upsertMemory(agent.id, "rental_retainer_hbar", String(retainerHbar));

  if (template.role === "payment_operator") {
    await upsertMemory(agent.id, "payment_credits_total", String(planConfig.credits));
    await upsertMemory(agent.id, "payment_credits_used", "0");
  }
  
  return agent;
};
