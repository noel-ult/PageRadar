export function WatchStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/40"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
      }`}
    >
      {isActive ? "Active" : "Paused"}
    </span>
  );
}
