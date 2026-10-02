"use client";

import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

let client: ApolloClient | null = null;

function logoutOnAuthErrorLink() {
  return onError(({ error }) => {
    if (!CombinedGraphQLErrors.is(error)) return;
    const unauthenticated = error.errors.some(
      (e) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.extensions?.code === "UNAUTHENTICATED" ||
        /unauthorized|unauthenticated|jwt|token/i.test(e.message ?? ""),
    );
    if (unauthenticated && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (!["/login", "/register"].includes(path)) {
        // Full reload is intentional: clears Apollo cache on session expiry.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login");
      }
    }
  });
}

export function getApolloClient(): ApolloClient {
  if (client) return client;
  const link = ApolloLink.from([
    logoutOnAuthErrorLink(),
    new HttpLink({ uri: "/graphql", credentials: "same-origin" }),
  ]);
  client = new ApolloClient({
    link,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        nextFetchPolicy: "cache-first",
        pollInterval: 10_000,
        notifyOnNetworkStatusChange: false,
        skipPollAttempt: () =>
          typeof document !== "undefined" &&
          (document.visibilityState !== "visible" || !navigator.onLine),
      },
    },
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            watches: { merge: false },
            changes: { merge: false },
          },
        },
      },
    }),
  });
  return client;
}
