import Link from "next/link";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { BriefPreview } from "@/components/changes/BriefPreview";
import { Brand } from "@/components/common/Brand";
import { ThemeControl } from "@/components/common/ThemeControl";
import { RadarScope } from "@/components/common/RadarScope";
import { Icon } from "@/components/common/Icon";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <PublicHeader />
        <section className="landing-hero">
          <h1>
            Your internet.
            <br />
            <em>In focus.</em>
          </h1>
          <p>
            The deadline that moved. The opportunity that opened. The price that
            dropped. Know what changed, without checking every page.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-primary">
              Start monitoring <Icon name="arrow" className="size-4" />
            </Link>
            <Link href="/demo" className="btn">
              Explore the demo
            </Link>
          </div>
          <div className="hero-product">
            <BriefPreview />
            <aside className="hero-radar">
              <RadarScope />
              <h2 className="text-2xl font-bold">
                Less noise.
                <br />
                More signal.
              </h2>
              <p className="text-muted text-sm mt-3">
                Clear evidence of what changed. Context for why it matters.
              </p>
            </aside>
          </div>
        </section>
        <section className="feature-band">
          <div>
            <h2>
              Big things happen
              <br />
              <span className="text-primary">in small updates.</span>
            </h2>
            <p className="text-muted text-lg mt-6 max-w-md">
              Keep an eye on your corner of the web. PageRadar brings the
              changes worth knowing to you.
            </p>
          </div>
          <div className="feature-list">
            <article>
              <h3>Catch your next opportunity.</h3>
              <p>
                Scholarships, internships, admissions, and job openings. Keep
                track of new announcements and changing deadlines.
              </p>
            </article>
            <article>
              <h3>Stay on top of the details.</h3>
              <p>
                Follow documentation, research, government notices, and policy
                updates with a history you can revisit.
              </p>
            </article>
            <article>
              <h3>Know when the numbers move.</h3>
              <p>
                Track product prices and changing requirements. Compare the old
                information with what’s there now.
              </p>
            </article>
          </div>
        </section>
        <section className="process-section">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10">
            From a link to a little peace of mind.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              [
                "01",
                "Pick your page",
                "Paste a public webpage URL. Choose when to check it and the updates you care about.",
              ],
              [
                "02",
                "See what changed",
                "Read the summary. Compare before and after. Understand the importance of the update.",
              ],
              [
                "03",
                "Let updates come to you",
                "Enable verified email alerts for important changes, even when you’re away from PageRadar.",
              ],
            ].map(([step, title, copy]) => (
              <article className="process-step" key={step}>
                <span className="font-mono text-sm text-muted">{step}</span>
                <h3 className="text-xl font-bold mt-5">{title}</h3>
                <p className="text-muted mt-3">{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="final-call">
          <h2 className="font-bold">
            Your next important update is out there.
          </h2>
          <p className="mt-4 text-lg">Put it on your radar.</p>
          <Link href="/register" className="btn">
            Create an account <Icon name="arrow" />
          </Link>
        </section>
        <footer className="border-t border-line py-8 flex flex-wrap items-center justify-between gap-5">
          <Brand compact />
          <p className="text-sm text-muted">
            Watch the web. Understand the change.
          </p>
          <ThemeControl />
        </footer>
      </div>
    </main>
  );
}
