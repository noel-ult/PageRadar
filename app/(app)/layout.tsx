"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { ME_QUERY } from "@/graphql/queries";
import { getTokenAnywhere } from "@/lib/auth";
import { Header, Sidebar } from "@/components/layout/chrome";
import { LoadingState } from "@/components/common/states";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasToken =
    typeof window !== "undefined" ? getTokenAnywhere() != null : true;

  useEffect(() => {
    if (!hasToken) router.replace("/login");
  }, [hasToken, router]);

  const { data } = useQuery(ME_QUERY, { skip: !hasToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userName = (data as any)?.me?.name as string | undefined;

  if (!hasToken) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <LoadingState message="Loading..." />
      </div>
    );
  }

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
