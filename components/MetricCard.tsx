type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
};

export default function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <span className="text-xs text-emerald-300">{trend}</span>
      </div>
    </div>
  );
}
