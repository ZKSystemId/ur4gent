"use client";

import { useEffect, useState } from "react";
import type { ActivityItem } from "@/types/activity";

const activityTone: Record<ActivityItem["type"], string> = {
  agent_created: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  on_chain_payment: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200",
  payment_created: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  payment_executed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  blockchain_event: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  ai_operation: "border-indigo-400/40 bg-indigo-400/10 text-indigo-200",
  treasury_alert: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  risk_warning: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  automation_triggered: "border-amber-400/40 bg-amber-400/10 text-amber-200",
};

type EconomyActivityFeedProps = {
  initialActivities: ActivityItem[];
};

export default function EconomyActivityFeed({
  initialActivities,
}: EconomyActivityFeedProps) {
  const [activities, setActivities] =
    useState<ActivityItem[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = async () => {
    setIsLoading(true);
    const response = await fetch("/api/activity/list", {
      cache: "no-store",
    });
    const data = (await response.json()) as { activities: ActivityItem[] };
    setActivities(data.activities);
    setIsLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchActivities, 0);
    const interval = setInterval(fetchActivities, 4000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      id="activity"
      className="rounded-2xl border border-white/10 bg-slate-900/60 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Operations Activity
          </h3>
          <p className="text-sm text-slate-400">
            Real-time signals from your AI operators
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {isLoading ? "Syncing" : "Live feed"}
        </span>
      </div>
      <div className="mt-6 space-y-4">
        {activities.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-6 text-sm text-slate-400">
            No operations events yet. Start operations to generate activity.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-slate-950/70 px-4 py-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${activityTone[activity.type]}`}
                  >
                    {activity.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {activity.timestamp}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {activity.detail}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
