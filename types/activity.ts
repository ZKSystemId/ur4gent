export type ActivityType =
  | "agent_created"
  | "ai_operation"
  | "payment_created"
  | "payment_executed"
  | "treasury_alert"
  | "blockchain_event"
  | "risk_warning"
  | "automation_triggered"
  | "on_chain_payment";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestamp: string;
  agentId?: string;
};
