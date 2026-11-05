import { createFileRoute } from "@tanstack/react-router";

import { alertLayout, detailRows, notifyList, sendEmail } from "@/lib/email";

// Temporary route used once to verify team alerts send through Lovable's app emails.
export const Route = createFileRoute("/api/test-email")({
  server: {
    handlers: {
      GET: async () => {
        const result = await sendEmail({
          to: notifyList(),
          subject: "Test alert: Simple Surface emails now send through Lovable",
          html: alertLayout(
            "Test team alert",
            `<table style="border-collapse:collapse;font-size:15px">${detailRows([
              ["What", "Email test"],
              ["Why", "Confirming team alerts send through Lovable's built-in app emails"],
            ])}</table>`,
          ),
          text: "Test team alert: confirming Simple Surface team alerts send through Lovable's built-in app emails.",
        });
        return Response.json(result);
      },
    },
  },
});
