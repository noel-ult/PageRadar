"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import {
  CREATE_WATCH_MUTATION,
  UPDATE_WATCH_MUTATION,
  PREVIEW_WATCH_MUTATION,
} from "@/graphql/mutations";
import type { Watch } from "@/lib/types";
import type { InterestType } from "@/graphql/generated";
import { InterestSelector } from "./InterestSelector";
import { friendlyErrorMessage } from "@/lib/format";

export function WatchForm({ watch }: { watch?: Watch }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(watch?.name ?? "");
  const [url, setUrl] = useState(watch?.url ?? "");
  const [interval, setInterval] = useState<number | string>(
    watch?.checkIntervalMinutes ?? 360,
  );
  const [interests, setInterests] = useState<string[]>(watch?.interests ?? []);
  const [minimumImportance, setMinimumImportance] = useState(
    watch?.minimumImportance ?? 35,
  );
  const [emailEnabled, setEmailEnabled] = useState(watch?.emailEnabled ?? true);
  const [includeSelector, setIncludeSelector] = useState(
    watch?.includeSelector ?? "",
  );
  const [excludeSelector, setExcludeSelector] = useState(
    watch?.excludeSelector ?? "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [createWatch, createState] = useMutation(CREATE_WATCH_MUTATION);
  const [updateWatch, updateState] = useMutation(UPDATE_WATCH_MUTATION);
  const [preview, previewState] = useMutation(PREVIEW_WATCH_MUTATION);
  const busy =
    createState.loading || updateState.loading || previewState.loading;
  const input = {
    title: name.trim(),
    url: url.trim(),
    checkInterval: Number(interval),
    interests: interests as InterestType[],
    minimumImportance,
    emailEnabled,
    includeSelector: includeSelector.trim() || null,
    excludeSelector: excludeSelector.trim() || null,
  };
  function validate() {
    let message = "";
    let field = "watch-name";
    if (!name.trim()) message = "Enter a watch name.";
    else {
      field = "watch-url";
      try {
        if (!["http:", "https:"].includes(new URL(url.trim()).protocol))
          throw new Error();
      } catch {
        message = "Enter a full HTTP or HTTPS URL.";
      }
      if (
        !message &&
        (!Number.isInteger(Number(interval)) ||
          Number(interval) < 1 ||
          Number(interval) > 43200)
      ) {
        field = "watch-interval";
        message = "Enter an interval from 1 to 43200 whole minutes.";
      }
    }
    if (message) {
      setFormError(message);
      formRef.current?.querySelector<HTMLElement>(`#${field}`)?.focus();
      return false;
    }
    return true;
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!validate()) return;
    try {
      if (watch) {
        await updateWatch({ variables: { id: watch.id, input } });
        router.replace(`/watches/${watch.id}`);
      } else {
        const { data } = await createWatch({ variables: { input } });
        if (!data?.createWatch.id)
          throw new Error("Unable to create watch. Try again.");
        router.replace(`/watches/${data.createWatch.id}`);
      }
    } catch (error) {
      setFormError(friendlyErrorMessage(error));
    }
  }
  async function showPreview() {
    if (busy) return;
    setFormError(null);
    if (!validate()) return;
    try {
      const { data } = await preview({ variables: { input } });
      setPreviewText(data?.previewWatch.text ?? null);
    } catch (error) {
      setFormError(friendlyErrorMessage(error));
    }
  }
  const fieldClass =
    "rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-teal-400 focus:outline-none";
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-describedby={formError ? "watch-error" : undefined}
    >
      <label className="grid gap-2 text-sm" htmlFor="watch-name">
        Watch name
        <input
          id="watch-name"
          maxLength={200}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scholarship portal"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-2 text-sm" htmlFor="watch-url">
        Website URL
        <input
          id="watch-url"
          type="url"
          maxLength={2048}
          required
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreviewText(null);
          }}
          placeholder="https://example.com/scholarships"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-2 text-sm" htmlFor="watch-interval">
        Check interval (minutes)
        <input
          id="watch-interval"
          type="number"
          min={1}
          max={43200}
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className={`${fieldClass} w-40`}
        />
        <span className="text-xs text-zinc-400">
          360 minutes = every 6 hours.
        </span>
      </label>
      <div>
        <InterestSelector selected={interests} onChange={setInterests} />
        <p className="mt-2 text-xs text-zinc-400">
          Leave all categories unchecked to receive all meaningful changes.
        </p>
      </div>
      <label className="grid gap-2 text-sm" htmlFor="watch-importance">
        Minimum alert importance: {minimumImportance}/100
        <input
          id="watch-importance"
          type="range"
          min={0}
          max={100}
          value={minimumImportance}
          onChange={(e) => setMinimumImportance(Number(e.target.value))}
          className="accent-teal-400"
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(e) => setEmailEnabled(e.target.checked)}
          className="accent-teal-400"
        />
        Send email alerts when email delivery is available
      </label>
      <details className="rounded-lg border border-zinc-800 p-4">
        <summary className="cursor-pointer text-sm">
          Choose page sections
        </summary>
        <p className="my-3 text-xs text-zinc-400">
          Optional CSS selectors let you watch a specific section or exclude
          changing counters. Preview the extracted content before saving.
        </p>
        <div className="grid gap-3">
          <label className="grid gap-2 text-xs" htmlFor="watch-include">
            Include selector
            <input
              id="watch-include"
              value={includeSelector}
              maxLength={300}
              onChange={(e) => {
                setIncludeSelector(e.target.value);
                setPreviewText(null);
              }}
              placeholder="main, #announcements"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-xs" htmlFor="watch-exclude">
            Exclude selector
            <input
              id="watch-exclude"
              value={excludeSelector}
              maxLength={300}
              onChange={(e) => {
                setExcludeSelector(e.target.value);
                setPreviewText(null);
              }}
              placeholder=".visitor-counter"
              className={fieldClass}
            />
          </label>
        </div>
      </details>
      {watch ? (
        <p className="text-xs text-zinc-400">
          Changing the URL or selected sections starts a new baseline. Earlier
          history stays available.
        </p>
      ) : null}
      {formError ? (
        <p
          id="watch-error"
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300"
        >
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          aria-busy={createState.loading || updateState.loading}
          className="min-w-36 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {createState.loading || updateState.loading
            ? "Saving…"
            : watch
              ? "Save changes"
              : "Create watch"}
        </button>
        <button
          type="button"
          onClick={() => void showPreview()}
          disabled={busy}
          className="min-w-40 rounded-lg border border-zinc-700 px-4 py-2 text-sm disabled:opacity-50"
        >
          {previewState.loading ? "Loading preview…" : "Preview content"}
        </button>
        <Link
          href={watch ? `/watches/${watch.id}` : "/watches"}
          className="px-4 py-2 text-sm text-zinc-400"
        >
          Cancel
        </Link>
      </div>
      {previewText ? (
        <section
          aria-label="Content preview"
          className="rounded-lg border border-zinc-800 p-4"
        >
          <h2 className="mb-3 text-sm font-semibold">Content preview</h2>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-300">
            {previewText}
          </pre>
        </section>
      ) : null}
    </form>
  );
}
