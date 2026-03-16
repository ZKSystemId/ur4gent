"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarketInsights } from "@/services/marketEngine";

export default function MarketMonitorPanel({
  agentId,
  initialData,
  operationalStatus,
}: {
  agentId: string;
  initialData: MarketInsights;
  operationalStatus: "active" | "paused" | "stopped";
}) {
  const [data, setData] = useState<MarketInsights>(initialData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastScan, setLastScan] = useState<string>("—");
  const [mounted, setMounted] = useState(false);
  const didAutoDemo = useRef(false);

  const fetchMarket = useCallback(async () => {
    if (operationalStatus !== "active") {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/market/scan?agentId=${agentId}`, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as MarketInsights;
        setData(json);
        setLastScan(new Date().toLocaleTimeString());
      }
    } finally {
      setIsSyncing(false);
    }
  }, [agentId, operationalStatus]);

  useEffect(() => {
    setMounted(true);
    if (operationalStatus !== "active") {
      return;
    }
    const t0 = setTimeout(fetchMarket, 0);
    const t = setInterval(fetchMarket, 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [fetchMarket, operationalStatus]);

  useEffect(() => {
    if (didAutoDemo.current) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("demo") !== "1") return;
    didAutoDemo.current = true;
    if (operationalStatus !== "active") return;
    void (async () => {
      setIsGenerating(true);
      await fetch("/api/market/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      await fetch("/api/ops/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      await fetchMarket();
      setIsGenerating(false);
    })();
  }, [agentId, fetchMarket, operationalStatus]);

  const trends = useMemo(() => data.trends.slice(0, 4), [data.trends]);
  const reports = useMemo(() => data.tokenReports.slice(0, 4), [data.tokenReports]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Market Analyst AI</h3>
          <p className="text-sm text-slate-400">
            Fungsi utama: memberi analisis pasar crypto (insight engine, bukan auto trade)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Last scan: {mounted ? lastScan : "—"}</span>
          <button
            onClick={async () => {
              setIsGenerating(true);
              await fetch("/api/market/demo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
              });
              await fetch("/api/ops/cycle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
              });
              await fetchMarket();
              setIsGenerating(false);
            }}
            disabled={isGenerating || isSyncing}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Demo"}
          </button>
          <button
            onClick={fetchMarket}
            disabled={isSyncing}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            {isSyncing ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {data.prices.map((p) => (
          <div key={p.symbol} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <div className="text-xs text-slate-400">{p.symbol}</div>
            <div className="text-lg font-bold text-white">${p.price.toLocaleString()}</div>
            <div className={`text-xs ${p.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {p.change24h.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Token Trend Detection</h4>
          <div className="mt-4 space-y-3">
            {trends.map((t) => (
              <div key={t.symbol} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">{t.symbol}</span>
                  <span className="text-cyan-300">Volume +{t.volumeChange}%</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Social sentiment: {t.sentiment}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Whale Movement Detection</h4>
          <div className="mt-4 space-y-3">
            {data.whaleAlerts.map((w, idx) => (
              <div key={`${w.amount}-${idx}`} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">{w.amount.toLocaleString()} HBAR</span>
                  <span className="text-amber-300">Whale Alert</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{w.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Market Sentiment Analysis</h4>
          <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/70 px-4 py-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Market Sentiment</span>
              <span className="text-emerald-400">{data.sentiment.marketSentiment}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Confidence: {data.sentiment.confidence}% | Sources: {data.sentiment.sources.join(", ")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Token Performance Analyzer</h4>
          <div className="mt-4 space-y-3">
            {reports.map((r) => (
              <div key={r.symbol} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">{r.symbol}</span>
                  <span className="text-cyan-300">7D Growth: +{r.growth7d}%</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Risk Level: {r.riskLevel} | Momentum: {r.momentum}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">Alpha Signal Generator</h4>
          <div className="mt-4 space-y-3">
            {data.alphaSignals.map((a, idx) => (
              <div key={`${a.title}-${idx}`} className="rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3 text-xs">
                <div className="text-slate-300">{a.title}</div>
                <div className="mt-1 text-[11px] text-slate-500">{a.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h4 className="text-sm font-semibold text-white">AI Market Summary</h4>
          <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/70 px-4 py-4 text-xs text-slate-400">
            {data.report}
          </div>
        </div>
      </div>
    </div>
  );
}
