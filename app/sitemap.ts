// Day 13 — SEO: sitemap.xml. Only genuinely public pages are listed:
// the marketing landing (+ offline fallback). Everything behind auth,
// every /share/[token] link (token = credential), and all API routes stay
// out — a sitemap must never advertise private URLs to crawlers.

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://desi-cal-ai.example.com";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/offline`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.1,
    },
  ];
}
