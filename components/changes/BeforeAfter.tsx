function highlight(text: string, other: string) {
  let prefix = 0;
  while (
    prefix < text.length &&
    prefix < other.length &&
    text[prefix] === other[prefix]
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < text.length - prefix &&
    suffix < other.length - prefix &&
    text[text.length - 1 - suffix] === other[other.length - 1 - suffix]
  )
    suffix++;
  const end = text.length - suffix;
  return (
    <>
      {text.slice(0, prefix)}
      {end > prefix ? (
        <mark className="rounded bg-teal-400/20 px-0.5 text-inherit">
          {text.slice(prefix, end)}
        </mark>
      ) : null}
      {text.slice(end)}
    </>
  );
}
export function BeforeAfter({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section
        aria-label="Before"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
      >
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Before
        </h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-400">
          {highlight(before, after)}
        </p>
      </section>
      <section
        aria-label="After"
        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
          After
        </h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white">
          {highlight(after, before)}
        </p>
      </section>
    </div>
  );
}
