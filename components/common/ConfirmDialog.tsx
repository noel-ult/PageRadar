"use client";
import { useEffect, useRef, useId } from "react";
export function ConfirmDialog({
  open,
  title,
  description,
  busy,
  error,
  onCancel,
  onConfirm,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  busyLabel?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-ink/30 max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p id={descriptionId} className="mt-3 text-sm text-muted">
        {description}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-3">
        <button
          autoFocus
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="btn"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={onConfirm}
          className="btn btn-danger min-w-24"
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
