export const dynamic = "force-dynamic";

function apiHealthUrl() {
  const graphqlUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_GRAPHQL_URL ??
    "http://localhost:3001/graphql";

  return graphqlUrl.replace(/\/graphql\/?$/, "/health");
}

export async function GET() {
  try {
    const response = await fetch(apiHealthUrl(), {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return Response.json({ status: "unavailable", api: "unavailable" }, { status: 503 });
    }

    return Response.json({ status: "ok", api: "ok" });
  } catch {
    return Response.json({ status: "unavailable", api: "unavailable" }, { status: 503 });
  }
}
