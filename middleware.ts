import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const PUBLIC_PREFIXES = ["/login", "/auth/", "/.well-known/", "/api/"];

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return false;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }

  try {
    await verifySession(token, secret);
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    const response = NextResponse.redirect(login);
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
