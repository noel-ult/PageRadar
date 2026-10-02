import { Brand } from "@/components/common/Brand";
import { ThemeControl } from "@/components/common/ThemeControl";
import { BriefPreview } from "@/components/changes/BriefPreview";
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div className="max-w-lg py-12">
          <p className="eyebrow text-primary mb-4">Your personal web radar</p>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            The next important update.
            <br />
            Already on your radar.
          </h2>
          <p className="text-muted mb-8 text-lg">
            Deadlines, opportunities, prices, and announcements. Know what
            changed without checking every page.
          </p>
          <BriefPreview />
        </div>
        <p className="text-sm text-muted">
          Watch the web. Understand the change.
        </p>
      </aside>
      <section className="auth-form">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between gap-4 mb-12">
            <div className="min-[901px]:hidden">
              <Brand compact />
            </div>
            <div className="ml-auto">
              <ThemeControl />
            </div>
          </div>
          <p className="eyebrow text-primary mb-3">Welcome to PageRadar</p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-muted mb-8">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
