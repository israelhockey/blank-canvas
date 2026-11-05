/*
 * Email through Lovable's built-in app emails. Server-only: call from createServerFn handlers.
 * Sends from the verified domain simplesurfacecarpetcleaning.com; delivery, retries,
 * rate limits, suppression and unsubscribe handling are managed by Lovable.
 * Secrets: NOTIFY_EMAILS (comma-separated alert recipients). LOVABLE_API_KEY is automatic.
 */
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

export const BUSINESS_INBOX = "simplesurfacellc@gmail.com";
export const SENDER_DOMAIN = "simplesurfacecarpetcleaning.com";
export const SENDER_NAME = "Simple Surface Carpet Cleaning";
export const FROM_ADDRESS = `noreply@${SENDER_DOMAIN}`;

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

/** True when FROM_EMAIL is a real verified sender (customer-facing mail needs this). */
export function canEmailCustomers(): boolean {
  const from = process.env["FROM_EMAIL"] || "";
  return Boolean(process.env["RESEND_API_KEY"] && from && !from.includes("resend.dev"));
}

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
}): Promise<SendResult> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    return { ok: false, error: "not_configured" };
  }
  const from = process.env["FROM_EMAIL"] || "Simple Surface <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "send_failed" };
  }
  return { ok: true };
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
    <p style="margin:0 0 18px;color:#56627a;font-size:15px;line-height:1.55">${esc(opts.intro)}</p>
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
