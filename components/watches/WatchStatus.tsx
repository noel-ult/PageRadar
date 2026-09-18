export function WatchStatusBadge({ isActive }: { isActive: boolean }) {
  const active = isActive;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        active
          ? "bg-green-50 text-green-700 ring-green-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {active ? "Active" : "Paused"}
    </span>
  );
}
