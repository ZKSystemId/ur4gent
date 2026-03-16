import type { Agent } from "@/types/agent";
import AgentCard from "@/components/AgentCard";

type AgentListProps = {
  agents: Agent[];
};

export default function AgentList({ agents }: AgentListProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
