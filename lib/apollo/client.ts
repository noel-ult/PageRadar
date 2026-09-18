"use client";

import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GRAPHQL_URL } from "@/lib/types";
import { getToken } from "@/lib/auth";

let client: ApolloClient | null = null;

function authLink() {
  return new ApolloLink((operation, forward) => {
    const token = getToken();
    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }));
    return forward(operation);
  });
}

function logoutOnAuthErrorLink() {
  return onError(({ error }) => {
    if (!CombinedGraphQLErrors.is(error)) return;
    const unauthenticated = error.errors.some(
      (e) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.extensions?.code === "UNAUTHENTICATED" ||
        /unauthorized|unauthenticated|jwt|token/i.test(e.message ?? "")
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
    authLink(),
    new HttpLink({ uri: GRAPHQL_URL }),
  ]);
  client = new ApolloClient({
    link,
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
