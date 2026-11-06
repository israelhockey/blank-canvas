import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { dbOrThrow } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Empty, Panel, Stat, usd } from "./ui";

/*
 * Business numbers that Google Analytics can't see: which sources turn into paid jobs, revenue,
 * how leads arrive, how fast we answer, quote win rate, and where the work is.
 * Everything comes from our own tables (team-only), for the date range picked on the Stats page.
 */

type LeadRow = {
  id: string;
  type: string;
  status: string;
  source: string | null;
  customer_id: string | null;
  zip: string | null;
  page: string | null;
  details: Record<string, unknown>;
  first_response_at: string | null;
  created_at: string;
};
type JobRow = {
  id: string;
  lead_id: string | null;
  customer_id: string;
  status: string;
  zip: string | null;
  address: string | null;
  created_at: string;
  customers: { source: string | null } | null;
};
type PaidRow = {
  amount: number;
  paid_at: string;
  customer_id: string;
  job_id: string | null;
  customers: { source: string | null } | null;
  jobs: { zip: string | null; address: string | null } | null;
};
type QuoteRow = { status: string; total: number; created_at: string };
type ActRow = {
  customer_id: string | null;
  kind: string;
  body: string | null;
  created_at: string;
  created_by: string | null;
};

/** "keller-moms / facebook" → "keller-moms"; "m.facebook.com" → "facebook". */
export function sourceName(raw: string | null | undefined) {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "direct") return "direct";
  const first = s.split(" / ")[0]!.trim();
  if (/(^|\.)facebook\.com$|^fb$|^l\.facebook|^lm\.facebook/.test(first)) return "facebook";
  if (/(^|\.)instagram\.com$/.test(first)) return "instagram";
  if (/(^|\.)google\./.test(first)) return "google";
  if (/(^|\.)bing\.com$/.test(first)) return "bing";
  if (/(^|\.)nextdoor\.com$/.test(first)) return "nextdoor";
  if (/(^|\.)yelp\.com$/.test(first)) return "yelp";
  return first.replace(/^www\./, "");
}

/** Best-guess area for the ZIP codes we serve; anything else shows the ZIP alone. */
const ZIP_AREA: Record<string, string> = {
  "76092": "Southlake",
  "76248": "Keller",
  "76244": "Keller / N. Fort Worth",
  "76180": "North Richland Hills",
  "76182": "North Richland Hills",
  "76053": "Hurst",
  "76054": "Hurst",
  "76039": "Euless",
  "76040": "Euless",
  "76021": "Bedford",
  "76022": "Bedford",
  "76117": "Haltom City",
  "76126": "Benbrook",
  "76028": "Burleson",
  "76179": "Saginaw",
};
function areaFor(zip: string) {
  if (ZIP_AREA[zip]) return ZIP_AREA[zip]!;
  const n = Number(zip);
  if ((n >= 76001 && n <= 76006) || (n >= 76010 && n <= 76019)) return "Arlington";
  if (n >= 76101 && n <= 76199) return "Fort Worth";
  return "";
}
const zipOf = (zip: string | null, address: string | null) =>
  zip || /\b(7\d{4})\b/.exec(address ?? "")?.[1] || "";

const LEAD_KIND: Record<string, string> = {
  booking: "Full online booking",
  partial: "Started booking, didn't finish",
  price_builder: "Saved their price",
  quick_form: "Quick quote",
  whatsapp: "WhatsApp button",
  stain_guide: "Stain guide download",
  walkthrough: "Commercial walkthrough",
  quote: "Quote request",
  contact: "Contact form",
};
function leadKind(l: LeadRow) {
  if (l.details?.["partial"]) return "partial";
  const from = l.details?.["from"];
  if (["price_builder", "quick_form", "whatsapp", "stain_guide"].includes(String(from)))
    return String(from);
  return l.type;
}

const TEAM_TOUCH = /"type":"(confirm|quote|custom|reminder)"/;

async function load(fromIso: string, toIso: string) {
  const c = dbOrThrow();
  const [leads, jobs, paid, quotes] = await Promise.all([
    c
      .from("leads")
      .select("id,type,status,source,customer_id,zip,page,details,first_response_at,created_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .limit(5000),
    c
      .from("jobs")
      .select("id,lead_id,customer_id,status,zip,address,created_at,customers(source)")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .limit(5000),
    c
      .from("invoices")
      .select("amount,paid_at,customer_id,job_id,customers(source),jobs(zip,address)")
      .eq("status", "paid")
      .gte("paid_at", fromIso)
      .lt("paid_at", toIso)
      .limit(5000),
    c
      .from("quotes")
      .select("status,total,created_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .limit(5000),
  ]);
  for (const r of [leads, jobs, paid, quotes]) if (r.error) throw new Error(r.error.message);
  const L = (leads.data ?? []) as LeadRow[];
  const custIds = [...new Set(L.map((l) => l.customer_id).filter(Boolean))] as string[];
  let acts: ActRow[] = [];
  let laterJobs: { customer_id: string; created_at: string; status: string }[] = [];
  if (custIds.length) {
    const [a, j] = await Promise.all([
      c
        .from("activities")
        .select("customer_id,kind,body,created_at,created_by")
        .in("customer_id", custIds.slice(0, 300))
        .gte("created_at", fromIso)
        .limit(5000),
      c
        .from("jobs")
        .select("customer_id,created_at,status")
        .in("customer_id", custIds.slice(0, 300))
        .gte("created_at", fromIso)
        .limit(5000),
    ]);
    acts = (a.data ?? []) as ActRow[];
    laterJobs = (j.data ?? []) as typeof laterJobs;
  }
  return {
    leads: L,
    jobs: (jobs.data ?? []) as unknown as JobRow[],
    paid: (paid.data ?? []) as unknown as PaidRow[],
    quotes: (quotes.data ?? []) as QuoteRow[],
    acts,
    laterJobs,
  };
}

export function BusinessStats({
  from,
  to,
  visitorsBySource,
}: {
  from: Date;
  to: Date;
  visitorsBySource: { source: string; visitors: number }[];
}) {
  const q = useQuery({
    queryKey: ["business-stats", from.toISOString().slice(0, 10), to.toISOString().slice(0, 13)],
    queryFn: () => load(from.toISOString(), to.toISOString()),
  });
  if (q.isLoading) return <Empty>Loading business numbers…</Empty>;
  if (q.error || !q.data) return <Empty>Couldn't load business numbers.</Empty>;
  const d = q.data;

  /* did a lead turn into a job? */
  const jobByLead = new Set(d.jobs.filter((j) => j.status !== "canceled").map((j) => j.lead_id));
  const converted = (l: LeadRow) =>
    ["booked", "won"].includes(l.status) ||
    jobByLead.has(l.id) ||
    d.laterJobs.some(
      (j) =>
        j.customer_id === l.customer_id && j.status !== "canceled" && j.created_at >= l.created_at,
    );

  /* 1. sources: visitors → leads → booked → paid */
  const src = new Map<string, { visitors: number; leads: number; booked: number; paid: number }>();
  const row = (k: string) => {
    if (!src.has(k)) src.set(k, { visitors: 0, leads: 0, booked: 0, paid: 0 });
    return src.get(k)!;
  };
  for (const v of visitorsBySource) row(sourceName(v.source)).visitors += Number(v.visitors);
  for (const l of d.leads) row(sourceName(l.source)).leads++;
  for (const j of d.jobs)
    if (j.status !== "canceled") row(sourceName(j.customers?.source)).booked++;
  for (const p of d.paid) row(sourceName(p.customers?.source)).paid += Number(p.amount);
  const sources = [...src.entries()]
    .map(([k, v]) => ({ k, ...v }))
    .filter((r) => r.leads || r.booked || r.paid || r.visitors >= 3)
    .sort((a, b) => b.paid - a.paid || b.booked - a.booked || b.leads - a.leads)
    .slice(0, 15);

  /* 2. revenue by week */
  const weekOf = (iso: string) => {
    const t = new Date(iso);
    const m = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7));
    return m.toISOString().slice(0, 10);
  };
  const weeks = new Map<string, { revenue: number; jobs: number }>();
  for (const p of d.paid) {
    const w = weeks.get(weekOf(p.paid_at)) ?? { revenue: 0, jobs: 0 };
    w.revenue += Number(p.amount);
    w.jobs++;
    weeks.set(weekOf(p.paid_at), w);
  }
  const weekly = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, ...v, revenue: Math.round(v.revenue) }));
  const revenue = d.paid.reduce((s, p) => s + Number(p.amount), 0);
  const avgTicket = d.paid.length ? revenue / d.paid.length : 0;

  /* 3. lead types */
  const kinds = new Map<string, { n: number; won: number }>();
  for (const l of d.leads) {
    const k = leadKind(l);
    const v = kinds.get(k) ?? { n: 0, won: 0 };
    v.n++;
    if (converted(l)) v.won++;
    kinds.set(k, v);
  }
  const kindRows = [...kinds.entries()].sort((a, b) => b[1].n - a[1].n);
  const leadsWon = d.leads.filter(converted).length;

  /* 4. response time: first team touch after the lead came in */
  const waits: number[] = [];
  let unanswered = 0;
  for (const l of d.leads) {
    if (l.details?.["partial"] && converted(l)) continue; // they finished on their own
    const t0 = new Date(l.created_at).getTime();
    const touches = [
      l.first_response_at ? new Date(l.first_response_at).getTime() : Infinity,
      ...d.acts
        .filter(
          (a) =>
            a.customer_id === l.customer_id &&
            new Date(a.created_at).getTime() >= t0 &&
            (a.created_by !== null || (a.kind === "email" && TEAM_TOUCH.test(a.body ?? ""))),
        )
        .map((a) => new Date(a.created_at).getTime()),
    ];
    const first = Math.min(...touches);
    if (first === Infinity) unanswered++;
    else waits.push((first - t0) / 60000);
  }
  waits.sort((a, b) => a - b);
  const median = waits.length ? waits[Math.floor(waits.length / 2)]! : null;
  const slow = waits.filter((m) => m > 15).length;
  const fmtMin = (m: number | null) =>
    m == null ? "–" : m < 60 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} hr`;

  /* 5. quotes */
  const sentQ = d.quotes.filter((x) => x.status !== "draft");
  const wonQ = sentQ.filter((x) => x.status === "accepted");
  const lostQ = sentQ.filter((x) => ["declined", "expired"].includes(x.status));
  const openQ = sentQ.filter((x) => ["sent", "viewed"].includes(x.status));
  const sum = (a: QuoteRow[]) => a.reduce((s, x) => s + Number(x.total), 0);

  /* 6. areas */
  const areas = new Map<string, { leads: number; revenue: number }>();
  const area = (zip: string) => {
    const k = zip ? `${zip}${areaFor(zip) ? ` · ${areaFor(zip)}` : ""}` : "No ZIP";
    if (!areas.has(k)) areas.set(k, { leads: 0, revenue: 0 });
    return areas.get(k)!;
  };
  for (const l of d.leads) area(l.zip ?? "").leads++;
  for (const p of d.paid)
    area(zipOf(p.jobs?.zip ?? null, p.jobs?.address ?? null)).revenue += Number(p.amount);
  const areaRows = [...areas.entries()]
    .filter(([k]) => k !== "No ZIP")
    .sort((a, b) => b[1].revenue - a[1].revenue || b[1].leads - a[1].leads)
    .slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paid revenue" value={usd(revenue, 0)} hint={`${d.paid.length} payments`} />
        <Stat label="Average job" value={usd(avgTicket, 0)} />
        <Stat
          label="Leads → jobs"
          value={d.leads.length ? `${Math.round((leadsWon / d.leads.length) * 100)}%` : "–"}
          hint={`${leadsWon} of ${d.leads.length} leads`}
        />
        <Stat
          label="Typical response"
          value={fmtMin(median)}
          hint={slow || unanswered ? `${slow} over 15 min · ${unanswered} not answered` : "Nice"}
        />
      </div>

      <Panel title="Where the money comes from">
        {sources.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3 text-right">Visitors</th>
                  <th className="py-2 pr-3 text-right">Leads</th>
                  <th className="py-2 pr-3 text-right">Jobs booked</th>
                  <th className="py-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.k} className="border-b last:border-0">
                    <td className="max-w-48 truncate py-2 pr-3 font-medium">{r.k}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.visitors || "–"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.leads}
                      {r.visitors ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({Math.round((r.leads / r.visitors) * 100)}%)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.booked}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{usd(r.paid, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No leads in this range yet.</Empty>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Jobs and money are credited to where the customer first came from. Give each group post
          its own link, like <code>?utm_source=keller-moms</code>, to see it as its own row.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Paid revenue by week">
          {weekly.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="week"
                    fontSize={12}
                    tickFormatter={(w: string) =>
                      new Date(`${w}T12:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    formatter={(v: number, k: string) => (k === "revenue" ? usd(v, 0) : v)}
                    labelFormatter={(w: string) => `Week of ${w}`}
                  />
                  <Bar dataKey="revenue" name="revenue" fill="#1650ec" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty>No payments in this range yet.</Empty>
          )}
        </Panel>

        <Panel title="How leads come in">
          {kindRows.length ? (
            <ul className="space-y-2 text-sm">
              {kindRows.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <span>{LEAD_KIND[k] ?? k}</span>
                  <span className="tabular-nums">
                    <b>{v.n}</b>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {v.won} booked ({Math.round((v.won / v.n) * 100)}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No leads in this range yet.</Empty>
          )}
        </Panel>

        <Panel title="Response speed">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Typical wait" value={fmtMin(median)} />
            <Mini label="Over 15 min" value={String(slow)} bad={slow > 0} />
            <Mini label="Not answered" value={String(unanswered)} bad={unanswered > 0} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Time from the lead coming in to your first call, text, note, confirmation or quote. Tap
            "Contacted" on Home after you call so it counts. Answering within 5 minutes wins the
            most jobs.
          </p>
        </Panel>

        <Panel title="Quotes">
          {sentQ.length ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini
                  label="Win rate"
                  value={`${Math.round((wonQ.length / Math.max(1, wonQ.length + lostQ.length + openQ.length)) * 100)}%`}
                />
                <Mini label="Won" value={usd(sum(wonQ), 0)} />
                <Mini label="Open" value={usd(sum(openQ), 0)} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {sentQ.length} sent · {wonQ.length} accepted · {openQ.length} waiting ·{" "}
                {lostQ.length} declined or expired ({usd(sum(lostQ), 0)})
              </p>
            </>
          ) : (
            <Empty>No quotes sent in this range.</Empty>
          )}
        </Panel>
      </div>

      <Panel title="Top areas">
        {areaRows.length ? (
          <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {areaRows.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="truncate">{k}</span>
                <span className="tabular-nums text-muted-foreground">
                  {v.leads} lead{v.leads === 1 ? "" : "s"} ·{" "}
                  <b className="text-foreground">{usd(v.revenue, 0)}</b>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No ZIP codes yet.</Empty>
        )}
      </Panel>
    </div>
  );
}

function Mini({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className={cn("text-xl font-bold tabular-nums", bad && "text-red-600")}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
