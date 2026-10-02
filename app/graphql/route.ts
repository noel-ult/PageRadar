import { NextRequest, NextResponse } from "next/server";
import {
  parse,
  getOperationAST,
  Kind,
  type DocumentNode,
  type SelectionSetNode,
} from "graphql";

export const dynamic = "force-dynamic";
const SESSION_COOKIE = "pageradar_session";
const MAX_BODY_BYTES = 65536;
const apiUrl = () =>
  process.env.INTERNAL_API_URL ?? "http://localhost:3001/graphql";

async function readBody(request: NextRequest): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks).toString("utf8");
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

/** Consume token fields even when GraphQL clients use aliases or fragments. */
function consumeSession(
  data: unknown,
  selection: SelectionSetNode,
  document: DocumentNode,
): string | undefined {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    for (const item of data) consumeSession(item, selection, document);
    return;
  }
  const record = data as Record<string, unknown>;
  let session: string | undefined;
  for (const node of selection.selections) {
    if (node.kind === Kind.FIELD) {
      const key = node.alias?.value ?? node.name.value;
      if (
        node.name.value === "accessToken" &&
        typeof record[key] === "string" &&
        record[key] !== "session-established"
      ) {
        session = record[key] as string;
        record[key] = "session-established";
      } else if (node.selectionSet)
        session =
          consumeSession(record[key], node.selectionSet, document) ?? session;
    } else if (node.kind === Kind.INLINE_FRAGMENT)
      session = consumeSession(record, node.selectionSet, document) ?? session;
    else {
      const fragment = document.definitions.find(
        (def) =>
          def.kind === Kind.FRAGMENT_DEFINITION &&
          def.name.value === node.name.value,
      );
      if (fragment?.kind === Kind.FRAGMENT_DEFINITION)
        session =
          consumeSession(record, fragment.selectionSet, document) ?? session;
    }
  }
  return session;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (
    (origin && origin !== expectedOrigin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { errors: [{ message: "Request origin is not allowed." }] },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json(
      { errors: [{ message: "JSON requests are required." }] },
      { status: 415 },
    );
  try {
    const body = await readBody(request);
    if (body === null)
      return NextResponse.json(
        { errors: [{ message: "Request is too large." }] },
        { status: 413 },
      );
    const payload = JSON.parse(body);
    if (!payload || Array.isArray(payload) || typeof payload.query !== "string")
      throw new SyntaxError("Invalid request");
    let document: DocumentNode;
    try {
      document = parse(payload.query);
    } catch {
      throw new SyntaxError("Invalid query");
    }
    const operation = getOperationAST(document, payload.operationName);
    if (!operation) throw new SyntaxError("Operation is required");
    const headers = new Headers({ "content-type": "application/json" });
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) headers.set("authorization", `Bearer ${token}`);
    const upstream = await fetch(apiUrl(), {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const result = await upstream.json();
    const session = consumeSession(
      result.data,
      operation.selectionSet,
      document,
    );
    const response = NextResponse.json(result, { status: upstream.status });
    if (session) {
      const claims = JSON.parse(
        Buffer.from(session.split(".")[1], "base64url").toString(),
      );
      if (!Number.isFinite(claims.exp))
        throw new Error("Session expiry missing");
      response.cookies.set(SESSION_COOKIE, session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(
          0,
          Math.min(604800, claims.exp - Math.floor(Date.now() / 1000)),
        ),
      });
      response.cookies.set("pageradar_token", "", { path: "/", maxAge: 0 });
    }
    return response;
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { errors: [{ message: "Invalid GraphQL request." }] },
        { status: 400 },
      );
    return NextResponse.json(
      { errors: [{ message: "PageRadar API is temporarily unavailable." }] },
      { status: 503 },
    );
  }
}
