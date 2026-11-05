import { buildCustomerEmail } from "./customer-emails";
import { sendEmail } from "./email";
import { SITE_ORIGIN } from "./site-data";

/*
 * The automatic emails, run hourly by /api/automations:
 *   - Day-before reminder for confirmed jobs (sent 4–8pm Central the day before)
 *   - Quote follow-up when a quote sits unanswered for 2 days (sent 10am–6pm Central)
 *   - Google review request the day after a job is paid (sent 10am–6pm Central)
 * Each one goes out once per job or quote, skips "do not contact" customers, can be turned off
 * in Settings, and is saved to the customer's email history like any other email.
 */

export type AutomationSettings = { reminders: boolean; quote_followup: boolean; review: boolean };
export const AUTOMATION_DEFAULTS: AutomationSettings = {
  reminders: true,
  quote_followup: true,
  review: true,
};

type Cust = {
  id: string;
  name: string;
  email: string | null;
  do_not_contact: boolean;
};

function central(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    hour: Number(parts["hour"]),
  };
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const typeOf = (body: string | null) => {
  try {
    return (JSON.parse(body ?? "") as { type?: string }).type ?? "";
  } catch {
    return "";
  }
};

const canEmail = (c: Cust | null | undefined): c is Cust & { email: string } =>
  !!c && !!c.email && !c.do_not_contact;

export async function runAutomations() {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const now = central();
  const daytime = now.hour >= 10 && now.hour < 18;
  const evening = now.hour >= 16 && now.hour < 20;
  const sent = { reminders: 0, quote_followups: 0, reviews: 0 };
  const errors: string[] = [];

  const { data: rows } = await db.from("settings").select("key,value");
  const settings = Object.fromEntries(
    ((rows ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]),
  );
  const auto = { ...AUTOMATION_DEFAULTS, ...((settings["automations"] as object) ?? {}) };
  const reviewLink = typeof settings["review_link"] === "string" ? settings["review_link"] : "";

  /** Emails already sent of a type, keyed by job id (or customer id when no job). */
  async function alreadySent(type: string, by: "job_id" | "customer_id", ids: string[]) {
    if (!ids.length)
      return [] as { job_id: string | null; customer_id: string | null; body: string | null }[];
    const { data } = await db
      .from("activities")
      .select("job_id,customer_id,body")
      .eq("kind", "email")
      .in(by, ids)
      .like("body", `%"type":"${type}"%`);
    return (data ?? []) as {
      job_id: string | null;
      customer_id: string | null;
      body: string | null;
    }[];
  }

  /* ---------- day-before reminders ---------- */
  if (auto.reminders && evening) {
    const tomorrow = central(new Date(Date.now() + 86400000)).date;
    const { data } = await db
      .from("jobs")
      .select("*, customers(id,name,email,do_not_contact)")
      .eq("status", "confirmed")
      .eq("scheduled_date", tomorrow);
    const jobs = (data ?? []) as unknown as {
      id: string;
      number: number;
      customer_id: string;
      arrival_window: string | null;
      items: { label: string; amount: number }[];
      subtotal: number;
      tax: number;
      total: number;
      final_total: number | null;
      customers: Cust | null;
    }[];
    const done = new Set(
      (
        await alreadySent(
          "reminder",
          "job_id",
          jobs.map((j) => j.id),
        )
      ).map((a) => a.job_id),
    );
    for (const j of jobs) {
      if (done.has(j.id) || !canEmail(j.customers)) continue;
      const e = buildCustomerEmail("reminder", {
        name: j.customers.name,
        origin: SITE_ORIGIN,
        number: j.number,
        day: dayLabel(tomorrow),
        window: j.arrival_window ?? "",
        items: j.items,
        subtotal: Number(j.subtotal),
        tax: Number(j.tax),
        total: Number(j.final_total ?? j.total),
      });
      const r = await sendEmail({
        to: [j.customers.email],
        ...e,
        idempotencyKey: `auto-reminder-${j.id}-${tomorrow}`,
        log: { type: "reminder", customerId: j.customer_id, jobId: j.id },
      });
      if (r.ok) sent.reminders++;
      else errors.push(`reminder #${j.number}: ${r.error}`);
    }
  }

  /* ---------- quote follow-up after 2 days ---------- */
  if (auto.quote_followup && daytime) {
    const { data } = await db
      .from("quotes")
      .select("*, customers(id,name,email,do_not_contact)")
      .in("status", ["sent", "viewed"])
      .lte("sent_at", new Date(Date.now() - 48 * 3600000).toISOString())
      .gte("sent_at", new Date(Date.now() - 14 * 86400000).toISOString());
    const quotes = (data ?? []) as unknown as {
      id: string;
      number: number;
      token: string;
      customer_id: string;
      job_id: string | null;
      expires_at: string | null;
      items: { label: string; amount: number }[];
      subtotal: number;
      tax: number;
      total: number;
      customers: Cust | null;
    }[];
    const prior = await alreadySent(
      "quote_nudge",
      "customer_id",
      quotes.map((q) => q.customer_id),
    );
    for (const q of quotes) {
      if (!canEmail(q.customers)) continue;
      if (q.expires_at && q.expires_at < now.date) continue;
      if (prior.some((a) => a.customer_id === q.customer_id && a.body?.includes(`#${q.number}?`)))
        continue;
      const e = buildCustomerEmail("quote_nudge", {
        name: q.customers.name,
        origin: SITE_ORIGIN,
        link: `${SITE_ORIGIN}/quote/${q.token}`,
        number: q.number,
        items: q.items,
        subtotal: Number(q.subtotal),
        tax: Number(q.tax),
        total: Number(q.total),
      });
      const r = await sendEmail({
        to: [q.customers.email],
        ...e,
        idempotencyKey: `auto-quote-nudge-${q.id}`,
        log: { type: "quote_nudge", customerId: q.customer_id, jobId: q.job_id },
      });
      if (r.ok) sent.quote_followups++;
      else errors.push(`quote #${q.number}: ${r.error}`);
    }
  }

  /* ---------- review request the day after payment ---------- */
  if (auto.review && reviewLink && daytime) {
    const { data } = await db
      .from("invoices")
      .select("job_id, customer_id, paid_at, customers(id,name,email,do_not_contact)")
      .eq("status", "paid")
      .not("job_id", "is", null)
      .lte("paid_at", new Date(Date.now() - 20 * 3600000).toISOString())
      .gte("paid_at", new Date(Date.now() - 14 * 86400000).toISOString());
    const paid = (data ?? []) as unknown as {
      job_id: string;
      customer_id: string;
      customers: Cust | null;
    }[];
    const jobIds = [...new Set(paid.map((p) => p.job_id))];
    const done = new Set((await alreadySent("review", "job_id", jobIds)).map((a) => a.job_id));
    // One review request per customer, ever, is plenty.
    const { data: anyReview } = await db
      .from("activities")
      .select("customer_id,body")
      .eq("kind", "email")
      .in("customer_id", [...new Set(paid.map((p) => p.customer_id))])
      .like("body", '%"type":"review"%');
    const reviewed = new Set(
      ((anyReview ?? []) as { customer_id: string; body: string | null }[])
        .filter((a) => typeOf(a.body) === "review")
        .map((a) => a.customer_id),
    );
    const handled = new Set<string>();
    for (const p of paid) {
      if (done.has(p.job_id) || reviewed.has(p.customer_id) || handled.has(p.customer_id)) continue;
      if (!canEmail(p.customers)) continue;
      handled.add(p.customer_id);
      const e = buildCustomerEmail("review", {
        name: p.customers.name,
        origin: SITE_ORIGIN,
        link: reviewLink,
      });
      const r = await sendEmail({
        to: [p.customers.email],
        ...e,
        idempotencyKey: `auto-review-${p.customer_id}`,
        log: { type: "review", customerId: p.customer_id, jobId: p.job_id },
      });
      if (r.ok) sent.reviews++;
      else errors.push(`review ${p.customers.name}: ${r.error}`);
    }
  }

  return { ok: true, central_time: now, sent, errors };
}
