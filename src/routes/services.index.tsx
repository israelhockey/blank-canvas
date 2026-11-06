import { createFileRoute } from "@tanstack/react-router";

import { HubPage } from "@/components/site/HubPage";
import { pageMeta } from "@/lib/seo";
import { SERVICE_PAGES } from "@/lib/seo-pages";

export const Route = createFileRoute("/services/")({
  head: () =>
    pageMeta({
      title: "Carpet Cleaning Services Fort Worth | Simple Surface",
      description:
        "Every Simple Surface Carpet Cleaning service in Fort Worth and Tarrant County: upholstery, rugs, pet stains, move-out, tile and grout, and commercial carpet.",
      path: "/services",
    }),
  component: () => (
    <HubPage
      eyebrow="Services"
      title="Carpet cleaning services in Fort Worth"
      intro="Carpet, upholstery, rugs, tile, pet stains, move-outs and commercial floors. Flat prices, no deposit, dry in hours."
      pages={SERVICE_PAGES}
    />
  ),
});
