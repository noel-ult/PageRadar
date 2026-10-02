import Link from "next/link";
import { WatchForm } from "@/components/watches/WatchForm";
export default function NewWatchPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/watches" className="link text-sm">
        ← Monitored pages
      </Link>
      <div className="page-heading mt-6">
        <div>
          <p className="eyebrow mb-2">Build your radar</p>
          <h1>Add a page</h1>
          <p>Choose a source and tell PageRadar what to watch for.</p>
        </div>
      </div>
      <WatchForm />
    </div>
  );
}
