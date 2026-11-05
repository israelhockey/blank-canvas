import { createFileRoute } from "@tanstack/react-router";

import { buildIcs, type FeedJob } from "@/lib/ics";

/*
 * Private calendar feed: /calendar-feed/<secret>.ics
 * Subscribe to it from Google Calendar or the iPhone Calendar app and every booked job shows up
 * on the phone. The secret lives in settings.calendar_token (Settings → Calendar on your phone).
 */
export const Route = createFileRoute("/calendar-feed/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.replace(/\.ics$/i, "");
        if (!/^[a-f0-9]{32,}$/.test(token)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: setting } = await supabaseAdmin
          .from("settings")
          .select("value")
          .eq("key", "calendar_token")
          .maybeSingle();
        const saved = (setting as { value: unknown } | null)?.value;
        if (typeof saved !== "string" || saved !== token)
          return new Response("Not found", { status: 404 });

        const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
        const to = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
        const { data } = await supabaseAdmin
          .from("jobs")
          .select("*, customers(id,name,phone,email)")
          .gte("scheduled_date", from)
          .lte("scheduled_date", to)
          .neq("status", "canceled");
        const jobs = (data ?? []) as unknown as FeedJob[];

        return new Response(buildIcs(jobs), {
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "cache-control": "no-store",
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
