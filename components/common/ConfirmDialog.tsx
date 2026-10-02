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
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
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
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-zinc-700 bg-zinc-950 p-6 text-zinc-100 backdrop:bg-black/70"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p id={descriptionId} className="mt-3 text-sm text-zinc-400">
        {description}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-3">
        <button
          autoFocus
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={onConfirm}
          className="min-w-24 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
