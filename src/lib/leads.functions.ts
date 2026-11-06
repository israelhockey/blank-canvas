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
  address: z.string().trim().max(200).optional().default(""),
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
  partialLeadId: z.string().uuid().optional(),
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

/** The booking RPC stores ZIP only; put the street address on the job it created. */
async function saveJobAddress(leadId: string, address: string, zip: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("jobs")
      .update({ address: `${address}, ${zip}` })
      .eq("lead_id", leadId)
      .is("address", null);
  } catch (e) {
    console.error("Could not save job address", e);
  }
}

/** They started the booking form (saved as a partial lead) and then finished it: close the partial. */
async function closePartialLead(leadId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("leads")
      .update({ status: "booked" })
      .eq("id", leadId)
      .eq("status", "new");
  } catch (e) {
    console.error("Could not close partial lead", e);
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
      ["Address", data.address],
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
    if (data.leadId && data.address) await saveJobAddress(data.leadId, data.address, data.zip);
    if (data.partialLeadId) await closePartialLead(data.partialLeadId);
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

/* ---------- Quick quote / "send me this price" ---------- */

const quickSchema = z.object({
  mode: z.enum(["quick", "price", "whatsapp", "guide"]),
  address: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(200).optional().default(""),
  wants: z.array(z.string().max(40)).max(10).optional().default([]),
  items: z.array(z.object({ label: z.string().max(120), amount: z.number() })).max(30),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  q: z.string().max(300).optional().default(""),
  page: z.string().max(200).optional().default("/"),
  source: z.string().max(300).optional().default(""),
  website: z.string().max(500).optional().default(""),
  leadId: z.string().uuid().optional(),
});

/** Alerts the team right away and, if they gave an email, sends their price + a booking link. */
export const submitQuickLead = createServerFn({ method: "POST" })
  .validator((d: unknown) => quickSchema.parse(d))
  .handler(async ({ data }): Promise<SendResult> => {
    if (data.website) return { ok: true };
    const phoneDigits = data.phone.replace(/\D/g, "").length;
    if (data.mode === "guide" ? !looksLikeEmail(data.email) : phoneDigits < 10)
      return { ok: false, error: "Missing contact details." };
    const customerId = await customerForLead(data.leadId);
    if (data.mode === "guide")
      return sendStainGuide(
        data.name,
        data.email,
        data.phone,
        customerId,
        data.leadId ?? (await saveEmailOnlyLead(data.name, data.email, data.page, data.source)),
      );
    const priced = data.items.length > 0;
    const bookLink = `${SITE_ORIGIN}/${data.q ? `?q=${encodeURIComponent(data.q)}` : ""}#book`;
    const what = priced
      ? data.items.map((i) => i.label).join(", ")
      : data.wants.join(", ") || "Not said";

    const pairs: [string, string][] = [
      ["Name", data.name],
      ["Phone", data.phone],
      ["Email", data.email],
      ["Wants", what],
      ...(priced ? ([["Their price", `${usd(data.total)} with tax`]] as [string, string][]) : []),
      ["Address", data.address],
      ["Notes", data.notes],
      [
        "Form",
        data.mode === "price"
          ? "Send me this price (price builder)"
          : data.mode === "whatsapp"
            ? "WhatsApp button (they were sent to WhatsApp to message you)"
            : "Quick quote",
      ],
      ["Page", data.page],
      ["Came from", data.source],
    ];
    const alert = await sendEmail({
      to: notifyList(),
      subject: `${data.mode === "price" ? "Price saved" : data.mode === "whatsapp" ? "WhatsApp lead" : "Quick quote"}: ${data.name} (${what}) · call now`,
      html: alertLayout(
        data.mode === "price"
          ? "Wants this price: call to book"
          : data.mode === "whatsapp"
            ? "WhatsApp lead: check WhatsApp, or call now"
            : "Quick quote request: call now",
        `<table style="border-collapse:collapse;font-size:15px">${detailRows(pairs)}</table>
<p style="margin-top:20px">${button(`tel:${data.phone.replace(/[^\d+]/g, "")}`, `Call ${data.name}`)}${button(adminLink(customerId), "Open in back office", "#0f1f38")}</p>`,
      ),
      text: `${pairs
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}\n${adminLink(customerId)}`,
      replyTo: data.email || undefined,
    });

    if (data.email && looksLikeEmail(data.email)) {
      const first = data.name.split(" ")[0] ?? data.name;
      await sendEmail({
        to: [data.email],
        subject: priced
          ? `Your carpet cleaning price: ${usd(data.total)}`
          : "Got it! We'll text you your price shortly",
        html: brandedLayout({
          origin: SITE_ORIGIN,
          heading: priced ? `Here's your price, ${first}` : `Thanks, ${first}!`,
          intro: priced
            ? "Flat prices, no deposit, and you pay after the job is done. Pick a day and time whenever you're ready, or reply and we'll book it for you."
            : "We'll text you within a few minutes with your price. Want it now? Build it yourself in under a minute and pick a time that works for you.",
          body: priced ? itemsTable(data.items, data.subtotal, data.tax, data.total) : "",
          cta: {
            label: priced ? "Pick a time" : "See my price",
            href: priced ? bookLink : `${SITE_ORIGIN}/#pricing`,
          },
        }),
        text: priced
          ? `Hi ${first}, your Simple Surface Carpet Cleaning price is ${usd(data.total)} with tax (${what}). Pick a time: ${bookLink}. Questions: 214-562-3449.`
          : `Thanks, ${first}! We'll text you your price shortly. Or build it yourself: ${SITE_ORIGIN}/#pricing. Questions: 214-562-3449.`,
        log: { type: priced ? "price_sent" : "quick_quote", customerId, leadId: data.leadId },
      }).catch(() => undefined);
    }
    return alert;
  });

const STAIN_TIPS: [string, string][] = [
  ["Red wine", "Blot right away, pour a little cold water on it and keep blotting. Never rub."],
  [
    "Gravy & grease",
    "Scrape up what you can, then blot with a drop of dish soap in warm water. Rinse with plain water.",
  ],
  ["Coffee & tea", "Blot, then dab with cold water and a little white vinegar. Blot dry."],
  [
    "Cranberry sauce",
    "Scoop it up with a spoon, then blot with cold water. Don't use heat: it sets the red.",
  ],
  [
    "Candle wax",
    "Let it harden, scrape off what you can, then lay a paper towel over it and press with a warm iron.",
  ],
  ["Mud", "Let it dry completely, then vacuum it up before treating any leftover mark."],
  [
    "Pet accidents",
    "Blot hard, rinse with cold water, then use an enzyme cleaner made for pet urine. Skip ammonia.",
  ],
  ["Chocolate", "Let it harden, scrape, then blot with a drop of dish soap in cool water."],
  [
    "Kids' juice & soda",
    "Blot with cold water. A little dish soap helps lift the sugar so it doesn't attract dirt.",
  ],
  [
    "Any stain",
    "Work from the outside in, use white towels only, and test cleaners on a hidden spot first.",
  ],
];

async function sendStainGuide(
  name: string,
  email: string,
  phone: string,
  customerId: string | null,
  leadId: string | undefined,
): Promise<SendResult> {
  const first = name.split(" ")[0] || name;
  const rows = STAIN_TIPS.map(
    ([h, t], i) =>
      `<tr><td style="padding:12px 0;border-bottom:1px solid #e3e8f0;vertical-align:top;width:34px;font-weight:800;color:#1650ec;font-size:18px">${i + 1}</td><td style="padding:12px 0;border-bottom:1px solid #e3e8f0"><b style="color:#0f1f38;font-size:16px">${esc(h)}</b><br><span style="color:#46546e;font-size:15px;line-height:1.5">${esc(t)}</span></td></tr>`,
  ).join("");
  await sendEmail({
    to: notifyList(),
    subject: `Stain guide download: ${name}${phone ? ` (${phone})` : ""}`,
    html: alertLayout(
      "Someone downloaded the Holiday Stain Guide",
      `<table style="border-collapse:collapse;font-size:15px">${detailRows([
        ["Name", name],
        ["Email", email],
        ["Phone", phone],
      ])}</table><p style="margin-top:16px">A warm lead: follow up before the holidays.</p><p>${button(adminLink(customerId), "Open in back office")}</p>`,
    ),
    text: `Stain guide download: ${name} ${email} ${phone}`,
    replyTo: email,
  });
  return sendEmail({
    to: [email],
    subject: "Your Holiday Stain Guide: 10 quick fixes",
    html: brandedLayout({
      origin: SITE_ORIGIN,
      heading: `Here's your stain guide, ${first}`,
      intro:
        "Save this one for the holidays. The golden rule: blot, don't rub, and use cold water first.",
      body: `<table style="border-collapse:collapse;width:100%">${rows}</table><p style="margin:18px 0 0;color:#46546e;font-size:15px">Stain still there? Text a photo to 214-562-3449 and we'll tell you if we can get it out. Rooms are a flat $50, no deposit.</p>`,
      cta: { label: "See your price", href: `${SITE_ORIGIN}/#pricing` },
    }),
    text: `Your Holiday Stain Guide\n\n${STAIN_TIPS.map(([h, t], i) => `${i + 1}. ${h}: ${t}`).join("\n")}\n\nStain still there? Text a photo to 214-562-3449. ${SITE_ORIGIN}`,
    idempotencyKey: `stain-guide-${email.toLowerCase()}`,
    log: { type: "stain_guide", customerId, leadId },
  });
}

/** Leads without a phone (guide downloads) can't go through submit_lead; save them directly. */
async function saveEmailOnlyLead(name: string, email: string, page: string, source: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("leads")
      .insert({
        type: "contact",
        name: name.slice(0, 120),
        email: email.slice(0, 200),
        page: page.slice(0, 200),
        source: source.slice(0, 300),
        details: { from: "stain_guide" },
      })
      .select("id")
      .single();
    return (data as { id: string } | null)?.id;
  } catch (e) {
    console.error("Could not save guide lead", e);
    return undefined;
  }
}
