import { createFileRoute, notFound } from "@tanstack/react-router";

import { SitePage } from "@/components/site/SitePage";
import { findCity } from "@/lib/site-data";
import { businessJsonLd, pageMeta } from "@/lib/seo";

/** City landing pages, e.g. /carpet-cleaning/keller-tx */
export const Route = createFileRoute("/carpet-cleaning/$city")({
  loader: ({ params }) => {
    const city = findCity(params.city);
    if (!city) throw notFound();
    return { city };
  },
  head: ({ loaderData }) => {
    const city = loaderData?.city;
    if (!city) return {};
    return {
      ...pageMeta({
        title: `Carpet Cleaning in ${city.name}, TX | Simple Surface`,
        description: `Low-moisture carpet, upholstery and rug cleaning in ${city.name}, TX. Dry in hours, no hoses through your door. Flat $50 per room, no deposit, pay after the job.`,
        path: `/carpet-cleaning/${city.slug}-tx`,
      }),
      scripts: businessJsonLd(city),
    };
  },
  component: CityPage,
});

function CityPage() {
  const { city } = Route.useLoaderData();
  return <SitePage key={city.slug} city={city} />;
}
