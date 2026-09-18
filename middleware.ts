import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const TOKEN_KEY = "pageradar_token";

const PROTECTED = ["/dashboard", "/watches", "/changes"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();
  const token = request.cookies.get(TOKEN_KEY)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/watches/:path*", "/changes/:path*"],
};
