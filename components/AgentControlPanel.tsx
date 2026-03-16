"use client";

import { useState, useEffect, useRef } from "react";
import type { Agent } from "@/types/agent";
import PaymentTaskPanel from "./PaymentTaskPanel";
import TokenCreatorPanel from "./TokenCreatorPanel";
import TopUpModal from "./TopUpModal";

type Log = {
  id: string;
  level: string;
  title: string;
  message: string;
  createdAt: string | Date;
  data?: string | null;
};

export default function AgentControlPanel({ agent, initialLogs }: { agent: Agent; initialLogs: Log[] }) {
  const [status, setStatus] = useState(agent.operationalStatus);
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial client-side time to prevent hydration mismatch
    setLastUpdate(new Date().toLocaleTimeString());
  }, []);

  const toggleStatus = async (newStatus: "active" | "paused" | "stopped") => {
    try {
      await fetch(`/api/agents/${agent.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const clearLogs = async () => {
    // Optimistic UI update
    setLogs([]);
    
    // Call API to delete logs from DB
    try {
        await fetch(`/api/agents/${agent.id}/logs`, {
            method: "DELETE",
        });
    } catch (e) {
        console.error("Failed to clear logs on server", e);
        // If fail, maybe refresh?
        fetchLogs();
    }
  };

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/logs`);
      const data = await res.json();
      setLogs(data.logs);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
        console.error(e);
    } finally {
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [agent.id]);

  const formatData = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      const obj = JSON.parse(jsonString);
      if (obj.count !== undefined) {
        return `Processed: ${obj.count} | Failed: ${obj.failed}`;
      }
      return jsonString.length > 50 ? jsonString.substring(0, 50) + "..." : jsonString;
    } catch {
      return jsonString;
    }
  };

  const orderedLogs = [...logs].sort((a, b) => {
    const aPinned = a.title === "AI Operation Cycle" ? 1 : 0;
    const bPinned = b.title === "AI Operation Cycle" ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const expiryText = agent.expiresAt ? new Date(agent.expiresAt).toLocaleString() : "No expiry";

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Balance & TopUp */}
      <div className="flex justify-between items-center rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center gap-4">
              <span className={`h-3 w-3 rounded-full ${status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
              <div>
                  <div className="text-sm font-semibold text-white">Agent Status</div>
                  <div className="text-xs text-slate-400 capitalize">{status}</div>
                  <div className="text-[10px] text-slate-500">Expires: {expiryText}</div>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-right">
                  <div className="text-xs text-slate-400">Wallet Balance</div>
                  <div className="text-lg font-bold text-white">{agent.balance.toFixed(2)} HBAR</div>
              </div>
              <button
                  onClick={() => setShowTopUp(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-400 transition"
                  title="Top Up Wallet"
              >
                  +
              </button>
          </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
      {/* Controls Column */}
      <div className="space-y-6">
        {/* Render Task Panel for Payment Operator instead of generic controls */}
        {agent.role === 'payment_operator' ? (
            <PaymentTaskPanel agentId={agent.id} />
        ) : agent.role === 'token_creator' ? (
            <TokenCreatorPanel agentId={agent.id} />
        ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Operational Control</h3>
            <div className="flex flex-col gap-3">
                <button
                onClick={() => toggleStatus("active")}
                disabled={status === "active"}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${
                    status === "active"
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
                >
                <span className="h-2 w-2 rounded-full bg-current" />
                Start / Resume
                </button>
                <button
                onClick={() => toggleStatus("paused")}
                disabled={status === "paused"}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${
                    status === "paused"
                    ? "bg-amber-500/20 text-amber-400 cursor-default"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                >
                <span className="h-2 w-2 rounded-full bg-current" />
                Pause Operations
                </button>
                <button
                onClick={() => toggleStatus("stopped")}
                disabled={status === "stopped"}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${
                    status === "stopped"
                    ? "bg-rose-500/20 text-rose-400 cursor-default"
                    : "bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400"
                }`}
                >
                <span className="h-2 w-2 rounded-full bg-current" />
                Stop Agent
                </button>
            </div>
            
            <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Status</span>
                <span className={`uppercase font-bold ${
                    status === "active" ? "text-emerald-400" : 
                    status === "paused" ? "text-amber-400" : "text-rose-400"
                }`}>{status}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-400">Strategy</span>
                <span className="text-white">{agent.strategy}</span>
                </div>
            </div>
            </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">AI Capabilities</h3>
            <div className="flex flex-wrap gap-2">
                {agent.permissions.map((cap) => (
                    <span key={cap} className="rounded-md bg-cyan-950/30 border border-cyan-500/20 px-2 py-1 text-xs text-cyan-200">
                        {cap}
                    </span>
                ))}
            </div>
        </div>
      </div>

      {/* Logs Column (Global logs for non-payment agents, or general system logs) */}
      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-950 p-0 overflow-hidden flex flex-col h-[600px]">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 px-6 py-4">
           <h3 className="font-mono text-sm font-semibold text-slate-300">
               {agent.role === 'payment_operator' ? "System Activity Feed" : "Live Execution Terminal"}
           </h3>
           <div className="flex items-center gap-3">
               <button onClick={clearLogs} className="text-xs text-slate-500 hover:text-white transition">Clear Logs</button>
               {status === "active" && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
               <span className="text-xs text-slate-500 font-mono">
                   {isRefreshing ? "Scanning..." : (lastUpdate ? `Idle (Last: ${lastUpdate})` : "Idle")}
               </span>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs" ref={logContainerRef}>
            {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                    <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full"></div>
                    <div>Waiting for tasks...</div>
                </div>
            ) : (
                <>
                    {orderedLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-slate-600 shrink-0">
                                {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                            <div className="flex-1">
                                <span className={`font-bold mr-2 ${
                                    log.level === "info" ? "text-blue-400" :
                                    log.level === "success" ? "text-emerald-400" :
                                    log.level === "warn" ? "text-amber-400" :
                                    "text-rose-400"
                                }`}>
                                    [{log.level.toUpperCase()}]
                                </span>
                                <span className="text-slate-300 font-semibold">{log.title}: </span>
                                <span className="text-slate-400">{log.message}</span>
                                {log.data && (
                                    <span className="ml-2 text-[10px] text-slate-500 italic">
                                        {formatData(log.data)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Visual indicator at bottom of logs to show system is alive */}
                    <div className="border-t border-white/5 pt-2 mt-2 text-slate-700 italic flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-700 animate-pulse"></span>
                        System monitoring active...
                    </div>
                </>
            )}
        </div>
      </div>
      
      {showTopUp && <TopUpModal agent={agent} onClose={() => setShowTopUp(false)} />}
      </div>
    </div>
  );
}
