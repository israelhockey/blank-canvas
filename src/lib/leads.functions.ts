import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/*
 * Booking and walkthrough requests.
 *
 * Each request is emailed to the business through Resend.
 * Secrets (set them in Lovable → Settings → Secrets, never in the repo):
 *   RESEND_API_KEY  – Resend API key
 *   NOTIFY_EMAILS   – comma-separated list of who gets the alerts
 *   FROM_EMAIL      – verified sender, e.g. "Simple Surface Bookings <bookings@yourdomain.com>"
 * If NOTIFY_EMAILS is missing, alerts go to the business inbox below.
 */

const BUSINESS_INBOX = "simplesurfacellc@gmail.com";

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
type Result = { ok: true } | { ok: false; error: string };

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rows(pairs: [string, string][]) {
  return pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#56627a;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#0f1f38;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
}

function wrap(title: string, body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1f38">
<h2 style="margin:0 0 4px;font-size:20px">${esc(title)}</h2>
<p style="margin:0 0 18px;color:#56627a;font-size:14px">From the Simple Surface website. Reply fast: leads book with whoever answers first.</p>
${body}</div>`;
}

async function sendAlert(
  subject: string,
  html: string,
  text: string,
  replyTo?: string,
): Promise<Result> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    return { ok: false, error: "not_configured" };
  }
  const to = (process.env["NOTIFY_EMAILS"] || BUSINESS_INBOX)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env["FROM_EMAIL"] || "Simple Surface Bookings <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "send_failed" };
  }
  return { ok: true };
}

export const submitBooking = createServerFn({ method: "POST" })
  .validator((d: unknown) => bookingSchema.parse(d))
  .handler(async ({ data }): Promise<Result> => {
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
    const subject = `New booking: ${data.name}, ${data.day} ${data.window} (${usd(data.total)})`;
    const html = wrap(
      "New booking request",
      `<table style="border-collapse:collapse;font-size:15px">${rows(pairs)}</table>
<p style="margin-top:20px"><a href="tel:${esc(data.phone.replace(/[^\d+]/g, ""))}" style="background:#1650ec;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Call ${esc(data.name)}</a></p>`,
    );
    const text = pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    return sendAlert(subject, html, text, data.email || undefined);
  });

export const submitWalkthrough = createServerFn({ method: "POST" })
  .validator((d: unknown) => walkthroughSchema.parse(d))
  .handler(async ({ data }): Promise<Result> => {
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
    const subject = `Commercial walkthrough: ${data.business} (${data.sqft.toLocaleString("en-US")} sq ft)`;
    const html = wrap(
      "New commercial walkthrough request",
      `<table style="border-collapse:collapse;font-size:15px">${rows(pairs)}</table>`,
    );
    const text = pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    return sendAlert(subject, html, text);
  });
