import { Brand } from "@/components/common/Brand";
import { ThemeControl } from "@/components/common/ThemeControl";
import { RadarScope } from "@/components/common/RadarScope";
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
          <h2>
            The web never
            <br />
            stands still.
            <br />
            <span className="text-primary">Stay in the know.</span>
          </h2>
          <RadarScope />
          <p className="text-muted text-lg max-w-sm">
            Your pages. Your priorities. Meaningful updates, all in one place.
          </p>
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

          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-muted mb-8">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
