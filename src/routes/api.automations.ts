import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runAutomations } from "@/lib/automations.server";

/*
 * Automatic customer emails. Lovable runs this every hour (scheduled job with the
 * LOVABLE_CRON_SECRET bearer token). Each email is sent once and saved to the customer's history.
 */
export const Route = createFileRoute("/api/automations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const result = await runAutomations();
        return Response.json(result);
      },
      GET: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const result = await runAutomations();
        return Response.json(result);
      },
    },
  },
});
