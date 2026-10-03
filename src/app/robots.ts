import type { MetadataRoute } from "next";

/** Only the public pages are for search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/onboarding", "/api/"] },
  };
}
