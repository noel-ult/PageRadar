"use client";

import { useQuery } from "@apollo/client/react";
import { ME_QUERY } from "@/graphql/queries";
import { Header, Sidebar } from "@/components/layout/chrome";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useQuery<{ me: { name: string } }>(ME_QUERY, {
    pollInterval: 0,
  });
  const userName = data?.me?.name;

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link btn btn-primary">
        Skip to content
      </a>
      <Sidebar />
      <div className="workspace-main">
        <Header userName={userName} />
        <main id="main-content" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
