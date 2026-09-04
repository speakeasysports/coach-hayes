/**
 * Next.js 16 renamed Middleware to Proxy. Same API, file must be at the
 * project root alongside app/.
 *
 * This is an OPTIMISTIC check only — it redirects unauthenticated requests
 * away from /admin. Every admin route independently calls requireSession()
 * because the Next docs are explicit that proxy is not a complete
 * authorization solution.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  // Preserve intent so login can bounce back to where they were headed.
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/admin/:path*",
};
