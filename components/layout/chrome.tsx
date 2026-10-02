"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { clearToken } from "@/lib/auth";
import { getApolloClient } from "@/lib/apollo/client";
import {
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
} from "@/graphql/mutations";
import { NOTIFICATIONS_QUERY } from "@/graphql/queries";
import { formatDateTime } from "@/lib/format";
import { RefreshError } from "@/components/common/states";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/watches", label: "Watches" },
  { href: "/notifications", label: "Notifications" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await clearToken();
      await getApolloClient().clearStore();
      router.replace("/login");
    } catch {
      setLogoutError("Unable to sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
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
        {logoutError ? (
          <p role="alert" className="px-3 text-xs text-red-300">
            {logoutError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-red-400 transition focus:outline-none"
        >
          {signingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </aside>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, refetch } = useQuery(NOTIFICATIONS_QUERY, {
    pollInterval: 15_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadNotificationCount ?? 0;
  const [markAllRead, markState] = useMutation(
    MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  );
  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  async function readAll() {
    try {
      await markAllRead();
      await refetch();
    } catch {
      setNotificationError("Unable to mark alerts read. Try again.");
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open)
            void refetch().catch(() =>
              setNotificationError("Unable to load alerts. Try again."),
            );
        }}
        aria-label="View notifications"
        aria-expanded={open}
        className="relative rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-bold text-zinc-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Notifications
            </h3>
            <button
              type="button"
              disabled={markState.loading || !unreadCount}
              onClick={() => void readAll()}
              className="text-xs text-teal-300 disabled:text-zinc-500"
            >
              Mark all read
            </button>
          </div>
          {error && data ? (
            <RefreshError
              onRetry={() => {
                void refetch().catch(() => {});
              }}
            />
          ) : null}
          {notificationError || (error && !data) ? (
            <p role="alert" className="p-3 text-xs text-red-300">
              {notificationError ?? "Unable to load alerts. Try again."}
            </p>
          ) : null}
          {loading && !data ? (
            <p role="status" className="p-3 text-xs">
              Loading alerts…
            </p>
          ) : null}
          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-900">
            {data && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                No notifications yet. You will be alerted when monitored pages
                change.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-zinc-900/50 transition"
                >
                  <p
                    className={`text-xs leading-snug ${item.readAt ? "text-zinc-400" : "text-zinc-100"}`}
                  >
                    {!item.readAt ? "Unread · " : ""}
                    {item.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{formatDateTime(item.createdAt)}</span>
                    {item.changeId ? (
                      <Link
                        href={`/changes/${item.changeId}`}
                        onClick={() => {
                          setOpen(false);
                          void markRead({ variables: { id: item.id } })
                            .then(() => refetch())
                            .catch(() =>
                              setNotificationError(
                                "Unable to mark alert read.",
                              ),
                            );
                        }}
                        className="text-teal-400 hover:text-teal-300 underline transition"
                      >
                        View diff →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
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
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="text-xs text-zinc-400" aria-label="Signed in user">
          {userName ?? "User"}
        </div>
      </div>
    </header>
  );
}
