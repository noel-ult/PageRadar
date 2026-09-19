import Link from "next/link";

const changes = [
  {
    title: "University admissions",
    change: "Deadline extended",
    priority: "High",
    diff: "Jan 12 → Jan 19",
  },
  {
    title: "Pro plan pricing",
    change: "Price reduced",
    priority: "Medium",
    diff: "$49 → $39 / mo",
  },
  {
    title: "Grant programme",
    change: "Eligibility expanded",
    priority: "High",
    diff: "All undergraduates eligible",
  },
];

const features = [
  {
    number: "01",
    title: "Watch what matters",
    description:
      "Add any public page and set a check interval that fits how often the information actually changes.",
  },
  {
    number: "02",
    title: "See the signal",
    description:
      "A clear before-and-after view shows precisely what was added or changed, without making you re-read the page.",
  },
  {
    number: "03",
    title: "Zero false noise",
    description:
      "Cookie consent popups, rotating banners, and dynamic timestamps are filtered out automatically.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        {/* Navigation */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-800 text-xs font-bold text-white">
              P
            </span>
            PageRadar
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/demo"
              className="rounded-lg bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white transition"
            >
              Live demo
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Webpage change detection
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
              Know when the web changes.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-400">
              PageRadar monitors the webpages you rely on and surfaces every meaningful update. No noisy alerts, no scanning full pages.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/demo"
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition"
              >
                Explore the demo
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
              >
                Create an account
              </Link>
            </div>
          </div>

          {/* Simple Clean Preview Card */}
          <div className="mt-14 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs font-medium text-zinc-400">Today&apos;s updates</p>
                <p className="text-sm font-semibold text-white">3 changes need review</p>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-300">
                Live monitoring
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {changes.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-400">{item.change}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-300">{item.priority}</span>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{item.diff}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-zinc-800/80 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.number} className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-6">
                <span className="text-xs font-mono font-medium text-zinc-500">{feature.number}</span>
                <h2 className="mt-3 text-base font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 py-8 text-xs text-zinc-500">
          <p>PageRadar — Clear, quiet webpage monitoring.</p>
          <p>© {new Date().getFullYear()} PageRadar</p>
        </footer>
      </div>
    </main>
  );
}

