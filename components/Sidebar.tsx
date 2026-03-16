"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Operations Dashboard", href: "/dashboard" },
  { label: "My Agents", href: "/agents" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-slate-950/80 px-5 py-8 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 font-bold">
          A
        </div>
        <div>
          <div className="text-lg font-bold text-white leading-none">Ur4gent</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 mt-1">
            Rental Platform
          </div>
        </div>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        <div className="px-4 text-xs font-semibold uppercase text-slate-500 mb-2">
          Platform
        </div>
        {items.slice(0, 1).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="mt-6 px-4 text-xs font-semibold uppercase text-slate-500 mb-2">
          Operations
        </div>
        {items.slice(1).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        
        {/* OpenClaw Link */}
        <Link
            href="/bounties"
            className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
            pathname.startsWith("/bounties")
                ? "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
        >
            OpenClaw Bounties
        </Link>

      </nav>

      <div className="mt-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs">
        <div className="text-emerald-200 font-semibold mb-1">Network Status</div>
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Hedera Testnet
        </div>
      </div>
    </aside>
  );
}
