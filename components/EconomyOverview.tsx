import type { Agent } from "@/types/agent";
import type { TransactionRecord } from "@/types/transaction";
import Link from "next/link";

type EconomyOverviewProps = {
  agents: Agent[];
  transactions: TransactionRecord[];
  totalPayments: number;
  activeAgents: number;
  tasksCompleted: number;
};

export default function EconomyOverview({
  agents,
  transactions,
  totalPayments,
  activeAgents,
  tasksCompleted,
}: EconomyOverviewProps) {
  const balanceValues = agents.map((agent) => agent.balance);
  const maxBalance = Math.max(1, ...balanceValues);
  const transactionValues = transactions.slice(0, 8).map((transaction) =>
    Math.abs(transaction.amount),
  );
  const maxTransaction = Math.max(1, ...transactionValues);

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Economy Overview
          </h3>
          <p className="text-sm text-slate-400">
            Hedera balances, transactions, and system stats
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Total payments: {totalPayments.toFixed(2)} HBAR
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Active operators: {activeAgents}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Operations executed: {tasksCompleted}
          </span>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold text-white">
            Balance Distribution
          </h4>
          <div className="mt-4 flex items-end gap-3">
            {agents.length === 0 ? (
              <div className="text-xs text-slate-500">
                No operators available.
              </div>
            ) : (
              agents.map((agent) => {
                const height = Math.max(
                  6,
                  Math.round((agent.balance / maxBalance) * 100),
                );
                return (
                  <div
                    key={agent.id}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-cyan-500/70 to-sky-200/80"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {agent.name}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold text-white">
            Recent Transaction Volume
          </h4>
          <div className="mt-4 flex items-end gap-3">
            {transactionValues.length === 0 ? (
              <div className="text-xs text-slate-500">
                No transfers recorded.
              </div>
            ) : (
              transactionValues.map((amount, index) => {
                const height = Math.max(
                  6,
                  Math.round((amount / maxTransaction) * 100),
                );
                return (
                  <div
                    key={`${amount}-${index}`}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-fuchsia-500/70 to-rose-200/80"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {amount.toFixed(1)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold text-white">
            Operator Balances
          </h4>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 px-3 py-3"
              >
                <div>
                  <Link
                    href={`/agents/${agent.id}`}
                    className="text-sm font-medium text-white hover:text-cyan-200"
                  >
                    {agent.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {agent.hederaAccountId}
                  </p>
                </div>
                <span className="text-sm text-emerald-200">
                  {agent.balance.toFixed(2)} HBAR
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold text-white">
            Transaction History
          </h4>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {transactions.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-4 text-xs text-slate-500">
                No on-chain transfers yet.
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-xl border border-white/5 bg-slate-950/80 px-3 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {transaction.transactionId}
                    </span>
                    <span className="text-xs text-emerald-200">
                      {transaction.amount.toFixed(2)} HBAR
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {transaction.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
