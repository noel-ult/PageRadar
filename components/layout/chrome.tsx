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
import { Brand } from "@/components/common/Brand";
import { Icon, type IconName } from "@/components/common/Icon";
import { ThemeControl } from "@/components/common/ThemeControl";
const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/watches", label: "Monitored pages", icon: "pages" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  {
    href: "/notifications/settings",
    label: "Notification settings",
    icon: "settings",
  },
];
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="grid gap-1">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="nav-link"
          aria-current={
            pathname === item.href ||
            (item.href === "/watches" && pathname.startsWith("/watches/"))
              ? "page"
              : undefined
          }
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await clearToken();
      await getApolloClient().clearStore();
      router.replace("/login");
    } catch {
      setError("Unable to sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {error ? (
        <p role="alert" className="text-sm text-danger mb-2">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="nav-link w-full"
        disabled={busy}
        onClick={() => void logout()}
      >
        <Icon name="logout" />
        {busy ? "Signing out…" : "Log out"}
      </button>
    </div>
  );
}
export function Sidebar() {
  return (
    <aside className="workspace-sidebar">
      <div className="px-2">
        <Brand href="/dashboard" />
      </div>
      <p className="eyebrow px-3 mt-12 mb-3">Workspace</p>
      <Navigation />
      <div className="mt-auto pt-8">
        <div className="border-t border-line pt-5 px-3 mb-5">
          <Icon name="signal" className="text-primary mb-3" />
          <p className="text-sm text-muted">
            Monitoring the web for what matters to you.
          </p>
        </div>
        <SignOut />
      </div>
    </aside>
  );
}
export function MobileNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <div className="min-[901px]:hidden">
      <button
        ref={trigger}
        type="button"
        className="btn p-2"
        aria-label="Open navigation"
        onClick={() => dialog.current?.showModal()}
      >
        <Icon name="menu" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="navigation-title"
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(320px,100vw)] border-l border-line bg-surface text-ink p-5 backdrop:bg-ink/30"
        onClose={() => trigger.current?.focus()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 id="navigation-title" className="font-bold">
            Your workspace
          </h2>
          <button
            type="button"
            autoFocus
            className="btn p-2"
            aria-label="Close navigation"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        <Navigation onNavigate={close} />
        <div className="mt-8 grid gap-5">
          <ThemeControl />
          <SignOut />
        </div>
      </dialog>
    </div>
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
        className="relative btn p-2 text-muted"
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
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Notifications
            </h3>
            <button
              type="button"
              disabled={markState.loading || !unreadCount}
              onClick={() => void readAll()}
              className="text-sm text-primary disabled:text-muted"
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
            <p role="alert" className="p-3 text-sm text-danger">
              {notificationError ?? "Unable to load alerts. Try again."}
            </p>
          ) : null}
          {loading && !data ? (
            <p role="status" className="p-3 text-xs">
              Loading alerts…
            </p>
          ) : null}
          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {data && notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">
                No notifications yet. You will be alerted when monitored pages
                change.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-surface transition"
                >
                  <p
                    className={`text-xs leading-snug ${item.readAt ? "text-muted" : "text-ink"}`}
                  >
                    {!item.readAt ? "Unread · " : ""}
                    {item.message}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
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
                        className="text-primary hover:text-primary underline transition"
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
  const pathname = usePathname();
  const label = pathname.startsWith("/changes/")
    ? "Change details"
    : pathname.includes("/edit")
      ? "Edit page"
      : pathname === "/watches/new"
        ? "Add page"
        : (NAV.find((item) => item.href === pathname)?.label ?? "Page details");
  return (
    <header className="workspace-header">
      <div className="flex items-center gap-3">
        <MobileNavigation />
        <div className="min-[901px]:hidden">
          <Brand href="/dashboard" compact />
        </div>
        <p className="hidden min-[901px]:block text-sm text-muted">
          Your workspace <span className="mx-3 text-line">/</span>
          <span className="text-ink font-semibold">{label}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <ThemeControl />
        </div>
        <NotificationBell />
        <div
          className="hidden min-[901px]:flex items-center gap-2 text-sm"
          aria-label="Signed in user"
        >
          <span className="grid place-items-center size-8 rounded-full bg-accent-soft text-primary font-bold">
            {userName?.slice(0, 1).toUpperCase() ?? "P"}
          </span>
          <span className="max-w-48 truncate">
            {userName ?? "Your account"}
          </span>
        </div>
      </div>
    </header>
  );
}
