// Day 13 — SEO: robots.txt. Auth-gated pages are noindexed by the layout's
// metadata instead; the crawler rules below are the coarse public/private
// split. Private/share-token URLs are excluded from the sitemap entirely.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://desi-cal-ai.example.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/track",
          "/dashboard",
          "/history",
          "/charts",
          "/goals",
          "/dishes",
          "/share",
          "/billing",
          "/profile",
          "/admin",
          "/login",
          "/signup",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
