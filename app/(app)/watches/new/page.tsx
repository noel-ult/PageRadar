import Link from "next/link";
import { WatchForm } from "@/components/watches/WatchForm";

export default function NewWatchPage() {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <Link
        href="/watches"
        className="w-fit text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
      >
        ← Back to watches
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Add Watch</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Add a webpage to monitor. PageRadar periodically checks for changes and highlights what changed.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
        <WatchForm />
      </div>
    </div>
  );
}

