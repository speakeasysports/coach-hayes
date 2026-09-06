import type { MetadataRoute } from "next";

/**
 * The admin is already noindexed by proxy.ts, but that guard only runs on
 * routes the middleware matches — and its matcher deliberately skips image
 * files so thumbnails are not processed on every request. The handbook's
 * screenshots live under /handbook, so they need saying out loud here.
 *
 * No sitemap yet; that lands with the sitemap work.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/handbook/"],
    },
  };
}
