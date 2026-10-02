import Link from "next/link";
import { Brand } from "@/components/common/Brand";
import { ThemeControl } from "@/components/common/ThemeControl";
export function PublicHeader() {
  return (
    <header className="public-nav">
      <Brand />
      <nav
        aria-label="Public"
        className="flex flex-wrap items-center gap-3 sm:gap-5"
      >
        <div className="hidden sm:block">
          <ThemeControl />
        </div>
        <Link href="/login" className="text-sm text-muted hover:text-ink">
          Sign in
        </Link>
        <Link href="/register" className="btn btn-primary btn-sm">
          Get started
        </Link>
      </nav>
    </header>
  );
}
