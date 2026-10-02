"use client";

import { ApolloProvider } from "@apollo/client/react";
import { getApolloClient } from "@/lib/apollo/client";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const client = getApolloClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      // Coalesce focus, visibility and reconnect events from the same return.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState !== "visible" || !navigator.onLine) return;
        const queries = [...client.getObservableQueries("active")].filter(
          (query) =>
            query.options.context?.backgroundRefresh !== false &&
            !query.getCurrentResult().loading,
        );
        // A failure in one panel must not prevent the others from updating.
        void Promise.allSettled(queries.map((query) => query.refetch()));
      }, 150);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [client]);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
