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
  const [interval, setInterval] = useState(60);
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
            checkInterval: Number(interval) * 60,
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
      <div className="flex flex-col gap-1">
        <label htmlFor="watch-name" className="text-sm font-medium text-slate-700">
          Watch Name
        </label>
        <input
          id="watch-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. University admissions page"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="watch-url" className="text-sm font-medium text-slate-700">
          Website URL
        </label>
        <input
          id="watch-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/admissions"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="watch-interval" className="text-sm font-medium text-slate-700">
          Monitoring Interval (minutes)
        </label>
        <input
          id="watch-interval"
          type="number"
          min={5}
          max={1440}
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        />
      </div>
      <InterestSelector selected={interests} onChange={setInterests} />
      {formError ? (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
        >
          {loading ? "Creating watch..." : "Create Watch"}
        </button>
      </div>
    </form>
  );
}
