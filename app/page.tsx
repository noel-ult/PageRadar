import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { BriefPreview } from "@/components/changes/BriefPreview";
import { Brand } from "@/components/common/Brand";
import { ThemeControl } from "@/components/common/ThemeControl";
import { Icon, type IconName } from "@/components/common/Icon";
const uses: { title: string; copy: string; icon: IconName }[] = [
  {
    title: "Opportunities",
    copy: "Scholarships, admissions, internships, and jobs. Follow the next opening or deadline.",
    icon: "pages",
  },
  {
    title: "Research & updates",
    copy: "New papers, documentation, college notices, and government announcements.",
    icon: "globe",
  },
  {
    title: "Products & policies",
    copy: "Track prices, requirements, and policy updates that affect your decisions.",
    icon: "signal",
  },
];
export default function Home() {
  return (
    <main className="overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <PublicHeader />
        <section className="marketing-grid">
          <div>
            <p className="eyebrow text-primary mb-6 inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Your personal radar for the web
            </p>
            <h1 className="marketing-title">
              The web moves.
              <br />
              <span className="text-primary">You stay ahead.</span>
            </h1>
            <p className="mt-6 text-lg text-muted max-w-lg leading-relaxed">
              Follow the pages that matter to you. PageRadar watches for
              meaningful changes and tells you what happened, and why it
              matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Start monitoring
                <Icon name="arrow" className="size-4" />
              </Link>
              <Link href="/demo" className="btn">
                Explore the demo
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              Before and after evidence. Clear importance. Email alerts.
            </p>
          </div>
          <div className="radar-backdrop">
            <BriefPreview />
          </div>
        </section>
        <section className="border-y border-line py-10">
          <p className="eyebrow text-center mb-6">
            For everything you don’t want to miss
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {uses.map((item) => (
              <article key={item.title} className="flex gap-4">
                <span className="bg-accent-soft text-primary rounded-xl p-3 h-fit">
                  <Icon name={item.icon} />
                </span>
                <div>
                  <h2 className="font-bold">{item.title}</h2>
                  <p className="text-muted text-sm mt-2 leading-relaxed">
                    {item.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="py-20">
          <div className="max-w-xl mb-10">
            <p className="eyebrow text-primary mb-3">
              From a webpage to a useful update
            </p>
            <h2 className="display text-3xl sm:text-4xl font-bold">
              Less checking.
              <br />
              More knowing.
            </h2>
            <p className="mt-4 text-muted">
              A page change is only useful when you understand it. PageRadar
              connects the update to the evidence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                title: "Add a page",
                copy: "Paste a public webpage URL. Choose how often to check it and which changes you care about.",
              },
              {
                step: "02",
                title: "Understand the change",
                copy: "See the changed section, previous and current values, importance, and a plain-language explanation.",
              },
              {
                step: "03",
                title: "Get the update",
                copy: "Review the timeline or enable verified email alerts to receive changes that match your preferences.",
              },
            ].map((item) => (
              <article key={item.step} className="panel p-7">
                <span className="text-primary font-mono text-sm">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold mt-5">{item.title}</h3>
                <p className="text-muted mt-3 text-sm leading-relaxed">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-accent-soft p-8 sm:p-12 flex flex-wrap items-center justify-between gap-6 mb-16">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Put your important pages on the radar.
            </h2>
            <p className="text-muted mt-3">
              Start with one page. Let PageRadar keep an eye on it.
            </p>
          </div>
          <Link href="/register" className="btn btn-primary">
            Create an account
            <Icon name="arrow" className="size-4" />
          </Link>
        </section>
        <footer className="border-t border-line py-8 flex flex-wrap items-center justify-between gap-5">
          <Brand compact />
          <p className="text-sm text-muted">
            Meaningful changes. Clear evidence.
          </p>
          <ThemeControl />
        </footer>
      </div>
    </main>
  );
}
