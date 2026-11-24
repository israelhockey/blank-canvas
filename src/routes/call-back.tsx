import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/LegalPage";
import { BUSINESS } from "@/lib/site-data";
import { track } from "@/lib/track";

/* Landing page for the "Yes, give me a call" button in our outreach emails. Not for search engines. */
export const Route = createFileRoute("/call-back")({
  head: () => ({
    meta: [
      { title: "Got it | Simple Surface Carpet Cleaning" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    l: typeof s["l"] === "string" ? s["l"].slice(0, 40) : undefined,
    s: typeof s["s"] === "string" ? s["s"].slice(0, 10) : undefined,
  }),
  component: CallBack,
});

function CallBack() {
  const { l, s } = Route.useSearch();
  useEffect(() => {
    track("call_back_request", l ?? "unknown", { step: s ?? "1" });
  }, [l, s]);
  return (
    <LegalPage title="Got it, Tom will call you" updated="today">
      <p>
        Thanks! Tom from {BUSINESS.legalName} will give you a quick call, usually the same or next
        business day. It takes about 5 minutes.
      </p>
      <p>
        Want to talk right now instead? Call or text <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>.
      </p>
    </LegalPage>
  );
}
