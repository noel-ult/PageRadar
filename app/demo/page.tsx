import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { BriefPreview } from "@/components/changes/BriefPreview";
import { ThemeControl } from "@/components/common/ThemeControl";
export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
      <PublicHeader />
      <div className="page-heading mt-10">
        <div>
          <p className="eyebrow mb-2">Explore PageRadar</p>
          <h1>A clearer view of what changed.</h1>
          <p>Select an example to see its summary and supporting evidence.</p>
        </div>
        <span className="badge badge-primary">Interactive demo</span>
      </div>
      <div className="rounded-xl border border-line bg-subtle p-4 mb-8 text-sm text-muted">
        This demo uses sample data. Create an account to monitor real webpages.
      </div>
      <BriefPreview interactive />
      <div className="flex flex-wrap justify-between items-center gap-4 mt-8">
        <Link href="/register" className="btn btn-primary">
          Monitor your first page →
        </Link>
        <ThemeControl />
      </div>
    </main>
  );
}
