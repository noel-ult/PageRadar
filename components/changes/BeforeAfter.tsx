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
        <mark className="rounded px-0.5 text-inherit">
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
      <section aria-label="Before" className="evidence evidence-before p-5">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
          Before
        </h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-muted">
          {highlight(before, after)}
        </p>
      </section>
      <section aria-label="After" className="evidence evidence-after p-5">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted">
          After
        </h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-ink">
          {highlight(after, before)}
        </p>
      </section>
    </div>
  );
}
