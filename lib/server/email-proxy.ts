import "server-only";

export async function forwardEmailRequest(
  request: Request,
  path: "webhook" | "unsubscribe",
) {
  const headers = new Headers();
  const type = request.headers.get("content-type") ?? "";
  if (path === "webhook" && !type.includes("application/json"))
    return Response.json({ message: "JSON required." }, { status: 415 });
  if (
    path === "unsubscribe" &&
    !type.includes("application/x-www-form-urlencoded")
  )
    return Response.json(
      { message: "Invalid unsubscribe request." },
      { status: 415 },
    );
  headers.set("content-type", type);
  for (const name of ["svix-id", "svix-timestamp", "svix-signature"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const limit = 65536;
  if (Number(request.headers.get("content-length")) > limit)
    return Response.json({ message: "Request too large." }, { status: 413 });
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ message: "Body required." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          return Response.json(
            { message: "Request too large." },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const url = new URL(
      `/email/${path}`,
      process.env.INTERNAL_API_URL ?? "http://localhost:3001/graphql",
    );
    if (path === "unsubscribe") {
      const token = new URL(request.url).searchParams.get("token");
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
        return Response.json({ message: "Invalid link." }, { status: 400 });
      url.searchParams.set("token", token);
    }
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: new Uint8Array(Buffer.concat(chunks)).buffer,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    // Never expose backend internals through public token or webhook endpoints.
    return Response.json({ ok: upstream.ok }, { status: upstream.status });
  } catch {
    return Response.json(
      { message: "Email service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
