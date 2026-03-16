"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter (1 day)", credits: 5, factor: 0.2 },
  { value: "pro", label: "Pro (7 days)", credits: 30, factor: 0.6 },
  { value: "enterprise", label: "Enterprise (30 days)", credits: 120, factor: 1 },
];

export default function RentButton({
  templateId,
  price,
  role,
}: {
  templateId: string;
  price: number;
  role: string;
}) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("enterprise");
  const router = useRouter();
  const planMeta = PLAN_OPTIONS.find((p) => p.value === plan) ?? PLAN_OPTIONS[2];
  const planPrice = Number((price * planMeta.factor).toFixed(2));

  const handleRent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, plan }),
      });

      if (res.ok) {
        // Redirect to dashboard to see the new agent
        router.push("/dashboard");
      } else {
        alert("Failed to rent agent. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-slate-400">Rental Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Retainer</span>
        <span className="text-cyan-300">{planPrice} HBAR</span>
      </div>
      {role === "payment_operator" && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Reserved Credits</span>
          <span className="text-emerald-300">{planMeta.credits} tasks</span>
        </div>
      )}
      <button
        onClick={handleRent}
        disabled={loading}
        className="w-full rounded-xl bg-cyan-400 py-4 text-center font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Processing..." : `Rent Agent Now`}
      </button>
    </div>
  );
}
