import type { AgentStatus } from "@/types/agent";

const statusStyles: Record<AgentStatus, string> = {
  Idle: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  Running: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  Hiring: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
