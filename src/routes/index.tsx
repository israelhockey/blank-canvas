import { createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site/SitePage";
import { businessJsonLd, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageMeta({
      title: "Carpet Cleaning Fort Worth & Tarrant County | Simple Surface",
      description:
        "Low-moisture carpet, upholstery, rug and tile cleaning in Fort Worth and Tarrant County. Flat $50 per room, dry in hours, no deposit. Book online.",
      path: "/",
      hero: true,
    }),
    scripts: businessJsonLd(),
  }),
  component: Home,
});

function Home() {
  return <SitePage />;
}
