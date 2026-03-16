"use client";

import { useState, useEffect } from "react";

type OperationsHealth = {
  started: boolean;
  lastTickAt: string | null;
  lastOperationAt: string | null;
  decisionCycles: number;
  activeOperators: number | null;
  runningServices: string[];
};

type OpsTrace = {
  timestamp: string;
  treasury?: { health?: string; totalBalanceHbar?: number; dailySpendHbar?: number };
  risk?: { risksFound: number; blockedCount: number };
  market?: { sentiment: string; confidence: number; alpha: string };
  payment?: { executed: number; failed: number };
  hcs?: { status: string; sequence?: string };
};

export default function OperationsControls() {
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [trace, setTrace] = useState<OpsTrace | null>(null);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/operations/status");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (error) {
      console.error("Failed to fetch operations health", error);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrace = async () => {
    try {
      const res = await fetch("/api/ops/trace");
      if (res.ok) {
        const data = await res.json();
        setTrace(data.trace ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch ops trace", error);
    }
  };

  useEffect(() => {
    fetchTrace();
    const interval = setInterval(fetchTrace, 7000);
    return () => clearInterval(interval);
  }, []);

  const forceSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/operations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycles: 1 }),
      });
      await fetchHealth();
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Force sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!health) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-5 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-64 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              System Operational
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>Active Agents: <span className="text-slate-200">{health.activeOperators ?? "Auto-detecting..."}</span></span>
            <span>•</span>
            <span>Cycles: <span className="text-slate-200">{health.decisionCycles}</span></span>
            <span>•</span>
            <span>Last Tick: <span className="text-slate-200">{health.lastTickAt ? new Date(health.lastTickAt).toLocaleTimeString() : "Waiting..."}</span></span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-slate-500">
              Synced: {lastSync}
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              setIsRunningDemo(true);
              await fetch("/api/ops/full-cycle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              await fetchTrace();
              await fetchHealth();
              setLastSync(new Date().toLocaleTimeString());
              setIsRunningDemo(false);
            }}
            disabled={isRunningDemo}
            className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunningDemo ? "Running Demo..." : "Run Full Demo"}
          </button>
          <button
            type="button"
            onClick={forceSync}
            disabled={isSyncing}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? "Syncing..." : "Force Sync"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">AI Decision Trace</h4>
          <span className="text-xs text-slate-500">
            {trace?.timestamp ? new Date(trace.timestamp).toLocaleTimeString() : "No trace yet"}
          </span>
        </div>
        {!trace ? (
          <div className="mt-3 text-xs text-slate-500">Run Full Demo to generate trace.</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs text-slate-300">
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
              <div className="text-slate-400">Treasury</div>
              <div className="mt-1">Health: {trace.treasury?.health ?? "N/A"}</div>
              <div>Total: {trace.treasury?.totalBalanceHbar?.toFixed?.(2) ?? "N/A"} HBAR</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
              <div className="text-slate-400">Risk</div>
              <div className="mt-1">Risks: {trace.risk?.risksFound ?? 0}</div>
              <div>Blocked: {trace.risk?.blockedCount ?? 0}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
              <div className="text-slate-400">Market</div>
              <div className="mt-1">Sentiment: {trace.market?.sentiment ?? "N/A"}</div>
              <div>Confidence: {trace.market?.confidence ?? 0}%</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
              <div className="text-slate-400">Payment</div>
              <div className="mt-1">Executed: {trace.payment?.executed ?? 0}</div>
              <div>Failed: {trace.payment?.failed ?? 0}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3 md:col-span-2">
              <div className="text-slate-400">Alpha Insight</div>
              <div className="mt-1">{trace.market?.alpha ?? "N/A"}</div>
              <div className="mt-2 text-[10px] text-slate-500">HCS: {trace.hcs?.status ?? "N/A"} {trace.hcs?.sequence ? `• ${trace.hcs.sequence}` : ""}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
