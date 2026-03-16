import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { getAgentTemplateById } from "@/lib/marketplaceStore";
import RentButton from "@/components/RentButton"; // We need to create this client component

export const dynamic = "force-dynamic";

type TemplateDetailPageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { templateId } = await params;
  const template = await getAgentTemplateById(templateId);

  if (!template) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold text-white">Agent Not Found</h1>
          <Link
            href="/marketplace"
            className="mt-4 rounded-full bg-white/10 px-6 py-2 text-sm hover:bg-white/20"
          >
            Back to Marketplace
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const capabilities = JSON.parse(template.capabilities) as string[];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-white"
        >
          ← Back to Marketplace
        </Link>
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Info */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-4xl">
                  🤖
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{template.name}</h1>
                  <p className="text-slate-400">{template.role}</p>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white">About this Agent</h3>
                <p className="mt-4 text-slate-300 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white">Capabilities</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2 rounded-lg bg-slate-950/50 p-3 text-sm text-slate-300">
                      <span className="text-cyan-400">✓</span>
                      {cap}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-8">
              <h3 className="text-lg font-semibold text-white">Performance Stats (Network Avg)</h3>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <div className="text-2xl font-bold text-emerald-400">99.9%</div>
                  <div className="text-xs text-slate-500">Uptime</div>
                </div>
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <div className="text-2xl font-bold text-cyan-400">24/7</div>
                  <div className="text-xs text-slate-500">Monitoring</div>
                </div>
                <div className="rounded-xl bg-slate-950/50 p-4">
                  <div className="text-2xl font-bold text-purple-400">Auto</div>
                  <div className="text-xs text-slate-500">Execution</div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Action */}
          <div className="space-y-6">
            <div className="sticky top-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
              <div className="mb-6">
                <p className="text-sm text-slate-400">Monthly Rent</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{template.price}</span>
                  <span className="text-lg font-semibold text-cyan-400">HBAR</span>
                </div>
              </div>

              <RentButton templateId={template.id} price={template.price} role={template.role} />

              <div className="mt-6 space-y-4 border-t border-white/10 pt-6 text-sm text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Setup Fee</span>
                  <span className="text-white">0 HBAR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Network</span>
                  <span className="text-white">Hedera Testnet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>License</span>
                  <span className="text-white">Commercial</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
