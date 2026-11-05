import { createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site/SitePage";
import { businessJsonLd, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageMeta({
      title: "Fort Worth Carpet Cleaning | Simple Surface Carpet Cleaning",
      description:
        "Simple Surface Carpet Cleaning: low-moisture carpet, upholstery, rug and tile cleaning in Fort Worth and Tarrant County, TX. Dry in hours, no hoses through your door. Flat $50 per room, no deposit.",
      path: "/",
    }),
    scripts: businessJsonLd(),
  }),
  component: Home,
});

function Home() {
  return <SitePage />;
}
