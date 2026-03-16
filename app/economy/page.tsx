import DashboardLayout from "@/components/DashboardLayout";
import EconomyOverview from "@/components/EconomyOverview";
import { getAgents } from "@/lib/agentStore";
import { getTransactions } from "@/lib/transactionStore";
import { getActivities } from "@/lib/activityStore";

export const dynamic = "force-dynamic";

export default async function EconomyPage() {
  const agents = await getAgents();
  const transactions = await getTransactions();
  const totalPayments = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const operationsExecuted = (await getActivities()).filter(
    (activity) => activity.type === "ai_operation",
  ).length;

  return (
    <DashboardLayout>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-white">
          Operations Economy
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Track balances, transfers, and operational health on testnet.
        </p>
      </section>
      <EconomyOverview
        agents={agents}
        transactions={transactions}
        totalPayments={totalPayments}
        activeAgents={agents.length}
        tasksCompleted={operationsExecuted}
      />
    </DashboardLayout>
  );
}
