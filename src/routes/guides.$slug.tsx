import { createFileRoute, notFound } from "@tanstack/react-router";

import { ContentPageView } from "@/components/site/ContentPageView";
import { contentJsonLd, pageMeta } from "@/lib/seo";
import { findPage, pagePath } from "@/lib/seo-pages";

/** /guides/<slug>: content from src/lib/seo-pages.ts */
export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const page = findPage("guide", params.slug);
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
