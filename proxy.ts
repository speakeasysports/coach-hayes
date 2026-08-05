/**
 * Optimistic auth gate for /admin. Real authorization happens inside every
 * server action (lib/admin/auth.ts) — proxy just keeps unauthenticated
 * browsers out of the admin UI, per the Next.js auth guidance.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "./lib/admin/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: "/admin/:path*",
};
