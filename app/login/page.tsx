"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/hashconnect";

export default function LoginPage() {
  const { connect, isConnected, accountId, isInitializing } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
            <span className="text-3xl">🤖</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Welcome to Ur4gent
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Your gateway to the Autonomous Agentic Society.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-cyan-500/30 bg-cyan-950/10 p-4 text-center">
            <p className="text-xs font-medium text-cyan-400">
              🚀 Hedera Hackathon 2026 Participant
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Participating in &quot;AI & Agents&quot; Track with OpenClaw UCP Integration.
            </p>
          </div>

          <button
            onClick={connect}
            disabled={isInitializing}
            className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-8 py-4 font-semibold text-slate-950 transition-all hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isInitializing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <span className="relative z-10">
              {isInitializing ? "Initializing Wallet..." : "Connect HashPack Wallet"}
            </span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
          </button>

          <p className="text-center text-xs text-slate-500">
            By connecting, you agree to enable AI Agents to perform autonomous actions on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
