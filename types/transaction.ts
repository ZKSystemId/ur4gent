export type TransactionRecord = {
  id: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  amount: number;
  transactionId: string | null;
  timestamp: string;
};
