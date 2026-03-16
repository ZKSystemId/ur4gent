import DashboardLayout from "@/components/DashboardLayout";
import EconomyActivityFeed from "@/components/EconomyActivityFeed";
import { getActivities } from "@/lib/activityStore";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const activities = await getActivities();

  return (
    <DashboardLayout>
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-white">
          Operations Activity
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Real-time signals from AI operators and on-chain actions.
        </p>
      </section>
      <EconomyActivityFeed initialActivities={activities} />
    </DashboardLayout>
  );
}
