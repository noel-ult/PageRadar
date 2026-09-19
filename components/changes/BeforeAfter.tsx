export function BeforeAfter({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Before" className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Before
        </h3>
        <p className="mt-2 text-sm text-zinc-400 line-through leading-relaxed">{before}</p>
      </section>
      <div aria-hidden="true" className="flex justify-center text-zinc-500 text-sm">
        <span>↓</span>
      </div>
      <section aria-label="After" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
          After
        </h3>
        <p className="mt-2 text-sm font-medium text-white leading-relaxed">{after}</p>
      </section>
    </div>
  );
}
