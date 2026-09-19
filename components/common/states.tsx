export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-10 text-xs text-zinc-400"
    >
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300"
      />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      {description ? (
        <p className="max-w-md text-xs text-zinc-400">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-6 text-center"
    >
      <p className="text-xs font-medium text-red-300">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
