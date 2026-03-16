"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RiskLevel = "SAFE" | "SUSPICIOUS" | "DANGEROUS";

type PaymentRisk = {
  id: string;
  recipientAddress: string;
  amount: number;
  score: number;
  level: RiskLevel;
  reasons: string[];
  contractStatus?: string;
  contractReason?: string;
  blocked: boolean;
};

type TransactionRisk = {
  id: string;
  txId: string | null;
  amount: number;
  score: number;
  level: RiskLevel;
  reasons: string[];
};

type RiskScanResponse = {
  risksFound: number;
  blockedCount: number;
  riskyPayments: PaymentRisk[];
  riskyTransactions: TransactionRisk[];
  walletSignals: { address: string; reason: string }[];
  blacklistHits: string[];
};

export default function RiskMonitorPanel({
  agentId,
  initialData,
  operationalStatus,
}: {
  agentId: string;
  initialData: RiskScanResponse;
  operationalStatus: "active" | "paused" | "stopped";
}) {
  const [data, setData] = useState<RiskScanResponse>(initialData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastScan, setLastScan] = useState<string>("—");
  const [mounted, setMounted] = useState(false);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<{ address: string; reason: string }[]>([]);
  const [blacklistInput, setBlacklistInput] = useState("");
  const [contractInput, setContractInput] = useState("");
  const [contractReason, setContractReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchRisk = useCallback(async () => {
    if (operationalStatus !== "active") {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/risk/scan?agentId=${agentId}`, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as RiskScanResponse;
        setData(json);
        setLastScan(new Date().toLocaleTimeString());
      }
    } finally {
      setIsSyncing(false);
    }
  }, [agentId, operationalStatus]);

  const fetchLists = useCallback(async () => {
    const res = await fetch(`/api/risk/lists?agentId=${agentId}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { blacklist: string[]; watchlist: { address: string; reason: string }[] };
      setBlacklist(json.blacklist ?? []);
      setWatchlist(json.watchlist ?? []);
    }
  }, [agentId]);

  useEffect(() => {
    setMounted(true);
    if (operationalStatus !== "active") {
      return;
    }
    const t0 = setTimeout(fetchRisk, 0);
    const t = setInterval(fetchRisk, 6000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [agentId, fetchRisk, operationalStatus]);

  useEffect(() => {
    const t0 = setTimeout(fetchLists, 0);
    const t = setInterval(fetchLists, 12000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [fetchLists]);

  const topPayments = useMemo(
    () =>
      [...data.riskyPayments]
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [data.riskyPayments],
  );

  const topTransactions = useMemo(
    () =>
      [...data.riskyTransactions]
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [data.riskyTransactions],
  );

  const suspiciousContracts = useMemo(
    () => data.riskyPayments.filter((p) => p.contractStatus === "Suspicious"),
    [data.riskyPayments],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Risk Monitor AI</h3>
          <p className="text-sm text-slate-400">
            Real-time protection against scam, hack, dan transaksi berbahaya
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Last scan: {mounted ? lastScan : "—"}</span>
          <button
            onClick={async () => {
              setIsGenerating(true);
              await fetch("/api/risk/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
              });
              await fetchLists();
              await fetchRisk();
              setIsGenerating(false);
            }}
            disabled={isGenerating || isSyncing}
            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Demo"}
          </button>
          <button
            onClick={fetchRisk}
            disabled={isSyncing}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            {isSyncing ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="text-sm text-slate-400">Transaction Risk Score</div>
          <div className={`mt-2 text-2xl font-bold ${data.risksFound > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {data.risksFound}
          </div>
          <div className="mt-1 text-xs text-slate-500">Total flags (0 safe, 100 dangerous)</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="text-sm text-slate-400">Blocked Attempts</div>
          <div className={`mt-2 text-2xl font-bold ${data.blockedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {data.blockedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Auto-blocked by AI</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="text-sm text-slate-400">Blacklist Hits</div>
          <div className={`mt-2 text-2xl font-bold ${data.blacklistHits.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {data.blacklistHits.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">Phishing detection</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Transaction Risk Scoring</h4>
          <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-2">
            {topPayments.length === 0 ? (
              <div className="text-xs text-slate-500">No risky outgoing payments.</div>
            ) : (
              topPayments.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">{p.recipientAddress}</span>
                    <span className={`font-bold ${p.score >= 80 ? "text-rose-400" : p.score >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                      {p.score}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{p.amount.toFixed(2)} HBAR</span>
                    <span>{p.level}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {p.reasons.join(" • ") || "No flags"}
                  </div>
                  {p.blocked && (
                    <div className="mt-2 text-[11px] text-rose-300">Blocked</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Wallet Behavior Analysis</h4>
          <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-2">
            {data.walletSignals.length === 0 ? (
              <div className="text-xs text-slate-500">No suspicious wallet behavior.</div>
            ) : (
              data.walletSignals.map((w, idx) => (
                <div key={`${w.address}-${idx}`} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">{w.address}</span>
                    <span className="text-amber-300">{w.reason}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Smart Contract Analyzer</h4>
          <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-2">
            {suspiciousContracts.length === 0 ? (
              <div className="text-xs text-slate-500">No suspicious contracts detected.</div>
            ) : (
              suspiciousContracts.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">{c.recipientAddress}</span>
                    <span className="text-rose-300">{c.contractStatus}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{c.contractReason}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Blockchain Risk Events</h4>
          <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-2">
            {topTransactions.length === 0 ? (
              <div className="text-xs text-slate-500">No risky on-chain transactions.</div>
            ) : (
              topTransactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{t.txId ?? "tx pending"}</span>
                    <span className={`font-bold ${t.score >= 80 ? "text-rose-400" : "text-amber-400"}`}>{t.score}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{t.reasons.join(" • ")}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Phishing Detection</h4>
          <p className="mt-2 text-xs text-slate-500">Alamat di blacklist akan otomatis diblok.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={blacklistInput}
              onChange={(e) => setBlacklistInput(e.target.value)}
              placeholder="0.0.xxxx"
              className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <button
              onClick={async () => {
                if (!blacklistInput) return;
                setIsSaving(true);
                await fetch("/api/risk/lists", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agentId, type: "blacklist", address: blacklistInput }),
                });
                setBlacklistInput("");
                await fetchLists();
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Block
            </button>
          </div>
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {blacklist.length === 0 ? (
              <div className="text-xs text-slate-500">Blacklist kosong.</div>
            ) : (
              blacklist.map((addr) => (
                <div key={addr} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/70 px-3 py-2 text-xs">
                  <span className="font-mono text-slate-300">{addr}</span>
                  <button
                    onClick={async () => {
                      setIsSaving(true);
                      await fetch("/api/risk/lists", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentId, type: "blacklist", address: addr }),
                      });
                      await fetchLists();
                      setIsSaving(false);
                    }}
                    disabled={isSaving}
                    className="text-rose-300 hover:text-rose-200"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Contract Watchlist</h4>
          <p className="mt-2 text-xs text-slate-500">Kontrak pada daftar ini akan ditandai suspicious.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={contractInput}
              onChange={(e) => setContractInput(e.target.value)}
              placeholder="0.0.contract"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={contractReason}
              onChange={(e) => setContractReason(e.target.value)}
              placeholder="Reason (mis. Proxy upgradeable)"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={async () => {
                if (!contractInput) return;
                setIsSaving(true);
                await fetch("/api/risk/lists", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    agentId,
                    type: "contract",
                    address: contractInput,
                    reason: contractReason,
                  }),
                });
                setContractInput("");
                setContractReason("");
                await fetchLists();
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
            >
              Add Contract
            </button>
          </div>
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {watchlist.length === 0 ? (
              <div className="text-xs text-slate-500">Watchlist kosong.</div>
            ) : (
              watchlist.map((c) => (
                <div key={c.address} className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/70 px-3 py-2 text-xs">
                  <div>
                    <div className="font-mono text-slate-300">{c.address}</div>
                    <div className="text-[10px] text-slate-500">{c.reason}</div>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSaving(true);
                      await fetch("/api/risk/lists", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ agentId, type: "contract", address: c.address }),
                      });
                      await fetchLists();
                      setIsSaving(false);
                    }}
                    disabled={isSaving}
                    className="text-rose-300 hover:text-rose-200"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
