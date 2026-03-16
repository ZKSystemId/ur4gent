"use client";

import { useEffect, useState } from "react";

export default function PaymentInsights({ agentId }: { agentId: string }) {
  const [stats, setStats] = useState({
    totalSent: 0,
    scheduledNextWeek: 0,
    riskLevel: "Low",
    successfulTx: 0,
    failedTx: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // In a real implementation, this would be a dedicated API endpoint
      // aggregating data from the database. For now, we fetch payments and calculate.
      try {
        const res = await fetch(`/api/payments/list?agentId=${agentId}`);
        const data = await res.json();
        const payments: Array<{
          status: string;
          amount: number;
          scheduleAt?: string | null;
        }> = Array.isArray(data?.payments) ? data.payments : [];

        let sent = 0;
        let scheduled = 0;
        let success = 0;
        let failed = 0;
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        payments.forEach((p) => {
            if (p.status === "completed") {
                sent += p.amount;
                success++;
            } else if (p.status === "failed") {
                failed++;
            } else if (p.status === "scheduled" && p.scheduleAt) {
                const scheduleDate = new Date(p.scheduleAt);
                if (scheduleDate <= nextWeek && scheduleDate >= now) {
                    scheduled += p.amount;
                }
            }
        });

        // Determine Risk Level (Mock logic)
        const failRate = success + failed > 0 ? failed / (success + failed) : 0;
        let risk = "Low";
        if (failRate > 0.1) risk = "Medium";
        if (failRate > 0.3) risk = "High";

        setStats({
            totalSent: sent,
            scheduledNextWeek: scheduled,
            riskLevel: risk,
            successfulTx: success,
            failedTx: failed
        });
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [agentId]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5">
        <div className="text-xs text-slate-400">Total Sent (Weekly)</div>
        <div className="mt-1 text-2xl font-bold text-white">{stats.totalSent.toLocaleString()} <span className="text-sm font-normal text-slate-500">HBAR</span></div>
      </div>
      
      <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5">
        <div className="text-xs text-slate-400">Scheduled Next Week</div>
        <div className="mt-1 text-2xl font-bold text-white">{stats.scheduledNextWeek.toLocaleString()} <span className="text-sm font-normal text-slate-500">HBAR</span></div>
      </div>

      <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5">
        <div className="text-xs text-slate-400">Success Rate</div>
        <div className="mt-1 text-2xl font-bold text-emerald-400">
            {stats.successfulTx + stats.failedTx > 0 
                ? ((stats.successfulTx / (stats.successfulTx + stats.failedTx)) * 100).toFixed(1) 
                : 100
            }%
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/60 p-4 border border-white/5">
        <div className="text-xs text-slate-400">Risk Level</div>
        <div className={`mt-1 text-2xl font-bold ${
            stats.riskLevel === "Low" ? "text-emerald-400" :
            stats.riskLevel === "Medium" ? "text-amber-400" : "text-rose-400"
        }`}>
            {stats.riskLevel}
        </div>
      </div>
    </div>
  );
}
