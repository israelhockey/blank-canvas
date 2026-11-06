import { BUSINESS, CITIES, SITE_ORIGIN, cityParam, type City } from "./site-data";
import { pagePath, type ContentPage } from "./seo-pages";
import { faqFor } from "@/components/site/Sections";
import siteCss from "@/site.css?url";

/** The live domain. Share previews, canonical links and structured data all point here. */
export const SITE_URL: string = SITE_ORIGIN;

const abs = (path: string) => (SITE_URL ? SITE_URL.replace(/\/$/, "") + path : path);

export function pageMeta(opts: { title: string; description: string; path: string }) {
  const image = abs("/og-image-v2.jpg");
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: abs(opts.path) },
      { property: "og:site_name", content: BUSINESS.brandName },
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
    "@id": `${SITE_URL}/#business`,
    name: BUSINESS.brandName,
    legalName: BUSINESS.legalName,
    alternateName: [BUSINESS.name, BUSINESS.legalName],
    description: city
      ? `Simple Surface Carpet Cleaning provides low-moisture carpet, tile, upholstery and rug cleaning in ${city.name}, TX. Plugs into a standard outlet, no hoses through your door, dry in hours.`
      : "Simple Surface Carpet Cleaning provides low-moisture carpet, tile, upholstery and rug cleaning for homes and businesses in Fort Worth and Tarrant County, TX. Plugs into a standard outlet, no hoses through your door, dry in hours.",
    telephone: "+1-214-562-3449",
    email: BUSINESS.email,
    image: abs("/og-image-v2.jpg"),
    logo: abs("/brand/logo-full.png"),
    url: abs(city ? `/carpet-cleaning/${cityParam(city)}` : "/"),
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
    mainEntity: faqFor(city).map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const out = [
    { type: "application/ld+json", children: JSON.stringify(business) },
    { type: "application/ld+json", children: JSON.stringify(faq) },
  ];
  if (city)
    out.push({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Fort Worth Carpet Cleaning", item: abs("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: `${city.name} Carpet Cleaning`,
            item: abs(`/carpet-cleaning/${cityParam(city)}`),
          },
        ],
      }),
    });
  return out;
}

/** Structured data for a service page or guide: Service/Article + FAQ + breadcrumbs. */
export function contentJsonLd(page: ContentPage) {
  const url = abs(pagePath(page));
  const main =
    page.kind === "service"
      ? {
          "@context": "https://schema.org",
          "@type": "Service",
          name: page.h1,
          serviceType: page.serviceType,
          description: page.description,
          url,
          image: abs(page.image),
          provider: { "@id": `${SITE_URL}/#business` },
          areaServed: CITIES.map((c) => ({ "@type": "City", name: `${c.name}, TX` })),
          ...(page.commercial
            ? {
                offers: {
                  "@type": "Offer",
                  priceCurrency: "USD",
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: 0.25,
                    priceCurrency: "USD",
                    unitText: "square foot",
                  },
                },
              }
            : page.lowPrice
              ? {
                  offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: "USD",
                    lowPrice: page.lowPrice,
                    highPrice: 100,
                  },
                }
              : {}),
        }
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: page.h1,
          description: page.description,
          url,
          image: abs(page.image),
          datePublished: "2026-11-06",
          dateModified: "2026-11-06",
          author: { "@type": "Organization", name: BUSINESS.brandName, url: abs("/") },
          publisher: {
            "@type": "Organization",
            name: BUSINESS.brandName,
            logo: { "@type": "ImageObject", url: abs("/brand/logo-full.png") },
          },
          mainEntityOfPage: url,
        };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: page.serviceType ?? page.h1,
        item: url,
      },
    ],
  };
  return [main, faq, crumbs].map((o) => ({
    type: "application/ld+json",
    children: JSON.stringify(o),
  }));
}
