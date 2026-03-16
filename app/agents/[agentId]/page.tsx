import DashboardLayout from "@/components/DashboardLayout";
import { getAgentById } from "@/lib/agentStore";
import { prisma } from "@/lib/db";
import AgentControlPanel from "@/components/AgentControlPanel"; // Client component
import { notFound } from "next/navigation";
import PaymentInsights from "@/components/PaymentInsights";
import TreasuryDashboard from "@/components/TreasuryDashboard";
import RiskMonitorPanel from "@/components/RiskMonitorPanel";
import MarketMonitorPanel from "@/components/MarketMonitorPanel";
import { getTreasuryStatus, type TreasuryStatus } from "@/services/treasuryEngine";
import { scanForRisks } from "@/services/actionExecutor";
import { getMarketSnapshot, runMarketEngine } from "@/services/marketEngine";

export const dynamic = "force-dynamic";

type AgentPageProps = {
  params: Promise<{ agentId: string }>;
};

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;
  const agent = await getAgentById(agentId);

  if (!agent) {
    notFound();
  }

  // Fetch initial logs
  const logs = await prisma.agentLog.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch role-specific data
  type MarketRoleData = Awaited<ReturnType<typeof runMarketEngine>>;
  type RiskRoleData = Awaited<ReturnType<typeof scanForRisks>>;
  type RoleData = TreasuryStatus | MarketRoleData | RiskRoleData | Record<string, never>;

  let roleData: RoleData = {};
  
  if (agent.role === "treasury_manager") {
    roleData = await getTreasuryStatus(agent.id);
  } else if (agent.role === "risk_manager") {
    roleData = await scanForRisks(agent.id);
  } else if (agent.role === "market_analyst") {
    roleData = await getMarketSnapshot();
  }

  return (
    <DashboardLayout>
       <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="rounded-md bg-white/5 px-2 py-0.5 uppercase text-xs">{agent.role.replace("_", " ")}</span>
                <span>•</span>
                <span className="font-mono">{agent.id}</span>
              </div>
            </div>
          </div>
          {/* Balance moved to Client Component Header */}
        </div>

        {/* Client Side Controls */}
        <AgentControlPanel agent={agent} initialLogs={JSON.parse(JSON.stringify(logs))} />
            
        {agent.role === "payment_operator" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Payment Insights</h3>
                <PaymentInsights agentId={agent.id} />
            </div>
        )}

        {agent.role === "treasury_manager" && (
            <TreasuryDashboard initialData={roleData as TreasuryStatus} agentId={agent.id} />
        )}

        {agent.role === "market_analyst" && (
            <MarketMonitorPanel agentId={agent.id} initialData={roleData as MarketRoleData} operationalStatus={agent.operationalStatus} />
        )}

        {agent.role === "risk_manager" && (
            <RiskMonitorPanel agentId={agent.id} initialData={roleData as RiskRoleData} operationalStatus={agent.operationalStatus} />
        )}

       </div>
    </DashboardLayout>
  );
}
