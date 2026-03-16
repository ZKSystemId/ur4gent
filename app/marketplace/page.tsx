import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { getAgentTemplates } from "@/lib/marketplaceStore";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const templates = await getAgentTemplates();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agent Marketplace</h1>
          <p className="mt-2 text-slate-400">
            Rent autonomous AI agents to manage your crypto operations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-cyan-400/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-2xl">
                    🤖
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                    {template.role.replace("_", " ")}
                  </div>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {template.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {JSON.parse(template.capabilities).slice(0, 3).map((cap: string) => (
                    <span
                      key={cap}
                      className="rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-300"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Starting price</p>
                  <p className="text-lg font-semibold text-white">
                    {template.price} HBAR
                    <span className="text-xs font-normal text-slate-500">/mo</span>
                  </p>
                </div>
                <Link
                  href={`/marketplace/${template.id}`}
                  className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
