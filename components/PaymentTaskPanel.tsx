"use client";

import { useEffect, useState } from "react";
import CreatePaymentForm from "./CreatePaymentForm";

type Log = {
  id: string;
  level: string;
  title: string;
  message: string;
  createdAt: string | Date;
  data?: string | null;
  paymentId?: string | null;
};

type Payment = {
  id: string;
  recipientAddress: string;
  amount: number;
  token: string;
  category: string;
  status: string;
  executionType: string;
  scheduleAt?: string | null;
  executedAt?: string | null;
  txId?: string | null;
  description?: string | null;
  createdAt: string;
  logs?: Log[];
};

export default function PaymentTaskPanel({ agentId }: { agentId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<null | { title: string; message: string }>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<
    Partial<Pick<Payment, "recipientAddress" | "amount" | "description">>
  >({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmStartId, setConfirmStartId] = useState<string | null>(null);
  const [confirmPauseId, setConfirmPauseId] = useState<string | null>(null);
  const [confirmStopId, setConfirmStopId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logs, setLogs] = useState<Record<string, Log[]>>({});
  const [credits, setCredits] = useState<null | { total: number; used: number; remaining: number }>(null);

  const load = async () => {
    const res = await fetch(`/api/payments/list?agentId=${agentId}`);
    const data = await res.json();
    setPayments(Array.isArray(data?.payments) ? data.payments : []);
  };

  const loadCredits = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/credits`);
      const data = await res.json();
      setCredits(data.credits ?? null);
    } catch (error) {
      console.error(error);
    }
  };

  const loadLogs = async (paymentId: string) => {
    // In a real implementation, we would have a specific endpoint or filter
    // For now we assume we can fetch logs for an agent and filter by paymentId
    // Or simpler: fetch all agent logs and filter client side (not efficient but works for demo)
    const res = await fetch(`/api/agents/${agentId}/logs`);
    const data = await res.json();
    const taskLogs = (Array.isArray(data?.logs) ? (data.logs as Log[]) : []).filter(
      (l) => l.paymentId === paymentId,
    );
    
    // Check if this task was recently restarted (we detect this if the logs are suddenly empty or new logs appear)
    // Actually, the server handles clearing. We just need to trust the server state.
    // However, if we want "New Task = New Terminal" feel, we rely on the fact that we clear logs on start in backend.
    
    setLogs(prev => ({ ...prev, [paymentId]: taskLogs }));
  };

  useEffect(() => {
    const t0 = setTimeout(() => {
      void load();
      void loadCredits();
    }, 0);
    const t = setInterval(() => {
      void load();
      void loadCredits();
    }, 5000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [agentId]);

  useEffect(() => {
    if (expandedId) {
        const t0 = setTimeout(() => {
          void loadLogs(expandedId);
        }, 0);
        const t = setInterval(() => void loadLogs(expandedId), 3000);
        return () => {
          clearTimeout(t0);
          clearInterval(t);
        };
    }
  }, [expandedId]);

  const updateStatus = async (paymentId: string, status: string) => {
    await fetch(`/api/payments/${paymentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const confirmStartTask = async () => {
    if (!confirmStartId) return;
    await updateStatus(confirmStartId, "pending");
    setConfirmStartId(null);
  };

  const confirmPauseTask = async () => {
    if (!confirmPauseId) return;
    await updateStatus(confirmPauseId, "paused");
    setConfirmPauseId(null);
  };

  const confirmStopTask = async () => {
    if (!confirmStopId) return;
    await updateStatus(confirmStopId, "cancelled");
    setConfirmStopId(null);
  };

  const startTask = (id: string) => setConfirmStartId(id);
  const pauseTask = (id: string) => setConfirmPauseId(id);
  const stopTask = (id: string) => setConfirmStopId(id);

  const openEdit = (p: Payment) => {
    setEditId(p.id);
    setEditData({ amount: p.amount, description: p.description, recipientAddress: p.recipientAddress });
  };

  const submitEdit = async () => {
    if (!editId) return;
    await fetch(`/api/payments/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData)
    });
    setEditId(null);
    setShowSuccess({ title: "Task Updated", message: "Payment details have been updated." });
    await load();
  };

  const doDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/payments/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setShowSuccess({ title: "Task Deleted", message: "Payment task has been removed." });
    await load();
  };

  return (
    <div className="space-y-4">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 shadow-xl backdrop-blur-xl animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="text-xl">✅</div>
            <div>
              <h4 className="font-bold text-emerald-400">{showSuccess.title}</h4>
              <p className="text-sm text-emerald-200/80">{showSuccess.message}</p>
            </div>
            <button onClick={() => setShowSuccess(null)} className="text-emerald-400/50 hover:text-emerald-400 ml-4">✕</button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Payment Tasks</h3>
        <div className="flex items-center gap-3">
          {credits && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Credits: {credits.remaining}/{credits.total}
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-400 transition"
          >
            + Create Task
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {payments.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No payment tasks found. Create one to get started.
          </div>
        )}
        {payments.map((p) => {
          const isExpanded = expandedId === p.id;
          return (
            <div
              key={p.id}
              className={`overflow-hidden rounded-xl border transition-all ${
                isExpanded ? "border-cyan-500/50 bg-slate-900" : "border-white/5 bg-slate-950/50 hover:bg-slate-950"
              }`}
            >
              {/* Header Row */}
              <div 
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
                    p.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    p.status === "executing" ? "bg-cyan-500/10 text-cyan-400 animate-pulse" :
                    p.status === "failed" ? "bg-rose-500/10 text-rose-400" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {p.status === "completed" ? "✓" : p.status === "failed" ? "✕" : "⚡"}
                  </div>
                  <div>
                    <div className="font-medium text-white">{p.description || "Payment Task"}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-slate-300">{p.amount} {p.token}</span>
                      <span>•</span>
                      <span>{p.executionType}</span>
                      <span>•</span>
                      <span>Cost: 1 credit</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-1 text-[10px] uppercase font-bold ${
                    p.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    p.status === "executing" ? "bg-cyan-500/10 text-cyan-400" :
                    p.status === "scheduled" ? "bg-amber-500/10 text-amber-400" :
                    "bg-slate-800 text-slate-500"
                  }`}>
                    {p.status}
                  </span>
                  <div className="text-slate-500">
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-white/5 bg-slate-950/30 p-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Recipient</span>
                        <span className="block font-mono text-slate-300 break-all bg-black/20 p-2 rounded border border-white/5">
                            {p.recipientAddress}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Scheduled For</span>
                        <span className="block text-slate-300">
                            {p.scheduleAt ? new Date(p.scheduleAt).toLocaleString() : "Immediate"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Transaction ID</span>
                        {p.txId ? (
                            <a 
                                href={`https://hashscan.io/testnet/transaction/${p.txId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block font-mono text-cyan-400 hover:text-cyan-300 hover:underline break-all bg-cyan-950/20 p-2 rounded border border-cyan-500/20"
                            >
                                {p.txId} ↗
                            </a>
                        ) : (
                            <span className="block font-mono text-slate-500">-</span>
                        )}
                      </div>
                    </div>

                    {/* Task Controls */}
                    <div className="flex flex-col gap-2">
                      {["scheduled", "paused", "failed", "pending", "cancelled"].includes(p.status) && (
                        <button
                          onClick={() => startTask(p.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
                        >
                          ▶ Start Task
                        </button>
                      )}
                      
                      {p.status === "scheduled" && (
                        <button
                          onClick={() => pauseTask(p.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 py-2 text-sm font-bold text-amber-400 hover:bg-amber-500/20"
                        >
                          ⏸ Pause
                        </button>
                      )}

                      {/* Cancel/Stop Button */}
                      {(p.status === "scheduled" || p.status === "pending" || p.status === "paused" || p.status === "executing") && (
                        <button
                          onClick={() => stopTask(p.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500/10 py-2 text-sm font-bold text-rose-400 hover:bg-rose-500/20"
                        >
                          ⏹ Stop
                        </button>
                      )}

                      {(p.status === "scheduled" || p.status === "paused" || p.status === "pending" || p.status === "failed" || p.status === "cancelled" || p.status === "completed") && (
                        <div className="grid grid-cols-2 gap-2">
                            {p.status !== "completed" && (
                              <button
                                  onClick={() => openEdit(p)}
                                  className="rounded-lg border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"
                              >
                                  ✎ Edit
                              </button>
                            )}
                            <button
                                onClick={() => setDeleteId(p.id)}
                                className={`rounded-lg border border-white/10 py-2 text-sm text-rose-400 hover:bg-rose-500/10 ${
                                  p.status === "completed" ? "col-span-2" : ""
                                }`}
                            >
                                🗑 Delete
                            </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Execution Terminal per Task */}
                  <div className="mt-4 rounded-lg bg-black/40 border border-white/5 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Live Execution Terminal</span>
                          <span className="text-[10px] text-slate-600">ID: {p.id.slice(0,8)}</span>
                      </div>
                      <div className="p-3 max-h-[150px] overflow-y-auto font-mono text-xs space-y-1">
                          {(!logs[p.id] || logs[p.id].length === 0) ? (
                              <div className="text-slate-600 italic">Waiting for execution logs...</div>
                          ) : (
                              logs[p.id].map(log => (
                                  <div key={log.id} className="flex gap-2">
                                      <span className="text-slate-600">[{new Date(log.createdAt).toLocaleTimeString().split(' ')[0]}]</span>
                                      <span className={
                                          log.level === 'success' ? 'text-emerald-400' : 
                                          log.level === 'error' ? 'text-rose-400' : 'text-blue-400'
                                      }>{log.message}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl relative">
            <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                ✕
            </button>
            <h3 className="mb-6 text-xl font-bold text-white">Create New Payment Task</h3>
            {credits && (
              <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                Cost: 1 credit per successful execution • Remaining {credits.remaining} of {credits.total}
              </div>
            )}
            <CreatePaymentForm 
                agentId={agentId} 
                onClose={() => {
                    setShowCreateModal(false);
                    load();
                }} 
            />
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmStartId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Start Task?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to start this payment task? Funds will be sent immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmStartId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartTask}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                Start Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPauseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Pause Task?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will stop any scheduled execution. You can resume it later.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmPauseId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmPauseTask}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
              >
                Pause Task
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStopId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Stop Task?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will cancel the task permanently. You can delete it afterwards.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmStopId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmStopTask}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400"
              >
                Stop & Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="text-lg font-bold text-white">Edit Payment Task</div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400">Amount</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Recipient</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  value={editData.recipientAddress}
                  onChange={(e) => setEditData({ ...editData, recipientAddress: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="text-lg font-bold text-white">Delete Payment</div>
            <div className="mt-2 text-sm text-slate-400">This action cannot be undone.</div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
