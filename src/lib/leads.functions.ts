import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  alertLayout,
  brandedLayout,
  canEmailCustomers,
  detailRows,
  esc,
  itemsTable,
  notifyList,
  sendEmail,
  usd,
  type SendResult,
} from "./email";
import { ARRIVAL_WINDOWS, SITE_ORIGIN } from "./site-data";

/*
 * Public website forms: booking and commercial walkthrough requests.
 * The form also saves itself to the database (submit_lead); these functions send the emails:
 *   - an instant alert to the team (NOTIFY_EMAILS)
 *   - a branded confirmation to the customer, sent from our verified domain
 */

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a 10-digit phone number.");

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: z.string().trim().max(200).optional().default(""),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/),
  day: z.string().trim().min(3).max(80),
  window: z.string().trim().min(3).max(40),
  notes: z.string().trim().max(2000).optional().default(""),
  items: z.array(z.object({ label: z.string().max(120), amount: z.number() })).max(30),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  page: z.string().max(200).optional().default("/"),
  source: z.string().max(300).optional().default(""),
  origin: z.string().max(200).optional().default(""),
  website: z.string().max(500).optional().default(""), // honeypot: real people leave it empty
  leadId: z.string().uuid().optional(),
});

const walkthroughSchema = z.object({
  business: z.string().trim().min(2).max(160),
  type: z.string().trim().max(60),
  name: z.string().trim().max(120).optional().default(""),
  phone,
  sqft: z.number().min(0).max(10_000_000),
  frequency: z.string().trim().max(40),
  perClean: z.number(),
  perYear: z.number(),
  page: z.string().max(200).optional().default("/"),
  source: z.string().max(300).optional().default(""),
  website: z.string().max(500).optional().default(""),
  leadId: z.string().uuid().optional(),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type WalkthroughInput = z.input<typeof walkthroughSchema>;

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Finds the customer a website lead was saved under, for the "open in back office" link. */
async function customerForLead(leadId: string | undefined): Promise<string | null> {
  if (!leadId) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("leads")
      .select("customer_id")
      .eq("id", leadId)
      .maybeSingle();
    return (data as { customer_id: string | null } | null)?.customer_id ?? null;
  } catch {
    return null;
  }
}

const adminLink = (customerId: string | null) =>
  customerId ? `${SITE_ORIGIN}/admin/customers/${customerId}` : `${SITE_ORIGIN}/admin`;

const button = (href: string, label: string, color = "#1650ec") =>
  `<a href="${esc(href)}" style="background:${color};color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;margin:0 8px 8px 0">${esc(label)}</a>`;

export const submitBooking = createServerFn({ method: "POST" })
  .validator((d: unknown) => bookingSchema.parse(d))
  .handler(async ({ data }): Promise<SendResult> => {
    if (data.website) return { ok: true }; // bot filled the honeypot; pretend success

    const itemsText =
      data.items.map((i) => `${i.label} (${usd(i.amount)})`).join(", ") || "Not selected";
    const pairs: [string, string][] = [
      ["Name", data.name],
      ["Phone", data.phone],
      ["Email", data.email],
      ["ZIP", data.zip],
      ["Day", data.day],
      ["Arrival", data.window],
      ["Items", itemsText],
      ["Subtotal", usd(data.subtotal)],
      ["Tax", usd(data.tax)],
      ["Total", usd(data.total)],
      ["Notes", data.notes],
      ["Page", data.page],
      ["Came from", data.source],
    ];
    const customerId = await customerForLead(data.leadId);
    const alert = await sendEmail({
      to: notifyList(),
      subject: `New booking: ${data.name}, ${data.day} ${data.window} (${usd(data.total)})`,
      html: alertLayout(
        "New booking request",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows(pairs)}</table>
<p style="margin-top:20px">${button(adminLink(customerId), "Open & confirm")}${button(`tel:${data.phone.replace(/[^\d+]/g, "")}`, `Call ${data.name}`, "#0f1f38")}</p>`,
      ),
      text: pairs
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
      replyTo: data.email || undefined,
    });

    // Confirmation to the customer (only from a verified domain, never from resend.dev).
    if (data.email && looksLikeEmail(data.email) && canEmailCustomers()) {
      const first = data.name.split(" ")[0] ?? data.name;
      await sendEmail({
        to: [data.email],
        subject: `We got your booking request for ${data.day}`,
        html: brandedLayout({
          origin: data.origin,
          heading: `Thanks, ${first}! Your request is in.`,
          intro: `We'll confirm your ${data.day}, ${data.window} arrival by text and email shortly. No deposit; you pay after the job is done.`,
          body: data.items.length
            ? itemsTable(data.items, data.subtotal, data.tax, data.total)
            : "",
        }),
        text: `Thanks, ${first}! We got your booking request for ${data.day}, ${data.window}. We'll confirm by text and email. Total ${usd(data.total)} with tax. Questions: 214-562-3449.`,
        log: { type: "request_received", customerId, leadId: data.leadId },
      }).catch(() => undefined);
    }
    return alert;
  });

export const submitWalkthrough = createServerFn({ method: "POST" })
  .validator((d: unknown) => walkthroughSchema.parse(d))
  .handler(async ({ data }): Promise<SendResult> => {
    if (data.website) return { ok: true };

    const pairs: [string, string][] = [
      ["Business", data.business],
      ["Type", data.type],
      ["Contact", data.name],
      ["Phone", data.phone],
      ["Size", `${data.sqft.toLocaleString("en-US")} sq ft`],
      ["How often", data.frequency],
      ["Estimate", `${usd(data.perClean)} per clean, ${usd(data.perYear)} per year`],
      ["Page", data.page],
      ["Came from", data.source],
    ];
    const customerId = await customerForLead(data.leadId);
    return sendEmail({
      to: notifyList(),
      subject: `Commercial walkthrough: ${data.business} (${data.sqft.toLocaleString("en-US")} sq ft)`,
      html: alertLayout(
        "New commercial walkthrough request",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows(pairs)}</table>
<p style="margin-top:20px">${button(adminLink(customerId), "Open in back office")}${button(`tel:${data.phone.replace(/[^\d+]/g, "")}`, "Call now", "#0f1f38")}</p>`,
      ),
      text: pairs
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    });
  });

/*
 * Customer accepted a quote on /quote/<token>. Sends them a "got it" email and alerts the team.
 * Public, so it only acts on quotes accepted in the last 30 minutes and dedupes per quote.
 */
export const quoteAccepted = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().min(20).max(100) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await supabaseAdmin
      .from("quotes")
      .select("*, customers(id,name,phone,email), jobs(id,number,scheduled_date,arrival_window)")
      .eq("token", data.token)
      .maybeSingle();
    type Row = {
      id: string;
      number: number;
      status: string;
      accepted_at: string | null;
      items: { label: string; amount: number }[];
      subtotal: number;
      tax: number;
      total: number;
      customer_id: string;
      job_id: string | null;
      customers: { id: string; name: string; phone: string | null; email: string | null } | null;
      jobs: {
        id: string;
        number: number;
        scheduled_date: string | null;
        arrival_window: string | null;
      } | null;
    };
    const quote = q as Row | null;
    if (!quote || quote.status !== "accepted" || !quote.accepted_at) return { ok: false };
    if (Date.now() - new Date(quote.accepted_at).getTime() > 30 * 60000) return { ok: false };

    const c = quote.customers;
    const name = c?.name ?? "Customer";
    const first = name.split(" ")[0] || name;
    const job = quote.jobs;
    const when = job?.scheduled_date
      ? `${new Date(`${job.scheduled_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${job.arrival_window && ARRIVAL_WINDOWS.includes(job.arrival_window) ? `, ${job.arrival_window}` : ""}`
      : "";
    const items = quote.items ?? [];

    await sendEmail({
      to: notifyList(),
      subject: `Quote #${quote.number} accepted: ${name} (${usd(Number(quote.total))})`,
      html: alertLayout(
        "Quote accepted online",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows([
          ["Customer", name],
          ["Phone", c?.phone ?? ""],
          ["Email", c?.email ?? ""],
          ["Quote", `#${quote.number}`],
          ["Total", usd(Number(quote.total))],
          ["Preferred time", when || "No time picked: call to schedule"],
        ])}</table>
<p style="margin-top:20px">${button(adminLink(quote.customer_id), when ? "Open & confirm" : "Open & schedule")}${c?.phone ? button(`tel:${c.phone.replace(/[^\d+]/g, "")}`, `Call ${first}`, "#0f1f38") : ""}</p>`,
      ),
      text: `Quote #${quote.number} accepted by ${name} (${usd(Number(quote.total))}). ${when ? `Preferred: ${when}.` : "No time picked."} ${adminLink(quote.customer_id)}`,
      idempotencyKey: `quote-accepted-team-${quote.id}`,
    });

    if (c?.email && looksLikeEmail(c.email)) {
      await sendEmail({
        to: [c.email],
        subject: `Thanks, ${first}! Your quote #${quote.number} is accepted`,
        html: brandedLayout({
          origin: SITE_ORIGIN,
          heading: `You're all set, ${first}!`,
          intro: when
            ? `We got your acceptance and your preferred time: ${when}. We'll confirm it by text and email shortly. No deposit; you pay after the job is done.`
            : "We got your acceptance. We'll reach out shortly to pick a day and time. No deposit; you pay after the job is done.",
          body: items.length
            ? itemsTable(items, Number(quote.subtotal), Number(quote.tax), Number(quote.total))
            : "",
        }),
        text: `Thanks, ${first}! Quote #${quote.number} (${usd(Number(quote.total))}) is accepted. ${when ? `Preferred time: ${when}. ` : ""}We'll confirm shortly. Questions: 214-562-3449.`,
        idempotencyKey: `quote-accepted-${quote.id}`,
        log: { type: "quote_accepted", customerId: quote.customer_id, jobId: quote.job_id },
      });
    }
    return { ok: true };
  });
