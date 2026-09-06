/**
 * Next.js 16 renamed Middleware to Proxy. Same API, file must be at the
 * project root alongside app/.
 *
 * Two concerns, in order:
 *
 *   1. INDEXABILITY. Any host that isn't the canonical domain — vercel.app
 *      deployment URLs, per-commit previews, staging — gets X-Robots-Tag
 *      noindex. Those hosts serve identical content whose canonical tags
 *      point at the real domain, so indexing them creates duplicate content
 *      aimed at a URL that may serve something else entirely mid-migration.
 *
 *      Deliberately a header and NOT a robots.txt Disallow: disallowing the
 *      crawl stops Google from ever reading the noindex, so pages already in
 *      the index can linger indefinitely. The header is the instrument that
 *      actually removes them.
 *
 *   2. ADMIN AUTH. An OPTIMISTIC check only — every admin route and server
 *      action independently calls requireSession(), because the Next docs are
 *      explicit that proxy is not a complete authorization solution.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import { isCanonicalHost } from "@/lib/site";

const NOINDEX = "noindex, nofollow";

function withIndexGuard(res: NextResponse, request: NextRequest): NextResponse {
  const host = request.headers.get("host");
  // The admin is never indexable, on any host.
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  if (isAdmin || !isCanonicalHost(host)) {
    res.headers.set("X-Robots-Tag", NOINDEX);
  }
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return withIndexGuard(NextResponse.next(), request);
  }

  if (pathname === "/admin/login") {
    return withIndexGuard(NextResponse.next(), request);
  }

  const ok = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (ok) return withIndexGuard(NextResponse.next(), request);

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  // Preserve intent so login can bounce back to where they were headed.
  url.searchParams.set("next", pathname);
  return withIndexGuard(NextResponse.redirect(url), request);
}

export const config = {
  // Everything except static assets — the guard has to reach real pages, not
  // just /admin as before.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
