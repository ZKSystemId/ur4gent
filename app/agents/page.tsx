import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { getAgents } from "@/lib/agentStore";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Rented Agents</h1>
          <p className="mt-2 text-slate-400">
            Manage your autonomous AI workforce.
          </p>
        </div>

        {agents.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-3xl">
              🤖
            </div>
            <h3 className="text-xl font-semibold text-white">No Agents Rented</h3>
            <p className="mt-2 max-w-md text-slate-400">
              You haven&apos;t rented any AI operators yet. Visit the marketplace to deploy autonomous agents for your operations.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-cyan-400/30"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
                        🤖
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{agent.name}</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">{agent.role.replace("_", " ")}</p>
                      </div>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      agent.operationalStatus === "active" ? "bg-emerald-400 animate-pulse" : 
                      agent.operationalStatus === "paused" ? "bg-amber-400" : "bg-rose-400"
                    }`} />
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Balance</span>
                      <span className="text-white font-mono">{agent.balance.toFixed(2)} HBAR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Last Active</span>
                      <span className="text-slate-300">
                        —
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="flex-1 rounded-lg bg-white/5 py-2 text-center text-sm font-medium text-white hover:bg-white/10"
                  >
                    Open Console
                  </Link>
                </div>
              </div>
            ))}
            
            <Link
              href="/marketplace"
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-4xl mb-2">+</span>
              <span className="font-medium">Rent New Agent</span>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
