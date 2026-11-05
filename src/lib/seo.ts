import { BUSINESS, CITIES, type City } from "./site-data";
import { FAQ_ITEMS } from "@/components/site/Sections";
import siteCss from "@/site.css?url";

/**
 * Set SITE_URL to the live domain once it's connected (e.g. "https://simplesurfacetx.com").
 * It makes share previews and Google's canonical links absolute.
 */
export const SITE_URL: string = "";

const abs = (path: string) => (SITE_URL ? SITE_URL.replace(/\/$/, "") + path : path);

export function pageMeta(opts: { title: string; description: string; path: string }) {
  const image = abs("/og-image.jpg");
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: image },
    ],
    links: [
      { rel: "stylesheet", href: siteCss },
      ...(SITE_URL ? [{ rel: "canonical", href: abs(opts.path) }] : []),
    ],
  };
}

/** LocalBusiness + FAQ structured data, so Google understands the business and its service area. */
export function businessJsonLd(city?: City) {
  const business = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    additionalType: "https://en.wikipedia.org/wiki/Carpet_cleaning",
    name: BUSINESS.legalName,
    description:
      "Low-moisture carpet, tile, upholstery and rug cleaning for homes and businesses. Plugs into a standard outlet, no hoses through your door, dry in hours.",
    telephone: "+1-214-562-3449",
    email: BUSINESS.email,
    image: abs("/og-image.jpg"),
    logo: abs("/brand/logo-full.png"),
    ...(SITE_URL ? { url: abs(city ? `/carpet-cleaning/${city.slug}-tx` : "/") } : {}),
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Fort Worth",
      addressRegion: "TX",
      addressCountry: "US",
    },
    areaServed: (city ? [city] : CITIES).map((c) => ({ "@type": "City", name: `${c.name}, TX` })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    sameAs: [BUSINESS.instagram, BUSINESS.facebook],
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return [
    { type: "application/ld+json", children: JSON.stringify(business) },
    { type: "application/ld+json", children: JSON.stringify(faq) },
  ];
}
