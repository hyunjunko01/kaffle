import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminKakaoId } from "@/lib/admin/allowlist";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session-token";

const PUBLIC_PREFIXES = ["/login", "/auth/", "/.well-known/", "/api/"];

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return false;
  }
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    return authorizeAdmin(request);
  }

  return authorizeUser(request);
}

async function authorizeAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const login = new URL("/login", request.url);

  if (!token || !secret) {
    return NextResponse.redirect(login);
  }

  try {
    const session = await verifySession(token, secret);
    if (!isAdminKakaoId(session.kakaoId)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(login);
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }
}

async function authorizeUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const login = new URL("/login", request.url);

  if (!token || !secret) {
    return NextResponse.redirect(login);
  }

  try {
    await verifySession(token, secret);
    return NextResponse.next();
  } catch {
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
