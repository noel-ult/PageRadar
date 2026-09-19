"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { getApolloClient } from "@/lib/apollo/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/watches", label: "Watches" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    try {
      void getApolloClient().clearStore();
    } catch {
      // ignore
    }
    router.replace("/login");
  }

  return (
    <aside className="flex w-full flex-row items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950 px-4 py-3 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-3 md:py-6">
      <nav aria-label="Primary" className="flex flex-row gap-1 md:flex-col">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="md:mt-auto md:pt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-red-400 transition focus:outline-none"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export function Header({ userName }: { userName?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4 py-3.5 md:px-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-base font-semibold text-white focus:outline-none"
      >
        <span className="grid h-6 w-6 place-items-center rounded bg-zinc-800 text-xs font-bold text-white">
          P
        </span>
        PageRadar
      </Link>
      <div className="text-xs text-zinc-400" aria-label="Signed in user">
        {userName ?? "User"}
      </div>
    </header>
  );
}

