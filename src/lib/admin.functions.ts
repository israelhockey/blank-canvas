import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { buildCustomerEmail } from "./customer-emails";
import { brandedLayout, canEmailCustomers, sendEmail } from "./email";
import { requireTeam } from "./team-auth";

/*
 * Team-only server functions. Every call carries the signed-in user's access token
 * and is checked with requireTeam() before anything runs.
 *
 * Square secrets (Lovable → Settings → Secrets):
 *   SQUARE_ACCESS_TOKEN   – production access token from the Square Developer Dashboard
 *   SQUARE_LOCATION_ID    – optional; the first active location is used if missing
 *   SQUARE_ENVIRONMENT    – "production" (default) or "sandbox" for testing
 */

const item = z.object({ label: z.string().max(160), amount: z.number() });

/* ---------------- Square ---------------- */

function squareBase() {
  return process.env["SQUARE_ENVIRONMENT"] === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function square<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = process.env["SQUARE_ACCESS_TOKEN"];
  if (!token) throw new Error("Square isn't connected yet (SQUARE_ACCESS_TOKEN missing).");
  const res = await fetch(`${squareBase()}${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": process.env["SQUARE_API_VERSION"] || "2024-10-17",
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    errors?: { detail?: string; code?: string }[];
  };
  if (!res.ok) {
    const msg =
      json.errors?.map((e) => e.detail || e.code).join("; ") || `Square error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function locationId(): Promise<string> {
  const fixed = process.env["SQUARE_LOCATION_ID"];
  if (fixed) return fixed;
  const r = await square<{ locations?: { id: string; status: string }[] }>("/v2/locations");
  const loc = r.locations?.find((l) => l.status === "ACTIVE") ?? r.locations?.[0];
  if (!loc) throw new Error("No Square location found.");
  return loc.id;
}

const key = () => crypto.randomUUID();
const cents = (n: number) => Math.round(n * 100);

export const squareStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ auth: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireTeam(data.auth);
    if (!process.env["SQUARE_ACCESS_TOKEN"]) return { connected: false as const };
    try {
      const r = await square<{ locations?: { id: string; name: string; status: string }[] }>(
        "/v2/locations",
      );
      const loc = r.locations?.find((l) => l.status === "ACTIVE");
      return { connected: true as const, location: loc?.name ?? "" };
    } catch (e) {
      return { connected: false as const, error: (e as Error).message };
    }
  });

export const createSquareInvoice = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        auth: z.string(),
        jobNumber: z.number(),
        customer: z.object({
          name: z.string().min(1).max(160),
          email: z.string().max(200).optional().default(""),
          phone: z.string().max(40).optional().default(""),
        }),
        items: z.array(item).min(1).max(40),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireTeam(data.auth);
    const loc = await locationId();
    const email = data.customer.email.trim();
    const digits = data.customer.phone.replace(/\D/g, "").slice(-10);

    // Find or create the Square customer.
    let customerId: string | undefined;
    if (email) {
      const found = await square<{ customers?: { id: string }[] }>("/v2/customers/search", {
        body: { query: { filter: { email_address: { exact: email } } }, limit: 1 },
      });
      customerId = found.customers?.[0]?.id;
    }
    if (!customerId) {
      const [given, ...rest] = data.customer.name.trim().split(/\s+/);
      const created = await square<{ customer: { id: string } }>("/v2/customers", {
        body: {
          idempotency_key: key(),
          given_name: given,
          ...(rest.length ? { family_name: rest.join(" ") } : {}),
          ...(email ? { email_address: email } : {}),
          ...(digits.length === 10 ? { phone_number: `+1${digits}` } : {}),
          reference_id: `simple-surface-job-${data.jobNumber}`,
        },
      });
      customerId = created.customer.id;
    }

    const order = await square<{ order: { id: string } }>("/v2/orders", {
      body: {
        idempotency_key: key(),
        order: {
          location_id: loc,
          customer_id: customerId,
          reference_id: `job-${data.jobNumber}`,
          line_items: data.items.map((i) => ({
            name: i.label.slice(0, 500),
            quantity: "1",
            base_price_money: { amount: cents(i.amount), currency: "USD" },
          })),
          taxes: [
            {
              uid: "sales-tax",
              name: "Sales tax",
              percentage: "8.25",
              scope: "ORDER",
              type: "ADDITIVE",
            },
          ],
        },
      },
    });

    const inv = await square<{ invoice: { id: string; version: number } }>("/v2/invoices", {
      body: {
        idempotency_key: key(),
        invoice: {
          location_id: loc,
          order_id: order.order.id,
          primary_recipient: { customer_id: customerId },
          payment_requests: [
            { request_type: "BALANCE", due_date: data.dueDate, automatic_payment_source: "NONE" },
          ],
          delivery_method: email ? "EMAIL" : "SHARE_MANUALLY",
          accepted_payment_methods: {
            card: true,
            square_gift_card: false,
            bank_account: false,
            buy_now_pay_later: false,
            cash_app_pay: true,
          },
          title: `Simple Surface · Job #${data.jobNumber}`,
          description:
            "Thank you for choosing Simple Surface. 100% Customer Satisfaction Guarantee.",
        },
      },
    });

    const pub = await square<{ invoice: { id: string; public_url?: string; status: string } }>(
      `/v2/invoices/${inv.invoice.id}/publish`,
      { body: { version: inv.invoice.version, idempotency_key: key() } },
    );

    return {
      invoiceId: pub.invoice.id,
      orderId: order.order.id,
      publicUrl: pub.invoice.public_url ?? "",
      emailed: Boolean(email),
    };
  });

export const getSquareInvoice = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ auth: z.string(), invoiceId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireTeam(data.auth);
    const r = await square<{ invoice: { status: string; public_url?: string } }>(
      `/v2/invoices/${encodeURIComponent(data.invoiceId)}`,
    );
    return { status: r.invoice.status, publicUrl: r.invoice.public_url ?? "" };
  });

/* ---------------- Customer emails ---------------- */

const emailSchema = z.object({
  auth: z.string(),
  kind: z.enum(["quote", "receipt", "review", "reminder", "repeat", "confirm", "custom"]),
  customerId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  subject: z.string().max(200).optional().default(""),
  message: z.string().max(5000).optional().default(""),
  to: z.string().email(),
  name: z.string().max(160),
  origin: z.string().max(200),
  link: z.string().max(500).optional().default(""),
  number: z.number().optional(),
  title: z.string().max(200).optional().default(""),
  notes: z.string().max(3000).optional().default(""),
  day: z.string().max(80).optional().default(""),
  window: z.string().max(40).optional().default(""),
  method: z.string().max(40).optional().default(""),
  items: z.array(item).max(40).optional().default([]),
  subtotal: z.number().optional().default(0),
  tax: z.number().optional().default(0),
  total: z.number().optional().default(0),
  expires: z.string().max(40).optional().default(""),
});

export const sendCustomerEmail = createServerFn({ method: "POST" })
  .validator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data }) => {
    await requireTeam(data.auth);
    if (!canEmailCustomers()) {
      return {
        ok: false as const,
        error: "Customer emails are unavailable right now. Please try again shortly.",
      };
    }
    const { subject, html, text } = buildCustomerEmail(data.kind, data);
    return sendEmail({
      to: [data.to],
      subject,
      html,
      text,
      log: { type: data.kind, customerId: data.customerId, jobId: data.jobId },
    });
  });

/** Sends a branded test email to the signed-in team member, to check email is working. */
export const sendTestEmail = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ auth: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireTeam(data.auth);
    const r = await sendEmail({
      to: [me.email],
      subject: "Test email from your back office",
      html: brandedLayout({
        origin: "https://simplesurfacecarpetcleaning.com",
        heading: "Email is working",
        intro: "This is what your customers' emails look like. Replies go to the business inbox.",
      }),
      text: "Email is working. This is a test from the Simple Surface back office.",
    });
    return r.ok ? { ok: true as const, to: me.email } : r;
  });
