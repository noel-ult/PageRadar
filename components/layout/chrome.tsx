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
    <aside className="flex w-full flex-row items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-3 md:py-6">
      <nav aria-label="Primary" className="flex flex-row gap-1 md:flex-col">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
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
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export function Header({ userName }: { userName?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <Link
        href="/dashboard"
        className="text-base font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        PageRadar
      </Link>
      <div className="text-sm text-slate-600" aria-label="Signed in user">
        {userName ?? "User"}
      </div>
    </header>
  );
}
