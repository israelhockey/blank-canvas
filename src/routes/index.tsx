import { createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site/SitePage";
import { businessJsonLd, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageMeta({
      title: "Simple Surface | Carpet & Upholstery Cleaning in Fort Worth, TX",
      description:
        "Low-moisture carpet, tile, upholstery and rug cleaning in Fort Worth. Plugs into a standard outlet, no hoses through your door, dry in hours. Flat $50 per room, no deposit.",
      path: "/",
    }),
    scripts: businessJsonLd(),
  }),
  component: Home,
});

function Home() {
  return <SitePage />;
}
