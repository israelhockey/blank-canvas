import { createFileRoute } from "@tanstack/react-router";

import { LOVESEAT_PHOTOS } from "@/lib/local-pages";
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
          ...ALL_PAGES.filter((p) => p.kind === "local").map(pagePath),
          "/privacy",
          "/terms",
        ];
        // Image sitemap: tell Google which photos belong to which page.
        const images = new Map<string, string[]>();
        for (const pg of ALL_PAGES)
          images.set(pagePath(pg), [pg.image, ...(pg.gallery ?? []).map((g) => g.src)]);
        images.set("/", ["/vid/hero-duplex-poster.jpg"]);
        // City pages show the hero still plus the "Recent work" photos.
        const cityImgs = ["/vid/hero-duplex-poster.jpg", ...LOVESEAT_PHOTOS.map((g) => g.src)];
        for (const c of CITIES) images.set(`/carpet-cleaning/${cityParam(c)}`, cityImgs);
        const esc = (x: string) => x.replace(/&/g, "&amp;");
        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
          paths
            .map((p) => {
              const imgs = [...new Set(images.get(p) ?? [])]
                .map(
                  (src) => `<image:image><image:loc>${esc(origin + src)}</image:loc></image:image>`,
                )
                .join("");
              return `  <url><loc>${origin}${p}</loc>${imgs}</url>`;
            })
            .join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
