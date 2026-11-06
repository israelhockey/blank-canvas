import { createFileRoute } from "@tanstack/react-router";

import { ALL_PAGES, pagePath } from "@/lib/seo-pages";
import { CITIES, SITE_ORIGIN, cityParam } from "@/lib/site-data";

/** /sitemap.xml — always lists the live domain, matching the canonical links. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const origin = SITE_ORIGIN;
        const paths = [
          "/",
          ...CITIES.map((c) => `/carpet-cleaning/${cityParam(c)}`),
          "/services",
          ...ALL_PAGES.filter((p) => p.kind === "service").map(pagePath),
          "/guides",
          ...ALL_PAGES.filter((p) => p.kind === "guide").map(pagePath),
          "/privacy",
          "/terms",
        ];
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
