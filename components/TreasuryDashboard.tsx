"use client";

import { useCallback, useEffect, useState } from "react";
import type { TreasuryCfoSnapshot, TreasuryStatus } from "@/services/treasuryEngine";

interface TreasuryDashboardProps {
  initialData: TreasuryStatus;
  agentId: string;
}

export default function TreasuryDashboard({ initialData, agentId }: TreasuryDashboardProps) {
  const [data, setData] = useState(initialData);
  const [rebalancing, setRebalancing] = useState(false);
  const [cfo, setCfo] = useState<TreasuryCfoSnapshot | null>(null);
  const [proposing, setProposing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const fetchCfo = useCallback(async () => {
    try {
      const res = await fetch("/api/treasury/status");
      if (!res.ok) return;
      const json = await res.json();
      if (json?.cfo) setCfo(json.cfo as TreasuryCfoSnapshot);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => {
      void fetchCfo();
    }, 0);
    const t = setInterval(() => void fetchCfo(), 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [fetchCfo, agentId]);

  const generateProposal = async () => {
    setProposing(true);
    try {
      const res = await fetch("/api/treasury/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate proposal");
      alert("Budget proposal generated and logged.");
      await fetchCfo();
    } catch (error) {
      console.error(error);
      alert("Failed to generate budget proposal.");
    } finally {
      setProposing(false);
    }
  };

  const handleRebalance = async () => {
    setRebalancing(true);
    try {
      const res = await fetch("/api/treasury/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      
      if (!res.ok) throw new Error("Rebalance failed");
      const json = await res.json();

      if (json.updatedTreasury) {
        setData(json.updatedTreasury as TreasuryStatus);
      }

      if (json.success) {
        alert("Rebalancing executed successfully!");
      } else {
        alert("Rebalancing skipped: insufficient HBAR.");
      }
      await fetchCfo();
      
    } catch (error) {
      console.error(error);
      alert("Failed to execute rebalance.");
    } finally {
      setRebalancing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-white">Treasury Monitoring (CFO AI)</h3>
            <div className="mt-1 text-sm text-slate-400">
              Live monitoring across all operator wallets
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {mounted ? new Date().toLocaleString() : "Loading..."}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Treasury Health</div>
            <div className={`mt-2 text-2xl font-bold ${cfo?.health === "ALERT" ? "text-rose-400" : "text-emerald-400"}`}>
              {cfo?.health ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Balance</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {(cfo?.totalBalanceHbar ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HBAR
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Wallets: {cfo?.walletCount ?? 0}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Daily Spend</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {(cfo?.dailySpendHbar ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HBAR
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Last 24h (completed payments)
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Runway Prediction</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {cfo?.runwayMonths !== null && cfo?.runwayMonths !== undefined ? `${cfo.runwayMonths} months` : "N/A"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {cfo?.runwayDays !== null && cfo?.runwayDays !== undefined ? `${cfo.runwayDays} days remaining` : "Based on current spending"}
            </div>
          </div>
        </div>

        {cfo && cfo.anomalies.length > 0 && (
          <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="text-sm font-bold text-rose-300">⚠ Unusual spending detected</div>
            <div className="mt-3 space-y-2 text-sm">
              {cfo.anomalies.slice(0, 3).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <div className="text-slate-200">
                    <span className="font-bold">{a.amountHbar.toFixed(2)} HBAR</span> to <span className="font-mono text-slate-300">{a.recipient}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Source: {a.sourceAgentName ?? "unknown"} • {new Date(a.detectedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="text-sm font-medium text-slate-400">Total Treasury Value</div>
          <div className="mt-2 text-3xl font-bold text-white">
            ${data.totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-emerald-400">
            +2.4% vs last week (Simulated)
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="text-sm font-medium text-slate-400">Active Strategy</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm font-bold text-cyan-400">
              Balanced Growth
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Target: 40% HBAR / 40% Stable / 20% Risk
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="text-sm font-medium text-slate-400">Health Status</div>
          {data.alerts.length > 0 ? (
            <div className="mt-2 text-rose-400 font-bold flex items-center gap-2">
              ⚠️ Attention Needed
            </div>
          ) : (
            <div className="mt-2 text-emerald-400 font-bold flex items-center gap-2">
              ✅ Healthy
            </div>
          )}
          <div className="mt-2 text-xs text-slate-500">
            {data.recommendations.length} optimization suggestions
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Asset Allocation</h3>
          <div className="space-y-4">
            {data.assets.map((asset) => (
              <div key={asset.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-xs
                    ${asset.symbol === 'HBAR' ? 'bg-black text-white border border-white/20' : 
                      asset.symbol === 'USDC' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}
                  >
                    {asset.symbol[0]}
                  </div>
                  <div>
                    <div className="font-bold text-white">{asset.name}</div>
                    <div className="text-xs text-slate-400">{asset.amount.toLocaleString("en-US")} {asset.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">${asset.valueUsd.toLocaleString("en-US")}</div>
                  <div className={`text-xs font-medium ${
                      Math.abs(asset.allocation - asset.targetAllocation) > 5 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {asset.allocation.toFixed(1)}% (Target: {asset.targetAllocation}%)
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Area */}
          <div className="mt-6 border-t border-white/10 pt-6">
             {data.recommendations.length > 0 && (
                 <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200 border border-amber-500/20">
                     💡 <strong>Suggestion:</strong> {data.recommendations[0]}
                 </div>
             )}
             
             <button
                onClick={handleRebalance}
                disabled={rebalancing}
                className="w-full rounded-xl bg-cyan-500 py-3 font-bold text-white transition hover:bg-cyan-400 disabled:opacity-50"
             >
                 {rebalancing ? "Executing Swaps on SaucerSwap..." : "Execute Rebalancing Strategy"}
             </button>
             <p className="mt-2 text-center text-[10px] text-slate-500">
                 *Simulates DEX interactions via Hedera Smart Contract Service
             </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="mb-4 text-lg font-bold text-white">Treasury Logs</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {data.recentActivity.length === 0 && (
                <div className="text-sm text-slate-500">No recent activity.</div>
            )}
            {data.recentActivity.map((log, idx) => (
              <div key={idx} className="relative pl-4 border-l border-white/10 pb-4 last:pb-0">
                <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-slate-700 border border-slate-900"></div>
                <div className="text-xs text-slate-400 mb-1">
                    {mounted ? new Date(log.timestamp).toLocaleString() : ""}
                </div>
                <div className="text-sm font-bold text-white">{log.action}</div>
                <div className="text-xs text-slate-500 mt-1">{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-bold text-white">DAO Treasury Mode</h3>
          <button
            onClick={generateProposal}
            disabled={proposing}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {proposing ? "Generating..." : "Generate Budget Proposal"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Operations</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {cfo?.allocationSuggestion.operations ?? 40}%
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Liquidity</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {cfo?.allocationSuggestion.liquidity ?? 35}%
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="text-sm font-medium text-slate-400">Reserve</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {cfo?.allocationSuggestion.reserve ?? 25}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
