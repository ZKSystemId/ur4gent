import type { Agent } from "@/types/agent";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

type AgentCardProps = {
  agent: Agent;
};

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="block rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950 p-5 shadow-[0_0_30px_rgba(15,23,42,0.35)] transition hover:border-cyan-400/30"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
          <div className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {agent.role}
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div className="mt-4 space-y-2 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span>Hedera Account</span>
          <span className="font-mono text-[11px] text-slate-200">
            {agent.hederaAccountId}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Public Key</span>
          <span className="font-mono text-[11px] text-slate-200">
            {agent.publicKey}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Reputation</span>
          <span className="text-slate-100">{agent.reputation}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Strategy</span>
          <span className="text-slate-100">{agent.strategy}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Risk Level</span>
          <span className="text-slate-100">{agent.riskLevel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Decision Style</span>
          <span className="text-slate-100">{agent.decisionStyle}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Balance</span>
          <span className="text-slate-100">
            {agent.balance.toFixed(2)} HBAR
          </span>
        </div>
      </div>
    </Link>
  );
}
