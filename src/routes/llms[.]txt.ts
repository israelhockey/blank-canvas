import { createFileRoute } from "@tanstack/react-router";

import { ALL_PAGES, pagePath } from "@/lib/seo-pages";
import { BUSINESS, CITIES, SITE_ORIGIN, cityParam } from "@/lib/site-data";

/**
 * /llms.txt: a plain-text summary for AI assistants (ChatGPT, Perplexity, Google AI answers)
 * so they can describe the business and its prices correctly and link to the right page.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => {
        const o = SITE_ORIGIN;
        const list = (kind: "service" | "guide") =>
          ALL_PAGES.filter((p) => p.kind === kind)
            .map((p) => `- [${p.h1}](${o}${pagePath(p)}): ${p.description}`)
            .join("\n");
        const body = `# ${BUSINESS.brandName}

> Low-moisture carpet, upholstery, rug and tile cleaning for homes and businesses in Fort Worth and Tarrant County, Texas. Portable equipment plugs into a standard wall outlet (no truck hoses through the door), and carpet is usually dry in a few hours. Flat prices, no deposit, pay after the job.

- Phone and text: ${BUSINESS.phoneDisplay}
- Email: ${BUSINESS.email}
- Hours: Monday to Saturday, 9am to 6pm, with 2-hour arrival windows
- Booking: online at ${o}/#book, or by phone or text
- Guarantee: We will come out and touch up or spot clean anything that doesn't look right to you after we are gone!

## Prices (flat, plus 8.25% Texas sales tax)

- Carpet: $50 per room; $100 for a master suite
- Sofa or sectional: $100; recliner, armchair or loveseat: $50
- Area rugs: $50 standard; $100 oversize
- Commercial carpet and gym floors: $0.25 per square foot, with a free walkthrough
- No deposit and no trip charge in the service area; payment after the job

## Service area

${CITIES.map((c) => `- [Carpet cleaning in ${c.name}, TX](${o}/carpet-cleaning/${cityParam(c)})`).join("\n")}

## Services

${list("service")}

## Guides

${list("guide")}
`;
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
