export function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Before" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Before
        </h3>
        <p className="mt-1 text-base text-slate-800">{before}</p>
      </section>
      <div aria-hidden="true" className="flex justify-center text-slate-400">
        <span className="text-xl">↓</span>
      </div>
      <section aria-label="After" className="rounded-lg border border-slate-900/10 bg-white p-4 ring-1 ring-slate-900/5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          After
        </h3>
        <p className="mt-1 text-base font-medium text-slate-900">{after}</p>
      </section>
    </div>
  );
}
