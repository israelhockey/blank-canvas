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

/*
 * Public website forms: booking and commercial walkthrough requests.
 * The form also saves itself to the database (submit_lead); these functions send the emails:
 *   - an instant alert to the team (NOTIFY_EMAILS)
 *   - a branded confirmation to the customer, once FROM_EMAIL is on a verified domain
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
});

export type BookingInput = z.input<typeof bookingSchema>;
export type WalkthroughInput = z.input<typeof walkthroughSchema>;

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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
    const alert = await sendEmail({
      to: notifyList(),
      subject: `New booking: ${data.name}, ${data.day} ${data.window} (${usd(data.total)})`,
      html: alertLayout(
        "New booking request",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows(pairs)}</table>
<p style="margin-top:20px"><a href="tel:${esc(data.phone.replace(/[^\d+]/g, ""))}" style="background:#1650ec;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Call ${esc(data.name)}</a></p>`,
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
          intro: `We'll text you shortly to confirm ${data.day}, ${data.window} arrival. No deposit; you pay after the job is done.`,
          body: data.items.length
            ? itemsTable(data.items, data.subtotal, data.tax, data.total)
            : "",
        }),
        text: `Thanks, ${first}! We got your booking request for ${data.day}, ${data.window}. We'll text you to confirm. Total ${usd(data.total)} with tax. Questions: 214-562-3449.`,
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
    return sendEmail({
      to: notifyList(),
      subject: `Commercial walkthrough: ${data.business} (${data.sqft.toLocaleString("en-US")} sq ft)`,
      html: alertLayout(
        "New commercial walkthrough request",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows(pairs)}</table>`,
      ),
      text: pairs
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    });
  });
