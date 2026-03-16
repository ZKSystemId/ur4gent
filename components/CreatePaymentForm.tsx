"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePaymentForm({ agentId, onClose }: { agentId: string; onClose?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<null | { title: string; message: React.ReactNode }>(null);
  const [formData, setFormData] = useState({
    recipientAddress: "",
    amount: "",
    token: "HBAR",
    category: "Payroll",
    executionType: "Instant",
    scheduleAt: "",
    recurringInterval: "Monthly",
    description: "",
    agentId: agentId,
    riskCheck: true,
  });

  const [showConfirm, setShowConfirm] = useState(false);

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [batchInput, setBatchInput] = useState("");

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      if (mode === "batch") {
          const lines = batchInput.trim().split("\n");
          let totalAmount = 0;

          if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === "")) {
              alert("Please enter at least one recipient.");
              setLoading(false);
              return;
          }

          const batchRecipients = [];
          // totalAmount is already declared in the outer scope of handleConfirm (line 37)
          // Just reset it
          totalAmount = 0;

          for (const line of lines) {
              // Parse robustly: handle comma, tab, semicolon, or space separation
              // Matches: address followed by separators followed by amount
              // Example: "0.0.123, 100" or "0.0.123 100" or "0.0.123;100"
              const parts = line.split(/[,\t;]+/).map(s => s.trim()).filter(s => s.length > 0);
              
              // If split by space fails (e.g. single space separator not caught by above if no comma), try splitting by space
              // But be careful about address formats. Hedera addresses are 0.0.x (no spaces).
              let address = parts[0];
              let amountStr = parts[1];

              if (parts.length === 1 && line.includes(" ")) {
                  const spaceParts = line.trim().split(/\s+/);
                  if (spaceParts.length >= 2) {
                      address = spaceParts[0];
                      amountStr = spaceParts[1];
                  }
              }

              const amount = parseFloat(amountStr);

              if (!address || isNaN(amount)) {
                  continue;
              }

              batchRecipients.push({ address, amount });
              totalAmount += amount;
          }

          if (batchRecipients.length > 0) {
              const res = await fetch("/api/payments/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...formData,
                  // Use a special recipient for batch or just the first one?
                  // Better: pass special flag or empty recipient
                  recipientAddress: "Batch Payment", 
                  amount: totalAmount,
                  scheduleAt: formData.executionType === "Scheduled" ? formData.scheduleAt : undefined,
                  description: `Batch: ${formData.description || "Bulk Payment"}`,
                  batchDetails: JSON.stringify(batchRecipients)
                }),
              });

              if (res.ok) {
                  router.refresh();
                  setBatchInput("");
                  setSuccess({
                    title: "Batch Created",
                    message: (
                      <div>
                        <p className="mb-2 font-medium text-white">Batch Task Created Successfully.</p>
                        <p className="text-sm text-slate-300">
                           Queued {batchRecipients.length} transfers (Total {totalAmount.toFixed(2)} HBAR).
                        </p>
                        <p className="mt-2 text-xs text-slate-500">View the single batch task in the panel below.</p>
                      </div>
                    ),
                  });
                  if (onClose) setTimeout(onClose, 5000);
              } else {
                  const errorData = await res.json();
                  alert(`Failed to create batch payment: ${errorData.error || "Unknown error"}`);
                  console.error("Batch creation failed:", errorData);
              }
          } else {
              setSuccess({
                 title: "Invalid Batch Format",
                 message: "No valid payment lines found. Please use format: address, amount",
               });
          }
      } else {
          const res = await fetch("/api/payments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formData,
              amount: parseFloat(formData.amount),
              scheduleAt: formData.executionType === "Scheduled" ? formData.scheduleAt : undefined,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            router.refresh();
            setFormData({ ...formData, recipientAddress: "", amount: "" });
            setSuccess({
              title: "Payment Created",
              message: (
                <div>
                   <p className="mb-2">{parseFloat(formData.amount) || 0} HBAR queued to {formData.recipientAddress || "recipient"}.</p>
                   {data.payment?.id && <p className="text-xs text-slate-500">Task ID: {data.payment.id.slice(0,8)}</p>}
                </div>
              ),
            });
            if (onClose) setTimeout(onClose, 3000);
          } else {
            setSuccess(null);
          }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2 rounded-xl bg-slate-950 p-1 border border-white/10 mb-4">
        <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "single" ? "bg-cyan-400/20 text-cyan-400" : "text-slate-400 hover:text-white"
            }`}
        >
            Single Payment
        </button>
        <button
            type="button"
            onClick={() => setMode("batch")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                mode === "batch" ? "bg-cyan-400/20 text-cyan-400" : "text-slate-400 hover:text-white"
            }`}
        >
            Batch Payment
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {mode === "single" ? (
            <>
                <div>
                <label className="block text-sm font-medium text-slate-400">Recipient Wallet Address</label>
                <input
                    type="text"
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    placeholder="0.0.123456"
                    value={formData.recipientAddress}
                    onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-400">Amount (HBAR)</label>
                <input
                    type="number"
                    step="0.000001"
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    placeholder="100.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
                </div>
            </>
        ) : (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400">Batch List (CSV format: address, amount)</label>
                <textarea
                    required
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                    placeholder={`0.0.12345, 100\n0.0.67890, 50\n0.0.11111, 250`}
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Enter one payment per line.</p>
            </div>
        )}

        <div>
            <label className="block text-sm font-medium text-slate-400">Assigned Agent</label>
            <div className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-300">
              {formData.agentId}
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400">Category</label>
          <select
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option>Payroll</option>
            <option>Contributor</option>
            <option>Bounty</option>
            <option>Treasury Transfer</option>
            <option>Grant</option>
            <option>Subscription</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400">Execution Type</label>
          <div className="mt-2 flex gap-2">
            {["Instant", "Scheduled", "Recurring"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, executionType: type })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  formData.executionType === type
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 bg-slate-950 text-slate-400 hover:bg-white/5"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {formData.executionType === "Scheduled" && (
            <div>
                <label className="block text-sm font-medium text-slate-400">Execution Time</label>
                <input
                    type="datetime-local"
                    required
                    style={{ colorScheme: "dark" }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    value={formData.scheduleAt}
                    onChange={(e) => setFormData({ ...formData, scheduleAt: e.target.value })}
                />
            </div>
        )}

        {formData.executionType === "Recurring" && (
            <div>
                <label className="block text-sm font-medium text-slate-400">Interval</label>
                <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    value={formData.recurringInterval}
                    onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value })}
                >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                </select>
            </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400">Description</label>
        <textarea
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
          rows={3}
          placeholder="Payment details..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3">
         <input 
            type="checkbox" 
            id="riskCheck"
            checked={formData.riskCheck}
            onChange={(e) => setFormData({ ...formData, riskCheck: e.target.checked })}
            className="h-4 w-4 rounded border-white/10 bg-slate-950 text-cyan-400 focus:ring-cyan-400"
         />
         <label htmlFor="riskCheck" className="text-sm text-slate-300">Run AI Risk Analysis before execution</label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-4 font-bold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50"
      >
        {loading ? "Processing..." : "Create Payment Task"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Creation</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>Please review the details:</p>
              <div className="rounded-lg bg-slate-950 p-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">To:</span>
                  <span className="font-mono text-cyan-400">
                    {mode === "batch" 
                      ? `${batchInput.trim().split("\n").length} Recipients`
                      : formData.recipientAddress
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-white">
                    {mode === "batch"
                      ? "Varies"
                      : `${formData.amount} ${formData.token}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span>{formData.executionType}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="text-lg font-bold text-white">{success.title}</div>
            <div className="mt-2 text-sm text-slate-400">
              {success.message}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSuccess(null)}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
