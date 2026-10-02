import { Icon } from "./Icon";
export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="panel flex items-center justify-center gap-3 px-5 py-12 text-sm text-muted"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-line border-t-primary"
      />
      {message}
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
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="rounded-2xl bg-accent-soft p-4 text-primary">
        <Icon name="signal" />
      </span>
      <h3 className="text-lg font-bold mt-2">{title}</h3>
      {description ? (
        <p className="text-sm text-muted max-w-md leading-relaxed">
          {description}
        </p>
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
      className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-center"
    >
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn mt-4">
          Try again
        </button>
      ) : null}
    </div>
  );
}
export function RefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 mb-5 text-sm"
    >
      <p>Updates are temporarily unavailable. Showing the last loaded data.</p>
      <button type="button" onClick={onRetry} className="btn btn-sm">
        Try again
      </button>
    </div>
  );
}
