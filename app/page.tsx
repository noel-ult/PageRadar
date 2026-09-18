import Link from "next/link";

const features = [
  ["01", "Watch what matters", "Add any public page and set a check interval that fits the pace of the information."],
  ["02", "See the signal", "PageRadar surfaces a clear before-and-after view instead of making you scan a full page."],
  ["03", "Act with confidence", "Prioritize deadlines, prices, eligibility, and requirements before they become surprises."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_70%_5%,rgba(45,212,191,.22),transparent_27%),radial-gradient(circle_at_20%_20%,rgba(59,130,246,.24),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-300 text-sm font-black text-slate-950">P</span>PageRadar</Link>
          <div className="flex items-center gap-3 text-sm font-medium"><Link href="/login" className="hidden text-slate-300 hover:text-white sm:block">Sign in</Link><Link href="/demo" className="rounded-full bg-white px-4 py-2 text-slate-950 shadow-lg shadow-teal-400/10 transition hover:bg-teal-100">View live demo</Link></div>
        </header>
        <section className="grid gap-12 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
          <div><p className="mb-5 inline-flex rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">Webpage intelligence, simplified</p><h1 className="max-w-xl text-5xl font-black leading-[.98] tracking-tight text-white sm:text-6xl">Know when the web changes.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">PageRadar watches the pages you rely on and makes every meaningful update easy to understand.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/demo" className="rounded-xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200">Explore the demo</Link><Link href="/register" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Create an account</Link></div><p className="mt-5 text-sm text-slate-400">No noisy alerts. Just the changes that deserve your attention.</p></div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-3 shadow-2xl shadow-black/40 backdrop-blur"><div className="rounded-[1.5rem] border border-slate-700/70 bg-[#0c1a2b] p-5"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-teal-300">Today&apos;s radar</p><p className="mt-1 text-xl font-bold text-white">3 changes need review</p></div><span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-200">Live monitoring</span></div><div className="space-y-3">{[["University admissions", "Deadline changed", "HIGH", "Jan 12 → Jan 19"], ["Pro plan pricing", "Price changed", "MEDIUM", "$49 → $39"], ["Grant programme", "Eligibility changed", "HIGH", "Residents only"]].map(([site, change, priority, value]) => <div key={site} className="flex items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-300/10 font-bold text-teal-200">↗</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{site}</p><p className="text-xs text-slate-400">{change}</p></div><div className="text-right"><p className="text-xs font-bold text-amber-200">{priority}</p><p className="mt-1 text-xs text-slate-300">{value}</p></div></div>)}</div></div></div>
        </section>
        <section className="grid gap-4 border-t border-white/10 pt-12 md:grid-cols-3">{features.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><p className="text-sm font-bold text-teal-200">{number}</p><h2 className="mt-6 text-xl font-bold text-white">{title}</h2><p className="mt-3 leading-7 text-slate-400">{description}</p></article>)}</section>
      </div>
    </main>
  );
}
