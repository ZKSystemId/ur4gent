import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import AgentList from "@/components/AgentList";
import OperationsControls from "@/components/OperationsControls";
import { getAgents } from "@/lib/agentStore";
import { getActivities } from "@/lib/activityStore";
import Link from "next/link";
import { getTreasuryStatus } from "@/services/treasuryEngine";
import { getPayments } from "@/services/paymentService";
import { getBlockchainEvents } from "@/services/blockchainMonitor";
import { getOperationsHealth } from "@/services/operationsOrchestrator";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ownerId = (await cookies()).get("ur4gent_ownerId")?.value ?? null;
  const agents = await getAgents(ownerId);
  const allActivities = await getActivities();
  const ownedAgentIds = new Set(agents.map((a) => a.id));
  const ownedActivities = allActivities.filter(
    (a) => !a.agentId || ownedAgentIds.has(a.agentId),
  );
  const activities = ownedActivities.slice(0, 3);
  const operationsExecuted = ownedActivities.filter(
    (activity) => activity.type === "ai_operation",
  ).length;
  const thinkingActivity = ownedActivities.find(
    (activity) =>
      activity.type === "ai_operation" ||
      activity.type === "automation_triggered",
  );
  const treasuryStatus = await getTreasuryStatus();
  const payments = (await getPayments()).filter((p) => !p.agentId || ownedAgentIds.has(p.agentId));
  const blockchainEvents = (await getBlockchainEvents(25)).filter((e) => !e.agentId || ownedAgentIds.has(e.agentId)).slice(0, 3);
  const operationsHealth = getOperationsHealth();
  const decisionActivities = ownedActivities
    .filter(
      (activity) =>
        activity.type === "ai_operation" ||
        activity.type === "payment_executed" ||
        activity.type === "risk_warning" ||
        activity.type === "treasury_alert",
    )
    .slice(0, 3);
  const treasuryBalance = agents.reduce(
    (total, agent) => total + agent.balance,
    0,
  );

  return (
    <DashboardLayout>
      {agents.length > 0 ? (
        <OperationsControls />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                No Rented Agents
              </h3>
              <p className="text-sm text-slate-400">
                Rent an autonomous agent from the marketplace to begin operations.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Browse Marketplace
            </Link>
          </div>
        </section>
      )}
      {agents.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Active Agents</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-cyan-400/30"
              >
                <div className="flex items-start justify-between">
                   <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-xl">
                        🤖
                      </div>
                      <div>
                        <div className="font-semibold text-white group-hover:text-cyan-400">{agent.name}</div>
                        <div className="text-xs text-slate-400 uppercase">{agent.role.replace("_", " ")}</div>
                      </div>
                   </div>
                   <div className={`h-2 w-2 rounded-full ${
                      agent.operationalStatus === "active" ? "bg-emerald-400 animate-pulse" : 
                      agent.operationalStatus === "paused" ? "bg-amber-400" : "bg-rose-400"
                   }`} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Balance: {agent.balance.toFixed(2)} HBAR</span>
                    <span className="text-cyan-400 group-hover:underline">View Console →</span>
                </div>
              </Link>
            ))}
            <Link
               href="/marketplace"
               className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
               <span className="text-2xl">+</span>
               <span className="text-sm font-medium">Rent New Agent</span>
            </Link>
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Operations Health
            </h3>
            <p className="text-sm text-slate-400">
              System status and automation heartbeat
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {operationsHealth.started ? "Running" : "Stopped"}
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Active Operators",
              value: String(agents.length),
            },
            {
              label: "AI Decision Cycles",
              value: String(operationsHealth.decisionCycles),
            },
            {
              label: "Last Operation",
              value: operationsHealth.lastOperationAt ?? "Not yet",
            },
            {
              label: "Last Heartbeat",
              value: operationsHealth.lastTickAt ?? "Not yet",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300"
            >
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="mt-2 text-sm text-slate-200">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300">
          {operationsHealth.runningServices.map((service) => (
            <span
              key={service}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
            >
              {service}
            </span>
          ))}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">
            Operator Status
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            {thinkingActivity?.timestamp ?? "No active thought yet"}
          </p>
          <p className="mt-3 text-sm text-slate-300">
            {thinkingActivity?.detail ??
              "Waiting for next AI decision cycle..."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">
            Treasury Status
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            {new Date().toISOString()}
          </p>
          <div className="mt-3 text-sm text-slate-300">
            {treasuryStatus.alerts.length > 0 ? (
                <div className="text-rose-400">{treasuryStatus.alerts[0]}</div>
            ) : (
                <div>Total Value: ${treasuryStatus.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            )}
            <div className="mt-1 text-xs text-slate-500">
                Managed Assets: {treasuryStatus.assets.length}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-white">
            Scheduled Payments
          </h3>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {payments.filter(p => p.status === "scheduled" || p.status === "pending").length === 0 ? (
              <p className="text-sm text-slate-400">
                No scheduled payments.
              </p>
            ) : (
              payments.filter(p => p.status === "scheduled" || p.status === "pending").slice(0, 3).map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-xs text-slate-300"
                >
                  {payment.amount.toFixed(2)} {payment.token} → {payment.recipientAddress}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Live Activity",
            description: "Monitor agent decisions and payments.",
            href: "/activity",
          },
          {
            title: "Economy Overview",
            description: "Balances, transfers, and system stats.",
            href: "/economy",
          },
          {
            title: "Governance",
            description: "Manage orchestration and permissions.",
            href: "/settings",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-cyan-400/50 hover:bg-slate-900/80"
          >
            <h3 className="text-lg font-semibold text-white">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {item.description}
            </p>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Open →
            </div>
          </Link>
        ))}
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Operator Fleet
            </h3>
            <p className="text-sm text-slate-400">
              Recently active operators in the system
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {agents.length} online
          </div>
        </div>
        <AgentList agents={agents.slice(0, 3)} />
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Agent Actions
            </h3>
            <p className="text-sm text-slate-400">
              Recent operator decisions and actions
            </p>
          </div>
          <Link
            href="/activity"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"
          >
            View all →
          </Link>
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          {decisionActivities.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
              No operator actions yet.
            </div>
          ) : (
            decisionActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{activity.title}</span>
                  <span>{activity.timestamp}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {activity.detail}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Recent Blockchain Events
            </h3>
            <p className="text-sm text-slate-400">
              On-chain activity detected by operators
            </p>
          </div>
          <Link
            href="/activity"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"
          >
            View all →
          </Link>
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          {blockchainEvents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
              No blockchain events yet.
            </div>
          ) : (
            blockchainEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{event.eventType}</span>
                  <span>{event.createdAt.toISOString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{event.detail}</p>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Recent Activity
            </h3>
            <p className="text-sm text-slate-400">
              Snapshot of the latest economy events
            </p>
          </div>
          <Link
            href="/activity"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"
          >
            View all →
          </Link>
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          {activities.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
              No activity yet. Start operations to generate signals.
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{activity.title}</span>
                  <span>{activity.timestamp}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {activity.detail}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}
