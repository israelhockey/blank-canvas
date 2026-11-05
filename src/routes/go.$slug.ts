import { createFileRoute } from "@tanstack/react-router";

/*
 * Short tracking links for posts and flyers: /go/keller-moms
 * Redirects to the site with utm tags, so every visit, lead and paid job from that post is
 * credited to "keller-moms" on the Stats and Links pages. Links are made on Back office → Links;
 * an unknown slug still works (it just lands on the home page tagged with that name).
 */
type SavedLink = { slug: string; channel?: string; dest?: string };

export const Route = createFileRoute("/go/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = params.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 60);
        let channel = "link";
        let dest = "/";
        if (slug) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data } = await supabaseAdmin
              .from("settings")
              .select("value")
              .eq("key", "tracking_links")
              .maybeSingle();
            const list = ((data as { value: unknown } | null)?.value ?? []) as SavedLink[];
            const hit = Array.isArray(list) ? list.find((l) => l.slug === slug) : undefined;
            if (hit?.channel) channel = hit.channel;
            if (hit?.dest && hit.dest.startsWith("/") && !hit.dest.startsWith("//"))
              dest = hit.dest;
          } catch {
            /* still redirect */
          }
        }
        const [path, hash = ""] = dest.split("#");
        const url = new URL(path || "/", new URL(request.url).origin);
        if (slug) url.searchParams.set("utm_source", slug);
        url.searchParams.set("utm_medium", channel);
        return new Response(null, {
          status: 302,
          headers: {
            location: `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
