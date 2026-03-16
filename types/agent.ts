export type AgentRole =
  | "treasury_manager"
  | "payment_operator"
  | "blockchain_monitor"
  | "risk_manager"
  | "market_analyst"
  | "token_creator";

export type AgentStatus = "Idle" | "Running" | "Hiring";

export type OperationalStatus = "active" | "paused" | "stopped";

export type AgentStrategy = "Opportunity-Seeking" | "Momentum" | "Defensive";

export type AgentDecisionStyle = "Analytical" | "Fast" | "Conservative";

export type AgentRiskLevel = "Low" | "Medium" | "High";

export type CreateAgentInput = {
  name: string;
  role: AgentRole;
};

export type Agent = {
  id: string;
  name: string;
  role: AgentRole;
  permissions: string[];
  operationalStatus: OperationalStatus;
  strategy: AgentStrategy;
  riskLevel: AgentRiskLevel;
  decisionStyle: AgentDecisionStyle;
  hederaAccountId: string | null;
  publicKey: string | null;
  reputation: number;
  balance: number;
  status: AgentStatus;
  expiresAt?: string | Date | null;
};
