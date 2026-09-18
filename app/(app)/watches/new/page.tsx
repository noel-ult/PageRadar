import Link from "next/link";
import { WatchForm } from "@/components/watches/WatchForm";

export default function NewWatchPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/watches"
        className="w-fit text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
      >
        ← Back to watches
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Add Watch</h1>
      <p className="text-sm text-slate-600">
        Add a webpage, then choose what matters. PageRadar monitors it and
        explains meaningful changes as before → after.
      </p>
      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5">
        <WatchForm />
      </div>
    </div>
  );
}
