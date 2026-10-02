"use client";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@apollo/client/react";
import { WATCH_QUERY } from "@/graphql/queries";
import { WatchForm } from "@/components/watches/WatchForm";
import { LoadingState, ErrorState } from "@/components/common/states";
export default function EditWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useQuery(WATCH_QUERY, {
    variables: { id },
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    pollInterval: 0,
    context: { backgroundRefresh: false },
  });
  if (loading) return <LoadingState message="Loading watch settings…" />;
  if (error || !data?.watch)
    return (
      <ErrorState
        message="Unable to load watch settings."
        onRetry={() => void refetch()}
      />
    );
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href={`/watches/${id}`} className="link text-sm">
        ← Back to page
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-2">Monitoring preferences</p>
          <h1>Edit page</h1>
          <p>Adjust your source, check frequency, and alerts.</p>
        </div>
      </div>
      <WatchForm key={data.watch.id} watch={data.watch} />
    </div>
  );
}
