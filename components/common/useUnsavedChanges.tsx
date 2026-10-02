"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const permitted = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (permitted.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        permitted.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      setDestination(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  return {
    allowNavigation: () => {
      permitted.current = true;
    },
    dialog: (
      <ConfirmDialog
        open={destination !== null}
        title="Discard unsaved changes?"
        description="Your monitoring preferences have not been saved. Leaving this page will discard your edits."
        busy={false}
        confirmLabel="Discard changes"
        onCancel={() => setDestination(null)}
        onConfirm={() => {
          if (destination) {
            permitted.current = true;
            router.push(destination);
            setDestination(null);
          }
        }}
      />
    ),
  };
}
