"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="panel p-8 m-6 max-w-xl">
      <p className="eyebrow mb-3">Unable to load this screen</p>
      <h1 className="text-2xl font-bold">Let’s try that again.</h1>
      <p className="text-muted mt-3">
        PageRadar could not finish loading. Retry, or return to your overview.
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/dashboard" className="btn">
          Go to overview
        </Link>
      </div>
    </section>
  );
}
