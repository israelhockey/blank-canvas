import { createFileRoute } from "@tanstack/react-router";

import { CITIES, SITE_ORIGIN, cityParam } from "@/lib/site-data";

/** /sitemap.xml — always lists the live domain, matching the canonical links. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const origin = SITE_ORIGIN;
        const paths = ["/", ...CITIES.map((c) => `/carpet-cleaning/${cityParam(c)}`)];
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
