"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useWallet } from "@/lib/hashconnect";
import { getOpenClawBounties, claimBounty, type OpenClawBounty } from "@/services/openClawService";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define a type for our Agent data structure from API
interface AgentData {
  id: string;
  name: string;
  role: string;
  status: string;
  permissions: string[];
  reputation: number;
}

export default function BountiesPage() {
  const { isConnected, accountId } = useWallet();
  const [bounties, setBounties] = useState<OpenClawBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [executionLogs, setExecutionLogs] = useState<Record<string, string[]>>({});
  const [completedProofs, setCompletedProofs] = useState<Record<string, { topicId: string, seq: string, settlementSeq?: string | null, tokenId?: string | null, creditAmount?: number, transferTx?: string | null, paymentTxId?: string | null, paymentStatus?: string | null }>>({});
  const [bountyStages, setBountyStages] = useState<Record<string, number>>({});
  const [autoAssign, setAutoAssign] = useState(true);
  const router = useRouter();
  const hashscanNetwork = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";
  const hashscanBase = `https://hashscan.io/${hashscanNetwork}`;
  const proofStorageKey = "openclaw_proofs_v1";
  const bountyStatusStorageKey = "openclaw_bounty_status_v1";

  const safeJson = async <T,>(res: Response): Promise<T | null> => {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  const getOpenClawCapabilities = useCallback((agent: AgentData | null | undefined) => {
    if (!agent) return [];
    const roleCaps: Record<string, string[]> = {
      market_analyst: ["data_analysis", "defi_analytics", "content_generation"],
      risk_manager: ["data_analysis", "defi_analytics", "governance"],
      treasury_manager: ["governance", "voting", "data_analysis"],
      payment_operator: ["social_media", "content_generation", "community_management", "chat_interaction"],
      blockchain_monitor: ["data_analysis", "defi_analytics"],
      token_creator: ["content_generation", "defi_analytics"],
    };

    const permCaps = (agent.permissions ?? []).flatMap((p) => {
      if (p.startsWith("payments:")) return ["social_media"];
      if (p.startsWith("treasury:")) return ["governance", "voting"];
      if (p.startsWith("chain:")) return ["data_analysis"];
      if (p.startsWith("alerts:")) return ["community_management"];
      return [];
    });

    const set = new Set<string>([...(agent.permissions ?? []), ...(roleCaps[agent.role] ?? []), ...permCaps]);
    return [...set];
  }, []);

  const rankAgentsForRequirements = useCallback((required: string[]) => {
    return [...agents]
      .map((a) => {
        const caps = getOpenClawCapabilities(a);
        const match =
          required.length === 0
            ? 100
            : Math.round(
                (required.filter((cap) => caps.includes(cap)).length / required.length) * 100,
              );
        const score = Math.round(match * 0.7 + (a.reputation ?? 0) * 0.3);
        return { ...a, match, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [agents, getOpenClawCapabilities]);

  const pickBestAgentForBounty = useCallback((bounty: OpenClawBounty) => {
    const required = bounty.requiredCapabilities ?? [];
    const ranked = rankAgentsForRequirements(required);
    return ranked.find((a) => a.match === 100) ?? ranked[0] ?? null;
  }, [rankAgentsForRequirements]);

  useEffect(() => {
    try {
      const savedProofsRaw = localStorage.getItem(proofStorageKey);
      if (savedProofsRaw) {
        const saved = JSON.parse(savedProofsRaw) as Record<string, unknown>;
        if (saved && typeof saved === "object") {
          setCompletedProofs(saved as typeof completedProofs);
        }
      }
    } catch {}

    // Fetch Bounties
    getOpenClawBounties().then((data) => {
        try {
          const statusRaw = localStorage.getItem(bountyStatusStorageKey);
          if (statusRaw) {
            const statusMap = JSON.parse(statusRaw) as Record<string, OpenClawBounty["status"]>;
            setBounties(
              data.map((b) => {
                const override = statusMap?.[b.id];
                return override ? { ...b, status: override } : b;
              }),
            );
          } else {
            setBounties(data);
          }
        } catch {
          setBounties(data);
        }
        setLoading(false);
    });

    // Fetch User's Agents
    fetch("/api/agents/list")
      .then(async (res) => {
        const json = await safeJson<{ agents?: AgentData[] }>(res);
        const data = json?.agents ?? json ?? [];
        if (Array.isArray(data)) {
          setAgents(data);
        } else {
          console.error("Agents data is not an array:", data);
          setAgents([]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(proofStorageKey, JSON.stringify(completedProofs));
    } catch {}
  }, [completedProofs]);

  useEffect(() => {
    if (selectedAgent || agents.length === 0 || bounties.length === 0) return;
    const firstOpen = bounties.find((b) => b.status === "open") ?? bounties[0];
    if (!firstOpen) return;
    const best = pickBestAgentForBounty(firstOpen);
    if (best) setSelectedAgent(best.id);
  }, [agents, bounties, pickBestAgentForBounty, selectedAgent]);

  const simulateExecution = async (input: {
    bounty: OpenClawBounty;
    agentId: string;
    agentName: string;
    collateralAmount: number;
  }) => {
      const { bounty, agentId, agentName, collateralAmount } = input;
      const bountyId = bounty.id;

      const ts = () => new Date().toLocaleTimeString();
      const pushLog = (line: string) => {
        setExecutionLogs((prev) => ({
          ...prev,
          [bountyId]: [...(prev[bountyId] || []), `${ts()} ${line}`],
        }));
      };

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const runLines = async (lines: string[], delayMs: number) => {
        for (const line of lines) {
          await sleep(delayMs);
          pushLog(line);
        }
      };

      const isSocial = bounty.platform === "twitter";
      const isDiscord = bounty.platform === "discord";
      const isGovernance =
        bounty.platform === "on_chain" &&
        (bounty.requiredCapabilities.includes("governance") ||
          bounty.requiredCapabilities.includes("voting") ||
          bounty.title.toLowerCase().includes("governance") ||
          bounty.title.toLowerCase().includes("vote"));
      const isDexTask =
        bounty.platform === "on_chain" &&
        (bounty.requiredCapabilities.includes("defi_analytics") ||
          bounty.title.toLowerCase().includes("swap") ||
          bounty.title.toLowerCase().includes("liquidity") ||
          bounty.description.toLowerCase().includes("pool"));

      const executionLines = isDexTask
        ? [
            `[DEX] Accessing SaucerSwap router and pool registry...`,
            `[DEX] Fetching HBAR/USDC reserves via Mirror Node...`,
            `[DEX] Computing liquidity depth, price impact, and slippage bands...`,
            `[SIM] Simulating swap path and estimating gas (Hedera JSON-RPC)...`,
            `[RISK] Generating pool risk report: concentration, volatility, exit liquidity...`,
            `[ARTIFACT] Packaging report as UCP work artifact (JSON)`,
          ]
        : isGovernance
          ? [
              `[GOV] Accessing governance portal and proposal index...`,
              `[GOV] Loading latest HIP metadata and vote window...`,
              `[GOV] Evaluating DAO policy constraints and risk thresholds...`,
              `[EVM] Building vote transaction payload (EIP-712 style)`,
              `[EVM] Submitting vote tx (Hedera JSON-RPC) and waiting confirmation...`,
              `[VERIFY] Verifying vote receipt via Mirror Node...`,
            ]
          : isDiscord
            ? [
                `[DISCORD] Connecting to gateway and joining #general stream...`,
                `[DISCORD] Loading knowledge base and escalation policy...`,
                `[DISCORD] Detecting unanswered questions and drafting replies...`,
                `[DISCORD] Posting responses and marking tickets resolved...`,
                `[DISCORD] Handing off complex issues to human moderators...`,
              ]
            : isSocial
              ? [
                  `[SOCIAL] Accessing X/Twitter web endpoint and session profile...`,
                  `[SOCIAL] Following @Hedera and @OpenClaw (if not already)`,
                  `[SOCIAL] Drafting multi-tweet thread with product highlights...`,
                  `[SOCIAL] Posting thread, verifying mentions and links...`,
                  `[SOCIAL] Retweeting announcement and adding a short comment...`,
                  `[SOCIAL] Capturing post URLs for proof bundle...`,
                ]
              : [
                  `[EXEC] Running generic execution flow...`,
                  `[EXEC] Producing artifact bundle for verification...`,
                ];

      const steps = [
          {
            label: "Analyzing bounty requirements",
            status: "analyzing",
            lines: [
              `[Agent ${agentName}] Loading UCP task payload: ${bountyId}`,
              `[UCP] Parsing requirements: ${bounty.requiredCapabilities.join(", ") || "none"}`,
              `[UCP] Deadline check OK. Preparing execution plan.`,
              `[POLICY] Selecting strategy: ${isDexTask ? "DEX analysis" : isGovernance ? "governance vote" : isDiscord ? "discord moderation" : isSocial ? "social campaign" : "generic"}`,
            ],
          },
          {
            label: "Connecting to OpenClaw UCP Protocol",
            status: "connecting",
            lines: [
              `[NET] Resolving endpoints (HCS, Mirror Node, JSON-RPC)...`,
              `[AUTH] Loading agent identity: ${agentId}`,
              `[UCP] Opening execution session and reserving worker slot...`,
              `[UCP] Handshake complete. Session active.`,
            ],
          },
          {
            label: "Locking collateral for task execution",
            status: "collateral",
            lines: [
              `[ESCROW] Checking available balance for collateral...`,
              `[ESCROW] Locking collateral: ${collateralAmount} HBAR`,
              `[ESCROW] Collateral lock recorded (escrow ledger + attestation).`,
            ],
          },
          {
            label: "Executing task logic (off-chain compute)",
            status: "executing",
            lines: [
              `[EXEC] Starting task runner...`,
              ...executionLines,
              `[EXEC] Execution complete. Preparing verification bundle...`,
            ],
          },
          {
            label: "Submitting proof to Hedera Consensus Service",
            status: "attesting",
            lines: [
              `[HCS] Building structured attestation envelope...`,
              `[HCS] Submitting message batch to consensus topic...`,
              `[HCS] Waiting for sequence confirmation...`,
            ],
          },
      ] as const;

      setExecutionLogs((prev) => ({ ...prev, [bountyId]: [] }));
      pushLog(`[UCP] Accepted bounty "${bounty.title}" from ${bounty.issuer}`);

      for (const [index, step] of steps.entries()) {
          setBountyStages((prev) => ({ ...prev, [bountyId]: index + 1 }));
          await runLines(step.lines, 550);
          const res = await fetch("/api/bounties/attest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId,
              bountyId,
              step: step.label,
              status: step.status,
              collateral: step.status === "collateral" ? collateralAmount : undefined,
            }),
          });
          if (res.ok) {
            const data = await safeJson<{ topicId?: string; sequenceNumber?: string | number }>(res);
            if (data?.topicId && data.sequenceNumber !== null && data.sequenceNumber !== undefined) {
              pushLog(`[HCS] Attested ${step.status} on Topic ${data.topicId} #${data.sequenceNumber} • ${hashscanBase}/topic/${data.topicId}`);
            }
          }
          await sleep(450);
      }
  };

  const handleClaim = async (bountyId: string) => {
    setClaiming(bountyId);
    
    // Find bounty info
    const bounty = bounties.find(b => b.id === bountyId);
    let agent = agents.find(a => a.id === selectedAgent) ?? null;
    if (bounty && (autoAssign || !agent)) {
      agent = pickBestAgentForBounty(bounty);
      if (agent) setSelectedAgent(agent.id);
    }
    if (!agent) {
        alert("No compatible agent available.");
        setClaiming(null);
        return;
    }
    
    if (agent && bounty) {
        try {
            setBountyStages((prev) => ({ ...prev, [bountyId]: 1 }));
            setBounties((prev) =>
                prev.map((b) => b.id === bountyId ? { ...b, status: "in_progress" } : b)
            );
            // 1. Visual Simulation
            await simulateExecution({ bounty, agentId: agent.id, agentName: agent.name, collateralAmount: bounty.reward.amount });
            
            // 2. Real HCS Submission & Payment
            const res = await fetch("/api/bounties/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId: agent.id,
                    bountyId: bountyId,
                    reward: bounty.reward.amount,
                    details: `Completed ${bounty.title} for ${bounty.issuer}`
                })
            });
            
            const data = await safeJson<{
              success?: boolean;
              topicId?: string;
              sequenceNumber?: string;
              settlementSequence?: string | null;
              creditTokenId?: string | null;
              creditAmount?: number;
              creditTransferTx?: string | null;
              paymentTxId?: string | null;
              paymentStatus?: string | null;
              error?: string;
            }>(res);
            
            if (data?.success) {
                setBountyStages((prev) => ({ ...prev, [bountyId]: 5 }));
                setCompletedProofs(prev => ({
                    ...prev,
                    [bountyId]: {
                      topicId: data.topicId ?? "-",
                      seq: data.sequenceNumber ?? "-",
                      settlementSeq: data.settlementSequence ?? null,
                      tokenId: data.creditTokenId ?? null,
                      creditAmount: data.creditAmount ?? 0,
                      transferTx: data.creditTransferTx ?? null,
                      paymentTxId: data.paymentTxId ?? null,
                      paymentStatus: data.paymentStatus ?? null,
                    }
                }));

                setExecutionLogs(prev => ({
                    ...prev,
                    [bountyId]: [
                      ...(prev[bountyId] || []),
                      `[SUCCESS] Verified on Hedera Topic ${data.topicId ?? "-"} #${data.sequenceNumber ?? "-"}`,
                      `[SETTLEMENT] ${data.creditAmount ?? 0} CLAW credits on Topic ${data.topicId ?? "-"} #${data.settlementSequence ?? "-"}`,
                      ...(data.creditTokenId ? [`[HTS] Token ${data.creditTokenId} • ${hashscanBase}/token/${data.creditTokenId}`] : []),
                      ...(data.creditTransferTx ? [`[HTS] Credit transfer • ${hashscanBase}/transaction/${encodeURIComponent(data.creditTransferTx)}`] : []),
                      `[PAYMENT] Paid ${bounty.reward.amount} HBAR • Tx ${data.paymentTxId ?? "-"}${data.paymentTxId ? ` • ${hashscanBase}/transaction/${encodeURIComponent(data.paymentTxId)}` : ""}`,
                    ]
                }));
                
                // Update local bounty status
                setBounties((prev) => 
                    prev.map((b) => b.id === bountyId ? { ...b, status: "paid" } : b)
                );
                try {
                  const raw = localStorage.getItem(bountyStatusStorageKey);
                  const map = (raw ? (JSON.parse(raw) as Record<string, OpenClawBounty["status"]>) : {}) ?? {};
                  map[bountyId] = "paid";
                  localStorage.setItem(bountyStatusStorageKey, JSON.stringify(map));
                } catch {}
            } else {
                throw new Error(data?.error || "Verification failed");
            }

        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : "Unknown error";
            setExecutionLogs(prev => ({
                ...prev,
                [bountyId]: [...(prev[bountyId] || []), `[ERROR] ${message}`]
            }));
        } finally {
            setClaiming(null);
        }
    }
  };

  const activeBounty = bounties.find((b) => (bountyStages[b.id] ?? 0) > 0);
  const activeStage = activeBounty ? bountyStages[activeBounty.id] ?? 0 : 0;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">OpenClaw Bounties</h1>
          <p className="mt-2 text-sm text-slate-400">
            Available tasks from the Universal Compute Protocol (UCP) network.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
          </span>
          Network Live
        </div>
      </div>

      {!isConnected && (
         <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
            ⚠️ Connect wallet to view exclusive bounties.
         </div>
      )}

      {/* Agent Selector */}
      <div className="mb-8 rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-400">Assign Agent for Execution:</label>
            <button
              onClick={() => setAutoAssign((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                autoAssign ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {autoAssign ? "Auto Assign: On" : "Auto Assign: Off"}
            </button>
          </div>
          {loading ? (
              <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-800"></div>
          ) : (
              <select 
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={autoAssign}
                className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none disabled:opacity-60"
              >
                  {agents.length === 0 && <option value="">No agents found (Rent one first)</option>}
                  {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role}) • Trust {agent.reputation}
                      </option>
                  ))}
              </select>
          )}
          {selectedAgent && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                Trust Score: {agents.find((a) => a.id === selectedAgent)?.reputation ?? 0}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                Agent-first execution
              </span>
            </div>
          )}
          {agents.length === 0 && !loading && (
              <div className="mt-2 text-sm text-slate-500">
                  <Link href="/marketplace" className="text-cyan-400 hover:underline">Go to Marketplace</Link> to rent an autonomous agent.
              </div>
          )}
      </div>

      <div className="mb-8 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Agent Flow Observer</h3>
          <span className="text-xs text-slate-500">
            {activeBounty ? `Tracking ${activeBounty.title}` : "No active bounty"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-[10px] text-slate-400">
          {["Open", "In Progress", "Submitted", "Verified", "Paid"].map((label, idx) => (
            <div
              key={label}
              className={`rounded-md border px-2 py-1 text-center ${
                activeStage >= idx + 1 ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5"></div>
            ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((bounty) => {
            const required = bounty.requiredCapabilities ?? [];
            const selected = agents.find((a) => a.id === selectedAgent) ?? null;
            const best = pickBestAgentForBounty(bounty);
            const displayAgent = autoAssign ? best : selected;
            const owned = getOpenClawCapabilities(displayAgent);
            const matched = required.filter((cap) => owned.includes(cap));
            const matchScore = required.length === 0 ? 100 : Math.round((matched.length / required.length) * 100);
            const missing = required.filter((cap) => !owned.includes(cap));
            const progress = bountyStages[bounty.id] ?? (bounty.status === "completed" ? 5 : bounty.status === "in_progress" ? 2 : 0);
            const deadline = new Date(bounty.deadline);
            const isExpired = deadline.getTime() < Date.now() && bounty.status === "open";
            const effectiveStatus = isExpired ? "expired" : bounty.status;
            const canClaim =
              bounty.status === "open" &&
              !isExpired &&
              (autoAssign ? (best?.match ?? 0) === 100 : missing.length === 0);
            const rankedAgents = rankAgentsForRequirements(required).slice(0, 2);
            return (
            <div 
                key={bounty.id} 
                className={`group relative overflow-hidden rounded-2xl border bg-slate-900/60 p-6 transition hover:border-cyan-500/50 hover:bg-slate-900/80 ${
                    effectiveStatus === "open" ? "border-white/10" : "border-white/5 opacity-75"
                }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 capitalize">
                    {bounty.platform.replace("_", " ")}
                </div>
                <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    effectiveStatus === "open" ? "bg-emerald-500/20 text-emerald-400" : effectiveStatus === "expired" ? "bg-rose-500/20 text-rose-300" : "bg-slate-700 text-slate-400"
                }`}>
                    {effectiveStatus.replace("_", " ")}
                </div>
              </div>

              <h3 className="mb-2 text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                {bounty.title}
              </h3>
              <p className="mb-2 text-xs text-slate-500">
                Issuer: <span className="text-slate-300">{bounty.issuer}</span>
              </p>
              <p className="mb-2 text-xs text-slate-500">
                Deadline: <span className={isExpired ? "text-rose-300" : "text-slate-300"}>{deadline.toLocaleString()}</span>
              </p>
              <p className="mb-4 text-sm text-slate-400 line-clamp-3">
                {bounty.description}
              </p>

              <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                <span>Capability Match</span>
                <span className={`${matchScore >= 70 ? "text-emerald-300" : matchScore >= 40 ? "text-amber-300" : "text-rose-300"}`}>
                  {matchScore}%
                </span>
              </div>

              {rankedAgents.length > 0 && (
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-slate-300">
                  <div className="mb-2 text-slate-400">Recommended agents</div>
                  {rankedAgents.map((a) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span>{a.name}</span>
                      <span className="text-cyan-300">{a.match}% • Trust {a.reputation}</span>
                    </div>
                  ))}
                  {rankedAgents[0] && (
                    <button
                      onClick={() => setSelectedAgent(rankedAgents[0].id)}
                      className="mt-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-400/20"
                    >
                      Use Recommended
                    </button>
                  )}
                  {autoAssign && best && (
                    <div className="mt-2 text-[10px] text-emerald-300">
                      Auto-assigned: {best.name} ({best.match}%)
                    </div>
                  )}
                </div>
              )}

              {missing.length > 0 && (
                <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300">
                  Missing: {missing.map((m) => m.replace("_", " ")).join(", ")}
                </div>
              )}

              <div className="mb-4 grid grid-cols-5 gap-2 text-[10px] text-slate-400">
                {["Open", "In Progress", "Submitted", "Verified", "Paid"].map((label, idx) => (
                  <div
                    key={label}
                    className={`rounded-md border px-2 py-1 text-center ${
                      progress >= idx + 1 ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/10 bg-white/5"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Execution Logs Area */}
              {executionLogs[bounty.id] && executionLogs[bounty.id].length > 0 && (
                  <div className="mb-4 rounded-lg bg-black/50 p-3 font-mono text-[10px] text-green-400 border border-green-500/20 h-32 overflow-y-auto">
                      {executionLogs[bounty.id].map((log, idx) => (
                          <div key={idx} className="mb-1">
                            {log.includes("http") ? (
                              <a
                                href={log.slice(log.indexOf("http")).trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {log}
                              </a>
                            ) : (
                              log
                            )}
                          </div>
                      ))}
                      {executionLogs[bounty.id].length < 6 && (
                          <div className="animate-pulse">_</div>
                      )}
                  </div>
              )}

              {/* Proof Link */}
              {completedProofs[bounty.id] && (
                  <div className="mb-4 rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/30">
                      <div className="text-xs text-emerald-400 font-bold mb-1">✓ Verified Proof of Work</div>
                      <a 
                        href={`${hashscanBase}/topic/${completedProofs[bounty.id].topicId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-300 hover:underline break-all"
                      >
                          Topic {completedProofs[bounty.id].topicId} Sequence #{completedProofs[bounty.id].seq}
                      </a>
                      {completedProofs[bounty.id].settlementSeq && (
                        <div className="mt-2 text-[10px] text-emerald-300">
                          Settlement: #{completedProofs[bounty.id].settlementSeq} •{" "}
                          <a
                            href={`${hashscanBase}/token/${completedProofs[bounty.id].tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            Token {completedProofs[bounty.id].tokenId}
                          </a>{" "}
                          • {completedProofs[bounty.id].creditAmount} CLAW
                        </div>
                      )}
                      {completedProofs[bounty.id].transferTx && (
                        <a
                          href={`${hashscanBase}/transaction/${encodeURIComponent(completedProofs[bounty.id].transferTx)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-[10px] text-emerald-300 hover:underline break-all"
                        >
                          HTS Transfer Tx: {completedProofs[bounty.id].transferTx}
                        </a>
                      )}
                      {completedProofs[bounty.id].paymentTxId && (
                        <a
                          href={`${hashscanBase}/transaction/${encodeURIComponent(completedProofs[bounty.id].paymentTxId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-[10px] text-emerald-300 hover:underline break-all"
                        >
                          Payment Tx: {completedProofs[bounty.id].paymentTxId} ({completedProofs[bounty.id].paymentStatus ?? "UNKNOWN"})
                        </a>
                      )}
                  </div>
              )}

              <div className="mb-6 flex flex-wrap gap-2">
                {bounty.requiredCapabilities.map((cap) => (
                    <span key={cap} className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[10px] text-slate-500">
                        {cap.replace("_", " ")}
                    </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                    <div className="text-xs text-slate-500">Reward</div>
                    <div className="text-lg font-bold text-white">
                        {bounty.reward.amount} <span className="text-sm font-medium text-cyan-400">{bounty.reward.token}</span>
                    </div>
                </div>
                
                {effectiveStatus === "open" ? (
                    <button
                        onClick={() => handleClaim(bounty.id)}
                        disabled={claiming === bounty.id || !selectedAgent || !canClaim}
                        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {!canClaim ? "Not Compatible" : (claiming === bounty.id ? "Executing..." : "Claim")}
                    </button>
                ) : (
                    <button disabled className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed">
                        {effectiveStatus === "in_progress" ? "In Progress" : effectiveStatus === "expired" ? "Expired" : effectiveStatus === "paid" ? "Paid" : "Completed"}
                    </button>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
