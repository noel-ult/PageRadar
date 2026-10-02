import { NextRequest, NextResponse } from "next/server";
export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    (origin &&
      origin !== (process.env.APP_ORIGIN ?? new URL(request.url).origin)) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const response = NextResponse.json({ success: true });
  response.cookies.set("pageradar_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("pageradar_token", "", { path: "/", maxAge: 0 });
  return response;
}
