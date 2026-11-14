import { BUSINESS, CITIES, SITE_ORIGIN, cityParam, type City } from "./site-data";
import { cityOf, pagePath, type ContentPage } from "./seo-pages";
import { faqFor } from "@/components/site/Sections";
import siteCss from "@/site.css?url";

/** The live domain. Share previews, canonical links and structured data all point here. */
export const SITE_URL: string = SITE_ORIGIN;

const abs = (path: string) => (SITE_URL ? SITE_URL.replace(/\/$/, "") + path : path);

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  /** Home and city pages: fetch the hero still first so the top of the page paints fast. */
  hero?: boolean;
}) {
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
      ...(opts.hero
        ? [
            {
              rel: "preload",
              as: "image",
              href: "/vid/hero-duplex-poster.jpg",
              fetchPriority: "high" as const,
            },
          ]
        : []),
    ],
  };
}

/** LocalBusiness + FAQ structured data, so Google understands the business and its service area. */
const PRICE_LIST: [string, number, string?][] = [
  ["Carpet cleaning, per room", 50, "room"],
  ["Master suite carpet cleaning", 100],
  ["Sofa or sectional cleaning", 100],
  ["Recliner, armchair or loveseat cleaning", 50],
  ["Standard area rug cleaning", 50],
  ["Oversize area rug cleaning", 100],
  ["Commercial carpet cleaning, per square foot", 0.25, "square foot"],
];

/** Services and Guides hub pages: a list of the pages plus breadcrumbs. */
export function hubJsonLd(opts: {
  title: string;
  path: string;
  pages: { h1: string; path: string }[];
}) {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: opts.title,
      url: abs(opts.path),
      isPartOf: { "@id": `${SITE_URL}/#business` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: opts.pages.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.h1,
          url: abs(p.path),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
        { "@type": "ListItem", position: 2, name: opts.title, item: abs(opts.path) },
      ],
    },
  ];
  return data.map((d) => ({ type: "application/ld+json", children: JSON.stringify(d) }));
}

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
    // Flat prices, so Google and AI answers can quote them.
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Carpet cleaning prices",
      itemListElement: PRICE_LIST.map(([name, price, unit]) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: "USD",
          ...(unit ? { unitText: unit } : {}),
        },
      })),
    },
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
  const city = cityOf(page);
  const images = [page.image, ...(page.gallery ?? []).map((g) => g.src)].map((src) => abs(src));
  const isService = page.kind === "service" || (page.kind === "local" && !!page.serviceType);
  const main = isService
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        name: page.h1,
        serviceType: page.serviceType,
        description: page.description,
        url,
        image: images,
        provider: { "@id": `${SITE_URL}/#business` },
        areaServed: (city ? [city] : CITIES).map((c) => ({
          "@type": "City",
          name: `${c.name}, TX`,
        })),
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
        image: images,
        datePublished: page.kind === "local" ? "2026-11-14" : "2026-11-06",
        dateModified: page.kind === "local" ? "2026-11-14" : "2026-11-06",
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
      ...(city
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: `Carpet cleaning in ${city.name}`,
              item: abs(`/carpet-cleaning/${cityParam(city)}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: city ? 3 : 2,
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
