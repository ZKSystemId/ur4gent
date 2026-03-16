"use client";

import Link from "next/link";
import { useWallet } from "@/lib/hashconnect";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isConnected, connect, accountId } = useWallet();
  const router = useRouter();

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isConnected) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,116,144,0.2),_transparent_45%)]" />
      
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 mx-auto max-w-7xl">
        <div className="text-xl font-bold tracking-tight text-white">Ur4gent</div>
        <div className="flex gap-6 text-sm font-medium text-slate-300 items-center">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <button onClick={handleDashboardClick} className="hover:text-white">Dashboard</button>
          
          {isConnected ? (
             <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
                {accountId}
             </div>
          ) : (
             <button 
                onClick={connect}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
             >
                Connect Wallet
             </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          AI Agent Rental Marketplace
        </div>
        <h1 className="mt-8 text-5xl font-bold leading-tight text-white sm:text-7xl">
          Rent Autonomous<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Crypto Operators
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-xl text-slate-300 leading-relaxed">
          Don&apos;t build. Just rent. <br/>
          Deploy specialized AI agents for Treasury Management, Payments, and Risk Monitoring on Hedera in one click.
        </p>
        
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.35)] transition hover:bg-cyan-300 hover:scale-105"
            href="/marketplace"
          >
            Explore Marketplace
          </Link>
          <button
            onClick={handleDashboardClick}
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/10"
          >
            Go to Dashboard
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold text-white mb-16">Why Rent an Agent?</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Instant Deployment",
              desc: "Skip the coding. Rent an agent and it starts working on the blockchain immediately.",
              icon: "⚡",
            },
            {
              title: "Autonomous Treasury",
              desc: "Agents manage funds, allocate budgets, and detect anomalies 24/7 without sleep.",
              icon: "🏦",
            },
            {
              title: "Secure Operations",
              desc: "Built on Hedera with non-custodial architecture and real-time risk monitoring.",
              icon: "🔒",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur hover:border-cyan-400/20">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              <p className="mt-3 text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
