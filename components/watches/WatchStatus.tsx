export function WatchStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`badge ${isActive ? "badge-success" : ""}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {isActive ? "Active" : "Paused"}
    </span>
  );
}
