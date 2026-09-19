"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { CREATE_WATCH_MUTATION } from "@/graphql/mutations";
import { InterestSelector } from "./InterestSelector";
import { friendlyErrorMessage } from "@/lib/format";

export function WatchForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState<number | string>(15);
  const [interests, setInterests] = useState<string[]>(["DEADLINE", "STATUS"]);
  const [formError, setFormError] = useState<string | null>(null);
  const [createWatch, { loading }] = useMutation(CREATE_WATCH_MUTATION);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !url.trim()) {
      setFormError("Watch name and website URL are required.");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setFormError("Please enter a valid URL, e.g. https://example.com/admissions.");
      return;
    }
    const parsedInterval = Number(interval);
    if (!parsedInterval || parsedInterval < 1) {
      setFormError("Monitoring interval must be at least 1 minute.");
      return;
    }
    if (interests.length === 0) {
      setFormError("Select at least one type of information to monitor.");
      return;
    }
    try {
      const { data } = await createWatch({
        variables: {
          input: {
            title: name.trim(),
            url: url.trim(),
            checkInterval: parsedInterval,
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (data as any)?.createWatch?.id as string | undefined;
      if (!id) {
        setFormError("Watch was created but no ID was returned.");
        return;
      }
      router.replace(`/watches/${id}`);
    } catch (err) {
      setFormError(friendlyErrorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="watch-name" className="text-xs font-medium text-zinc-300">
          Watch Name
        </label>
        <input
          id="watch-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. University admissions page"
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="watch-url" className="text-xs font-medium text-zinc-300">
          Website URL
        </label>
        <input
          id="watch-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/admissions"
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="watch-interval" className="text-xs font-medium text-zinc-300">
          Check interval (minutes)
        </label>
        <input
          id="watch-interval"
          type="number"
          min={1}
          max={43200}
          value={interval}
          onChange={(e) =>
            setInterval(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-40 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
        />
      </div>
      <InterestSelector selected={interests} onChange={setInterests} />
      {formError ? (
        <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300">
          {formError}
        </div>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition focus:outline-none"
        >
          {loading ? "Creating watch..." : "Create Watch"}
        </button>
      </div>
    </form>
  );
}
