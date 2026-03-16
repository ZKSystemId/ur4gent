
export interface OpenClawBounty {
  id: string;
  title: string;
  description: string;
  issuer: string; // The Agent/DAO requesting the task
  reward: {
    amount: number;
    token: string; // HBAR or CLAW
  };
  status: "open" | "in_progress" | "completed" | "submitted" | "verified" | "paid" | "expired";
  requiredCapabilities: string[]; 
  platform: "twitter" | "discord" | "on_chain";
  deadline: string;
}

const MOCK_BOUNTIES: OpenClawBounty[] = [
  {
    id: "bounty-101",
    title: "Promote Ur4gent Launch",
    description: "Post a thread on Twitter about the new Ur4gent launch features, tagging @Hedera and @OpenClaw.",
    issuer: "Marketing DAO Agent",
    reward: { amount: 50, token: "HBAR" },
    status: "open",
    requiredCapabilities: ["social_media", "content_generation"],
    platform: "twitter",
    deadline: "2026-03-05T00:00:00Z",
  },
  {
    id: "bounty-102",
    title: "Liquidity Analysis for SaucerSwap",
    description: "Analyze the liquidity depth of the HBAR/USDC pool on SaucerSwap and generate a risk report.",
    issuer: "Risk Management Bot",
    reward: { amount: 120, token: "HBAR" },
    status: "open",
    requiredCapabilities: ["data_analysis", "defi_analytics"],
    platform: "on_chain",
    deadline: "2026-03-02T12:00:00Z",
  },
  {
    id: "bounty-103",
    title: "Governance Vote Proxy",
    description: "Cast a vote on the latest Hedera Improvement Proposal (HIP) on behalf of the DAO treasury.",
    issuer: "Governance Oracle",
    reward: { amount: 30, token: "HBAR" },
    status: "open",
    requiredCapabilities: ["governance", "voting"],
    platform: "on_chain",
    deadline: "2026-03-01T18:00:00Z",
  },
  {
    id: "bounty-104",
    title: "Discord Community Mod (Shift 1)",
    description: "Monitor the #general channel for 4 hours and answer basic user questions using the knowledge base.",
    issuer: "Community Support AI",
    reward: { amount: 200, token: "CLAW" },
    status: "in_progress",
    requiredCapabilities: ["community_management", "chat_interaction"],
    platform: "discord",
    deadline: "2026-02-28T20:00:00Z",
  },
];

export const getOpenClawBounties = async (): Promise<OpenClawBounty[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  const now = Date.now();
  const base = new Date(now);
  base.setMinutes(0, 0, 0);

  const pseudoDays = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return 2 + (h % 9);
  };

  return MOCK_BOUNTIES.map((b) => {
    const parsed = Date.parse(b.deadline);
    if (!Number.isFinite(parsed)) {
      const next = new Date(base.getTime() + pseudoDays(b.id) * 24 * 60 * 60 * 1000);
      return { ...b, deadline: next.toISOString(), status: b.status === "completed" ? b.status : "open" };
    }
    const isExpired = parsed < now;
    if (!isExpired) return b;
    const next = new Date(base.getTime() + pseudoDays(b.id) * 24 * 60 * 60 * 1000);
    return {
      ...b,
      deadline: next.toISOString(),
      status: b.status === "completed" ? b.status : b.status === "in_progress" ? "in_progress" : "open",
    };
  });
};

export const claimBounty = async (bountyId: string, agentId: string) => {
  // In a real app, this would call the OpenClaw smart contract or API
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  const bounty = MOCK_BOUNTIES.find(b => b.id === bountyId);
  if (!bounty) throw new Error("Bounty not found");
  
  if (bounty.status !== "open") throw new Error("Bounty is not available");
  
  // Return success mock
  return {
    success: true,
    txId: `0.0.12345@${Date.now()}.0`,
    message: `Bounty ${bountyId} claimed by Agent ${agentId}`,
  };
};
