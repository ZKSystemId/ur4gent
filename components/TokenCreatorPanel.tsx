"use client";

import { useEffect, useState } from "react";

type TokenLaunch = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  treasuryAccount?: string | null;
  status: string;
  tokenId?: string | null;
  txId?: string | null;
  error?: string | null;
  createdAt: string;
};

type Log = {
  id: string;
  level: string;
  title: string;
  message: string;
  createdAt: string | Date;
  data?: string | null;
  tokenLaunchId?: string | null;
};

export default function TokenCreatorPanel({ agentId }: { agentId: string }) {
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, Log[]>>({});
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: 8,
    initialSupply: 1000000,
    treasuryAccount: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/agents/${agentId}/token-launches`);
    if (res.ok) {
        const data = await res.json();
        setLaunches(data.launches);
    }
  };

  const loadLogs = async (launchId: string) => {
    const res = await fetch(`/api/agents/${agentId}/logs`);
    if (res.ok) {
        const data = await res.json();
        const allLogs = Array.isArray(data?.logs) ? (data.logs as Log[]) : [];
        const taskLogs = allLogs.filter((l) => l.tokenLaunchId === launchId);
        setLogs((prev) => ({ ...prev, [launchId]: taskLogs }));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [agentId]);

  useEffect(() => {
    if (expandedId) {
        loadLogs(expandedId);
        const t = setInterval(() => loadLogs(expandedId), 3000);
        return () => clearInterval(t);
    }
  }, [expandedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`/api/agents/${agentId}/token-launches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setFormData({ name: "", symbol: "", decimals: 8, initialSupply: 1000000, treasuryAccount: "" });
      await load();
      setIsExecuting(true);
      await fetch(`/api/agents/${agentId}/token-launches/execute`, {
        method: "POST",
      });
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Token Form */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Mint New Token</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Token Name</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. My Token"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Symbol</label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.symbol}
              onChange={e => setFormData({...formData, symbol: e.target.value})}
              placeholder="e.g. MYT"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Decimals</label>
            <input
              type="number"
              required
              min="0"
              max="18"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.decimals}
              onChange={e => setFormData({...formData, decimals: parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Initial Supply</label>
            <input
              type="number"
              required
              min="1"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.initialSupply}
              onChange={e => setFormData({...formData, initialSupply: parseInt(e.target.value)})}
            />
          </div>
           <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-400">Treasury Account (Optional)</label>
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              value={formData.treasuryAccount}
              onChange={e => setFormData({...formData, treasuryAccount: e.target.value})}
              placeholder="0.0.xxxxx (Leave empty to use Agent's wallet)"
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || isExecuting}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? "Initiating Launch..." : "Launch Token"}
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={async () => {
                  setIsExecuting(true);
                  await fetch(`/api/agents/${agentId}/token-launches/execute`, {
                    method: "POST",
                  });
                  await load();
                  setIsExecuting(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-bold text-white hover:bg-white/10 disabled:opacity-50"
              >
                {isExecuting ? "Executing..." : "Execute Pending"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Launch List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recent Launches</h3>
        {launches.map((launch) => {
             const isExpanded = expandedId === launch.id;
             const launchLogs = logs[launch.id] || [];

             return (
                 <div key={launch.id} className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/40">
                    <div 
                        className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-800/50"
                        onClick={() => setExpandedId(isExpanded ? null : launch.id)}
                    >
                        <div className="flex items-center gap-4">
                             <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
                                launch.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                                launch.status === "FAILED" ? "bg-rose-500/10 text-rose-400" :
                                "bg-amber-500/10 text-amber-400 animate-pulse"
                            }`}>
                                {launch.status === "COMPLETED" ? "✓" : launch.status === "FAILED" ? "✕" : "⚡"}
                            </div>
                            <div>
                                <div className="font-bold text-white">{launch.name} <span className="text-slate-500">({launch.symbol})</span></div>
                                <div className="text-xs text-slate-400">Supply: {launch.initialSupply} • Decimals: {launch.decimals}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {launch.tokenId && (
                              <a
                                href={`https://hashscan.io/testnet/token/${launch.tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded text-xs hover:underline"
                              >
                                {launch.tokenId}
                              </a>
                            )}
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                launch.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                                launch.status === "FAILED" ? "bg-rose-500/10 text-rose-400" :
                                "bg-amber-500/10 text-amber-400"
                            }`}>{launch.status}</span>
                        </div>
                    </div>

                    {/* Live Terminal / Logs */}
                    {isExpanded && (
                        <div className="border-t border-white/10 bg-black/50 p-4 font-mono text-xs">
                            <div className="mb-2 flex items-center justify-between text-slate-500">
                                <span>Live Execution Terminal</span>
                                <span>Task ID: {launch.id.slice(-6)}</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {launchLogs.length === 0 ? (
                                    <div className="text-slate-600 italic">Waiting for logs...</div>
                                ) : (
                                    launchLogs.map(log => (
                                        <div key={log.id} className="flex gap-2">
                                            <span className="text-slate-600">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                            <span className={
                                                log.level === "error" ? "text-rose-400" :
                                                log.level === "success" ? "text-emerald-400" :
                                                "text-cyan-200"
                                            }>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                 </div>
             )
        })}
        {launches.length === 0 && (
            <div className="text-center text-slate-500 py-8">No token launches yet. Start minting!</div>
        )}
      </div>
    </div>
  );
}
