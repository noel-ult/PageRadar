"use client";

import { useQuery } from "@apollo/client/react";
import { ME_QUERY } from "@/graphql/queries";
import { Header, Sidebar } from "@/components/layout/chrome";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useQuery<{ me: { name: string } }>(ME_QUERY);
  const userName = data?.me?.name;

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] text-zinc-100">
      <Header userName={userName} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
