import { createFileRoute, notFound } from "@tanstack/react-router";

import { ContentPageView } from "@/components/site/ContentPageView";
import { contentJsonLd, pageMeta } from "@/lib/seo";
import { findPage, pagePath } from "@/lib/seo-pages";
import { findCity } from "@/lib/site-data";

/** /carpet-cleaning/<city>/<service>: city-specific pages from src/lib/local-pages.ts */
export const Route = createFileRoute("/carpet-cleaning/$city_/$service")({
  loader: ({ params }) => {
    const city = findCity(params.city);
    const page = city && findPage("local", params.service, city.slug);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    if (!page) return {};
    return {
      ...pageMeta({ title: page.title, description: page.description, path: pagePath(page) }),
      scripts: contentJsonLd(page),
    };
  },
  component: Page,
});

function Page() {
  const { page } = Route.useLoaderData();
  return <ContentPageView key={page.slug} page={page} />;
}
