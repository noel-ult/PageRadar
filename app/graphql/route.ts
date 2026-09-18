export const dynamic = "force-dynamic";

function apiUrl() {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_GRAPHQL_URL ??
    "http://localhost:3001/graphql"
  );
}

async function proxy(request: Request) {
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(apiUrl(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { errors: [{ message: "PageRadar API is temporarily unavailable." }] },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
