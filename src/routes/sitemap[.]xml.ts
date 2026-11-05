import { createFileRoute } from "@tanstack/react-router";

import { CITIES, cityParam } from "@/lib/site-data";

/** /sitemap.xml — built from the request's own domain, so it works on any connected domain. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
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
