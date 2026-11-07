import { createFileRoute, notFound } from "@tanstack/react-router";

import { SitePage } from "@/components/site/SitePage";
import { cityParam, findCity } from "@/lib/site-data";
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
    // Keep titles near 60 characters so Google shows them in full.
    const long = `${city.name}, TX Carpet Cleaning | $50/Room | Simple Surface`;
    return {
      ...pageMeta({
        title: long.length > 62 ? `${city.name}, TX Carpet Cleaning | Simple Surface` : long,
        description: `Carpet cleaning in ${city.name}, TX: flat $50 per room, dry in hours, no hoses through your door. No deposit, pay after the job. Book online.`,
        path: `/carpet-cleaning/${cityParam(city)}`,
        hero: true,
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
