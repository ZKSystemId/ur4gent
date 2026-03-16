"use client";

import { useState, useEffect } from "react";
import type { Agent } from "@/types/agent";
import { useWallet } from "@/lib/hashconnect";
import { TransferTransaction, Hbar, AccountId, TransactionId } from "@hiero-ledger/sdk";

export default function TopUpModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { dAppConnector, accountId: myAccountId, isConnected } = useWallet();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("10");
  const [status, setStatus] = useState<string>("");

  const copyAddress = () => {
    navigator.clipboard.writeText(agent.hederaAccountId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchBalance = async () => {
    // Don't set loading true for background refresh to avoid UI flicker
    try {
        const res = await fetch(`/api/agents/${agent.id}/balance`, { 
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        
        const text = await res.text();
        if (!text) return;
        
        const data = JSON.parse(text);
        if (data.balance !== undefined) {
             setBalance(data.balance);
        }
    } catch (e) {
        console.error("TopUp fetchBalance error:", e);
    }
  };

  useEffect(() => {
    const t0 = setTimeout(() => {
      void fetchBalance();
    }, 0);
    const interval = setInterval(() => {
      void fetchBalance();
    }, 5000);
    return () => {
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [agent.id]);

  const handleTopUp = async () => {
    if (!dAppConnector || !myAccountId || !agent.hederaAccountId) {
        setStatus("Wallet not connected or agent invalid");
        return;
    }

    setLoading(true);
    setStatus("Initiating transfer...");

    try {
        const signer = dAppConnector.signers[0];
        const transferAmount = parseFloat(amount);

        if (isNaN(transferAmount) || transferAmount <= 0) {
            setStatus("Invalid amount");
            setLoading(false);
            return;
        }

        const myId = AccountId.fromString(myAccountId);
        const agentId = AccountId.fromString(agent.hederaAccountId);

        const tx = new TransferTransaction()
            .setTransactionId(TransactionId.generate(myId))
            .setNodeAccountIds([new AccountId(3), new AccountId(4), new AccountId(5)])
            .addHbarTransfer(myId, new Hbar(-transferAmount))
            .addHbarTransfer(agentId, new Hbar(transferAmount));

        // Note: We skip freezeWithSigner and let executeWithSigner handle it if possible, 
        // or just freeze() manually. "list is locked" usually means we are modifying a frozen tx.
        // HWC Signer usually expects a frozen transaction but sometimes the double-freeze causes issues.
        // Let's try freeze() first without signer, then execute.
        
        tx.freeze();

        setStatus("Please sign in wallet...");
        
        const result = await tx.executeWithSigner(signer);
        
        setStatus(`Sent! TxID: ${result.transactionId.toString()}`);
        
        // Optimistic update or wait for refresh
        setTimeout(() => {
            fetchBalance();
            setLoading(false);
            setStatus("Success!");
            setTimeout(onClose, 2000);
        }, 3000);

    } catch (e: unknown) {
        console.error("Transfer failed:", e);
        const message = e instanceof Error ? e.message : "Transfer failed";
        setStatus(`Error: ${message}`);
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
            ✕
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Top Up Wallet</h3>
        
        <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-center">
                <div className="text-sm text-slate-400 mb-2">Agent Balance</div>
                <div className="text-3xl font-bold text-white">
                    {balance !== null ? balance.toFixed(2) : agent.balance.toFixed(2)} 
                    <span className="text-lg font-normal text-slate-500 ml-1">HBAR</span>
                </div>
                <button 
                    onClick={() => fetchBalance()}
                    className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Wallet Payment Section */}
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
                <h4 className="text-sm font-semibold text-white mb-3">Instant Top Up</h4>
                
                {!isConnected ? (
                    <div className="text-center text-sm text-slate-400 py-2">
                        Connect wallet to top up instantly.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="Amount"
                                />
                                <span className="absolute right-3 top-2 text-slate-500">HBAR</span>
                            </div>
                            <button
                                onClick={handleTopUp}
                                disabled={loading}
                                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-white hover:bg-cyan-400 disabled:opacity-50"
                            >
                                {loading ? "Sending..." : "Send"}
                            </button>
                        </div>
                        {status && (
                            <p className={`text-xs ${status.includes("Error") ? "text-rose-400" : "text-emerald-400"}`}>
                                {status}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Manual Deposit Address</label>
                <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-slate-950 px-4 py-3 font-mono text-sm text-slate-300 border border-white/10 break-all select-all">
                        {agent.hederaAccountId || "No Address"}
                    </div>
                    <button
                        onClick={copyAddress}
                        className={`px-4 rounded-lg font-bold transition ${
                            copied ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
