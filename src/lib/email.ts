/*
 * Email through Lovable's built-in app emails. Server-only: call from createServerFn handlers.
 * Sends from the verified domain simplesurfacecarpetcleaning.com; delivery, retries,
 * rate limits, suppression and unsubscribe handling are managed by Lovable.
 * Secrets: NOTIFY_EMAILS (comma-separated alert recipients). LOVABLE_API_KEY is automatic.
 */
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

export const BUSINESS_INBOX = "simplesurfacellc@gmail.com";
/**
 * Lovable sends from a sender subdomain (default "notify"). Override with the EMAIL_SENDER_DOMAIN
 * secret if the Emails settings in Lovable show a different one.
 */
export const SENDER_DOMAIN =
  process.env["EMAIL_SENDER_DOMAIN"] || "notify.simplesurfacecarpetcleaning.com";
export const SENDER_NAME = "Simple Surface Carpet Cleaning";
/** Shown in the From: header; Lovable delivers it through the notify subdomain. */
export const FROM_ADDRESS = "noreply@simplesurfacecarpetcleaning.com";

export type SendResult = { ok: true } | { ok: false; error: string };

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function notifyList(): string[] {
  return (process.env["NOTIFY_EMAILS"] || BUSINESS_INBOX)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Customer-facing mail is always allowed: the sending domain is verified with Lovable. */
export function canEmailCustomers(): boolean {
  return true;
}

/** Where a customer email belongs, so it shows in that customer's history. */
export type EmailLog = {
  type: string;
  customerId?: string | null | undefined;
  jobId?: string | null | undefined;
  leadId?: string | null | undefined;
};

/** What we store in activities.body for kind "email" (parsed by the customer page). */
export type EmailRecord = {
  v: 1;
  type: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "suppressed";
  error?: string;
  text: string;
};

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
  /** Dedupes repeats of the same logical email (e.g. one "quote accepted" per quote). */
  idempotencyKey?: string | undefined;
  /** Set for customer-facing mail: records it on the customer's history. */
  log?: EmailLog | undefined;
}): Promise<SendResult> {
  const result = await deliver(opts);
  if (opts.log) await recordEmail(opts, result);
  return result;
}

async function deliver(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
  idempotencyKey?: string | undefined;
}): Promise<SendResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    console.error("LOVABLE_API_KEY is not set");
    return { ok: false, error: "Email isn't set up (LOVABLE_API_KEY missing)." };
  }
  const [to, ...cc] = opts.to;
  if (!to) return { ok: false, error: "No email address to send to." };
  try {
    await sendLovableEmail(
      {
        to,
        ...(cc.length ? { cc: cc.slice(0, 4) } : {}),
        from: { name: SENDER_NAME, address: FROM_ADDRESS },
        sender_domain: SENDER_DOMAIN,
        purpose: "transactional",
        idempotency_key: opts.idempotencyKey || crypto.randomUUID(),
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        // Customer replies land in the business inbox unless a caller says otherwise.
        reply_to: opts.replyTo ?? BUSINESS_INBOX,
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
    return { ok: true };
  } catch (e) {
    if (e instanceof EmailAPIError) {
      console.error("Email API error", e.status, e.code ?? "", e.message);
      if (e.code === "recipient_suppressed")
        return {
          ok: false,
          error: "This address unsubscribed or bounced, so it can't be emailed.",
        };
      return {
        ok: false,
        error: `Email failed (${e.status}${e.code ? ` ${e.code}` : ""}): ${e.message}`,
      };
    }
    console.error("Email send error", e);
    return { ok: false, error: `Email failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Saves the email on the customer's history. Never throws: logging must not break sending. */
async function recordEmail(
  opts: { to: string[]; subject: string; text: string; log?: EmailLog | undefined },
  result: SendResult,
) {
  const log = opts.log!;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let customerId = log.customerId ?? null;
    if (!customerId && log.leadId) {
      const { data } = await supabaseAdmin
        .from("leads")
        .select("customer_id")
        .eq("id", log.leadId)
        .maybeSingle();
      customerId = (data as { customer_id: string | null } | null)?.customer_id ?? null;
    }
    if (!customerId) return;
    const rec: EmailRecord = {
      v: 1,
      type: log.type,
      to: opts.to.join(", "),
      subject: opts.subject,
      status: result.ok ? "sent" : result.error.includes("unsubscribed") ? "suppressed" : "failed",
      ...(result.ok ? {} : { error: result.error }),
      text: opts.text.slice(0, 4000),
    };
    await supabaseAdmin.from("activities").insert({
      customer_id: customerId,
      job_id: log.jobId ?? null,
      lead_id: log.leadId ?? null,
      kind: "email",
      body: JSON.stringify(rec),
    });
  } catch (e) {
    console.error("Could not record email", e);
  }
}

export function detailRows(pairs: [string, string][]) {
  return pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#56627a;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#0f1f38;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
}

/** Internal alert layout (to the team). */
export function alertLayout(title: string, body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1f38">
<h2 style="margin:0 0 4px;font-size:20px">${esc(title)}</h2>
<p style="margin:0 0 18px;color:#56627a;font-size:14px">From the Simple Surface website. Reply fast: leads book with whoever answers first.</p>
${body}</div>`;
}

/** Branded customer email layout. `origin` is the site's base URL, used for the logo. */
export function brandedLayout(opts: {
  origin: string;
  heading: string;
  intro: string;
  body?: string;
  cta?: { label: string; href: string };
}) {
  const logo = opts.origin ? `${opts.origin}/brand/mark-192.png` : "";
  return `<div style="background:#f3f5f8;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde3ec">
  <div style="background:#0f1f38;padding:18px 24px;display:flex;align-items:center">
    ${logo ? `<img src="${esc(logo)}" width="40" height="40" alt="" style="background:#fff;border-radius:9px;padding:3px;vertical-align:middle">` : ""}
    <span style="color:#ffffff;font-weight:900;font-size:18px;letter-spacing:.02em;margin-left:12px;vertical-align:middle;text-transform:uppercase">Simple Surface</span>
  </div>
  <div style="padding:26px 24px;color:#0f1f38">
    <h1 style="margin:0 0 10px;font-size:22px;line-height:1.2">${esc(opts.heading)}</h1>
    ${opts.intro ? `<p style="margin:0 0 18px;color:#56627a;font-size:15px;line-height:1.55">${esc(opts.intro)}</p>` : ""}
    ${opts.body ?? ""}
    ${
      opts.cta
        ? `<p style="margin:24px 0 6px"><a href="${esc(opts.cta.href)}" style="background:#1650ec;color:#ffffff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">${esc(opts.cta.label)}</a></p>`
        : ""
    }
  </div>
  <div style="padding:16px 24px;border-top:1px solid #dde3ec;color:#56627a;font-size:13px;line-height:1.5">
    Simple Surface Carpet Cleaning · Fort Worth, TX · 214-562-3449<br>
    <a href="https://simplesurfacecarpetcleaning.com" style="color:#1650ec;text-decoration:none">simplesurfacecarpetcleaning.com</a><br>
    Eco-friendly · Low moisture · Steam · 100% Customer Satisfaction Guarantee
  </div>
</div></div>`;
}

/** A line-item table for quotes, confirmations and receipts. */
export function itemsTable(
  items: { label: string; amount: number }[],
  subtotal: number,
  tax: number,
  total: number,
) {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eef1f5">${esc(i.label)}</td><td style="padding:8px 0;border-bottom:1px solid #eef1f5;text-align:right;white-space:nowrap">${usd(i.amount)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:15px;color:#0f1f38">${rows}
<tr><td style="padding:10px 0 2px;color:#56627a">Subtotal</td><td style="padding:10px 0 2px;text-align:right">${usd(subtotal)}</td></tr>
<tr><td style="padding:2px 0;color:#56627a">Sales tax (8.25%)</td><td style="padding:2px 0;text-align:right">${usd(tax)}</td></tr>
<tr><td style="padding:8px 0;font-weight:800;font-size:17px">Total</td><td style="padding:8px 0;text-align:right;font-weight:800;font-size:17px">${usd(total)}</td></tr>
</table>`;
}
