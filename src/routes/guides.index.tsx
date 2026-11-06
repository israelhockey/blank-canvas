import { createFileRoute } from "@tanstack/react-router";

import { HubPage } from "@/components/site/HubPage";
import { pageMeta } from "@/lib/seo";
import { GUIDES } from "@/lib/seo-pages";

export const Route = createFileRoute("/guides/")({
  head: () =>
    pageMeta({
      title: "Carpet Cleaning Guides & Tips | Simple Surface Carpet Cleaning",
      description:
        "Carpet cleaning guides from Simple Surface Carpet Cleaning in Fort Worth: prices, drying time, pet urine, move-out checklists and more.",
      path: "/guides",
    }),
  component: () => (
    <HubPage
      eyebrow="Guides"
      title="Carpet care guides"
      intro="Straight answers on prices, drying time, pet stains, move-outs and how often to clean, from a Fort Worth carpet cleaner."
      pages={GUIDES}
    />
  ),
});
