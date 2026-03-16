import DashboardLayout from "@/components/DashboardLayout";

const settingGroups = [
  {
    title: "AI Orchestration",
    description: "Model selection, agent autonomy, and routing rules.",
    status: "Active",
  },
  {
    title: "Hedera Network",
    description: "Testnet configuration and operator credentials.",
    status: "Configured",
  },
  {
    title: "Security",
    description: "Key vault integration and access control.",
    status: "Memory-only",
  },
  {
    title: "Notifications",
    description: "Webhook delivery and alert thresholds.",
    status: "Disabled",
  },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage governance, permissions, and infrastructure.
        </p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {settingGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {group.title}
              </h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {group.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {group.description}
            </p>
          </div>
        ))}
      </section>
    </DashboardLayout>
  );
}
