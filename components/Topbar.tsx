"use client";

import { useWallet } from "@/lib/hashconnect";
import { useEffect, useState } from "react";

type WithdrawResult = {
  agent: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  txId?: string;
  error?: string;
  chainBalance?: string;
};

type WithdrawResponse = {
  totalWithdrawn: number;
  results: WithdrawResult[];
};

type AgentOption = {
  id: string;
  name: string;
  balance: number;
};

export default function Topbar() {
  const { isConnected, accountId, disconnect } = useWallet();
  const [totalHbar, setTotalHbar] = useState<number | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<string | null>(null);
  const [withdrawResultData, setWithdrawResultData] = useState<WithdrawResponse | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  const fetchTreasury = async () => {
    try {
      const res = await fetch("/api/treasury/status");
      if (res.ok) {
        const data = await res.json();
        const hbarAsset = data.cfo?.totalBalanceHbar ?? 0;
        setTotalHbar(hbarAsset);
        
        if (data.cfo?.wallets) {
             setAvailableAgents(data.cfo.wallets.map((w: { agentId: string; name: string; balanceHbar: number }) => ({
                 id: w.agentId,
                 name: w.name,
                 balance: w.balanceHbar
             })));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleWithdraw = async () => {
    if (!accountId) return;
    setWithdrawing(true);
    setWithdrawResult(null);
    setWithdrawResultData(null);

    const amount = withdrawAmount ? parseFloat(withdrawAmount) : undefined;
    const agentIds = selectedAgents.size > 0 ? Array.from(selectedAgents) : undefined;

    try {
        const res = await fetch("/api/treasury/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetAddress: accountId, amount, agentIds })
        });

        const json = await res.json();
        if (json.success) {
            if (json.totalWithdrawn > 0) {
                setWithdrawResult(`Success! Withdrawn ${json.totalWithdrawn} HBAR from agents.`);
            } else {
                setWithdrawResult("Gagal: saldo on-chain tidak cukup untuk withdraw.");
            }
            setWithdrawResultData(json);
            fetchTreasury();
            setWithdrawAmount("");
        } else {
            setWithdrawResult(`Failed: ${json.error}`);
        }
    } catch (e) {
        console.error(e);
        setWithdrawResult("Withdrawal failed due to network error.");
    } finally {
        setWithdrawing(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-8 py-5 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-white">Command Center</h2>
          <p className="text-sm text-slate-400">
            Coordinate autonomous agents and economy flows
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Network: Hedera Testnet
          </div>
          {isConnected ? (
             <div className="flex items-center gap-2">
               {/* Treasury Balance Display */}
               {totalHbar !== null && (
                   <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs">
                       <span className="text-slate-400">Treasury:</span>
                       <span className="font-bold text-white">{totalHbar.toLocaleString()} HBAR</span>
                       <button 
                          onClick={() => setShowWithdrawModal(true)}
                          className="ml-1 rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/30 transition"
                       >
                          WITHDRAW
                       </button>
                   </div>
               )}

               <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  {accountId}
               </div>
               <button 
                  onClick={disconnect}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 transition"
               >
                  Disconnect
               </button>
             </div>
          ) : (
             <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
               Wallet: Not Connected
             </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white">Withdraw Treasury Funds</h3>
                  <p className="mt-2 text-sm text-slate-400">
                      This will sweep all available HBAR from all agents to your connected wallet ({accountId}).
                  </p>
                  <div className="mt-4 rounded-lg bg-slate-950 p-4 border border-white/5">
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Available Total</span>
                          <span className="font-bold text-white">~{totalHbar ? (totalHbar * 0.95).toFixed(0) : 0} HBAR</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                          (Leaving small amount for gas fees per agent)
                      </div>
                  </div>

                  {/* Agent Selector */}
                  <div className="mt-4">
                      <label className="text-sm font-medium text-slate-300">Select Agents (Optional)</label>
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-2 space-y-1">
                          {availableAgents.length === 0 ? (
                              <div className="text-xs text-slate-500 p-2">No agents available</div>
                          ) : availableAgents.map(agent => (
                              <label key={agent.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                                  <input 
                                      type="checkbox"
                                      className="rounded border-white/20 bg-slate-900"
                                      checked={selectedAgents.has(agent.id)}
                                      onChange={(e) => {
                                          const newSet = new Set(selectedAgents);
                                          if (e.target.checked) newSet.add(agent.id);
                                          else newSet.delete(agent.id);
                                          setSelectedAgents(newSet);
                                      }}
                                  />
                                  <div className="flex-1 flex justify-between text-xs">
                                      <span className="text-slate-300">{agent.name}</span>
                                      <span className={`font-mono ${agent.balance > 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                          {agent.balance.toFixed(2)} HBAR
                                      </span>
                                  </div>
                              </label>
                          ))}
                      </div>
                      <div className="mt-1 flex justify-end">
                          <button 
                              onClick={() => {
                                  if (selectedAgents.size === availableAgents.length) setSelectedAgents(new Set());
                                  else setSelectedAgents(new Set(availableAgents.map(a => a.id)));
                              }}
                              className="text-[10px] text-cyan-400 hover:underline"
                          >
                              {selectedAgents.size === availableAgents.length ? "Deselect All" : "Select All"}
                          </button>
                      </div>
                  </div>

                  <div className="mt-2">
                      <label className="text-sm font-medium text-slate-300">Amount to Withdraw (Optional)</label>
                      <input
                          type="number"
                          placeholder="Enter amount (leave empty for max)"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                      />
                  </div>

                  {withdrawResult && (
                      <div className={`mt-4 rounded-lg p-3 text-sm ${withdrawResult.includes("Success") ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          <div className="font-bold mb-1">{withdrawResult}</div>
                          {withdrawResultData && (
                              <div className="space-y-1 mt-2 max-h-60 overflow-y-auto">
                                  {withdrawResultData.results.map((r, idx) => (
                                      <div key={idx} className={`flex justify-between text-xs border-b border-white/5 pb-1 last:border-0 ${r.status === "SUCCESS" ? "text-slate-300" : "text-rose-400"}`}>
                                          <div className="flex flex-col">
                                            <span>{r.agent}</span>
                                            {r.error && <span className="text-[10px] opacity-70">{r.error}</span>}
                                          </div>
                                          <div className="text-right">
                                              <span className="block font-mono">{r.amount} HBAR</span>
                                              {r.chainBalance && (
                                                <span className="block text-[10px] text-slate-500">Chain: {r.chainBalance} HBAR</span>
                                              )}
                                              {r.txId && (
                                                  <a 
                                                      href={`https://hashscan.io/testnet/transaction/${r.txId}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-[10px] text-cyan-400 hover:underline"
                                                  >
                                                      View TX ↗
                                                  </a>
                                              )}
                                              {!r.txId && r.status === "SUCCESS" && (
                                                <span className="text-[10px] text-emerald-400">Processed</span>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                      <button
                          onClick={() => {
                              setShowWithdrawModal(false);
                              setWithdrawResult(null);
                              setWithdrawResultData(null);
                          }}
                          disabled={withdrawing}
                          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
                      >
                          Close
                      </button>
                      {!withdrawResultData && (
                          <button
                              onClick={handleWithdraw}
                              disabled={withdrawing}
                              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2"
                          >
                              {withdrawing ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                    Withdrawing...
                                  </>
                              ) : (
                                  "Confirm Withdraw"
                              )}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </>
  );
}
