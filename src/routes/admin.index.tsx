import { useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone } from "lucide-react";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import {
  Empty,
  Panel,
  PageHeader,
  StatusPill,
  ago,
  fmtDay,
  isoDate,
  telHref,
  usd,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { sendCustomerEmail } from "@/lib/admin.functions";
import { fetchLeads, useRefresh } from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import type { Customer, Job, Lead, Quote, Task } from "@/lib/db-types";
import { publicOrigin } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({ component: Home });

type ActiveJob = Job & { invoices: { status: string }[] };

const LEAD_LABEL: Record<string, string> = {
  booking: "Booking request",
  walkthrough: "Walkthrough request",
  quote: "Quote request",
  contact: "Call back",
};

/** One row in "Needs you": who, what, and the button that handles it. */
type Todo = {
  key: string;
  at: string;
  tone: "red" | "amber" | "blue" | "green";
  title: string;
  who: string;
  sub: string;
  action: ReactNode;
  onOpen?: () => void;
  to?: string;
};

function Home() {
  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 86400000));
  const weekAhead = isoDate(new Date(Date.now() + 7 * 86400000));
  const [job, setJob] = useState<Job | null>(null);
  const refresh = useRefresh();
  const email = useServerFn(sendCustomerEmail);

  const jobs = useQuery({
    queryKey: ["jobs", "active"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("jobs")
        .select("*, customers(id,name,phone,email), invoices(status)")
        .in("status", ["requested", "confirmed", "completed"])
        .order("scheduled_date", { ascending: true, nullsFirst: true })
        .limit(400);
      if (error) throw new Error(error.message);
      return data as ActiveJob[];
    },
  });
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const quotes = useQuery({
    queryKey: ["quotes", "open"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("quotes")
        .select("*, customers(id,name,phone,email)")
        .in("status", ["sent", "viewed"])
        .order("sent_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Quote[];
    },
  });
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("tasks")
        .select("*, customers(id,name)")
        .is("done_at", null)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data as Task[];
    },
  });
  const repeat = useQuery({
    queryKey: ["repeat-due"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("customers")
        .select("*")
        .lte("next_service_due", today)
        .eq("do_not_contact", false)
        .order("next_service_due")
        .limit(30);
      if (error) throw new Error(error.message);
      return data as Customer[];
    },
  });
  const paid7 = useQuery({
    queryKey: ["week-revenue"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await dbOrThrow()
        .from("invoices")
        .select("amount")
        .eq("status", "paid")
        .gte("paid_at", since);
      if (error) throw new Error(error.message);
      return (data as { amount: number }[]).reduce((s, r) => s + Number(r.amount), 0);
    },
  });

  const all = jobs.data ?? [];
  const isPaid = (j: ActiveJob) => j.invoices?.some((i) => i.status === "paid");
  const jobLeadIds = new Set(all.map((j) => j.lead_id).filter(Boolean));

  /* ---------- Needs you ---------- */
  const todos: Todo[] = [];
  for (const j of all) {
    const name = j.customers?.name ?? "Customer";
    const money = usd(j.final_total ?? j.total, 0);
    const open = () => setJob(j);
    if (j.status === "requested" && j.scheduled_date) {
      todos.push({
        key: j.id,
        at: j.created_at,
        tone: "amber",
        title: "Confirm booking",
        who: name,
        sub: `${fmtDay(j.scheduled_date)} · ${j.arrival_window ?? ""} · ${money} · came in ${ago(j.created_at)}`,
        action: <Button size="sm">Confirm</Button>,
        onOpen: open,
      });
    } else if (j.status === "requested") {
      todos.push({
        key: j.id,
        at: j.created_at,
        tone: "amber",
        title: "Pick a date",
        who: name,
        sub: `${money} · ${j.notes?.startsWith("Booked from quote") ? j.notes : "No date yet"}`,
        action: <Button size="sm">Schedule</Button>,
        onOpen: open,
      });
    } else if (j.status === "confirmed" && j.scheduled_date && j.scheduled_date < today) {
      todos.push({
        key: j.id,
        at: j.scheduled_date,
        tone: "blue",
        title: "Mark done",
        who: name,
        sub: `Was booked ${fmtDay(j.scheduled_date)} · ${money}`,
        action: <Button size="sm">Mark done</Button>,
        onOpen: open,
      });
    } else if (j.status === "completed" && !isPaid(j)) {
      todos.push({
        key: j.id,
        at: j.completed_at ?? j.created_at,
        tone: "green",
        title: "Get paid",
        who: name,
        sub: `${money} · done ${fmtDay(j.scheduled_date)}`,
        action: <Button size="sm">Get paid</Button>,
        onOpen: open,
      });
    }
  }
  for (const l of leads.data ?? []) {
    if (l.status !== "new" || (l.type === "booking" && jobLeadIds.has(l.id))) continue;
    const late = Date.now() - new Date(l.created_at).getTime() > 15 * 60000;
    todos.push({
      key: l.id,
      at: l.created_at,
      tone: late ? "red" : "amber",
      title: leadTitle(l),
      who: l.name ?? "Website visitor",
      sub: `${leadSummary(l)} · ${ago(l.created_at)}`,
      action: <LeadActions lead={l} onDone={refresh} />,
      ...(l.customer_id ? { to: l.customer_id } : {}),
    });
  }
  const toneOrder = { red: 0, amber: 1, blue: 2, green: 3 };
  todos.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || a.at.localeCompare(b.at));

  /* ---------- Schedule ---------- */
  const upcoming = all.filter(
    (j) =>
      j.scheduled_date &&
      j.scheduled_date >= today &&
      j.scheduled_date <= weekAhead &&
      j.status !== "completed",
  );
  const tomorrows = upcoming.filter(
    (j) => j.scheduled_date === tomorrow && j.status === "confirmed" && j.customers?.email,
  );

  const remindAll = async () => {
    let sent = 0;
    for (const j of tomorrows) {
      const r = await email({
        data: {
          auth: await accessToken(),
          kind: "reminder",
          to: j.customers!.email!,
          name: j.customers!.name,
          origin: publicOrigin(),
          customerId: j.customer_id,
          jobId: j.id,
          number: j.number,
          day: fmtDay(j.scheduled_date),
          window: j.arrival_window ?? "",
          items: j.items,
          subtotal: Number(j.subtotal),
          tax: Number(j.tax),
          total: Number(j.final_total ?? j.total),
        },
      });
      if (r.ok) sent++;
      else toast.error(`${j.customers!.name}: ${r.error}`);
    }
    if (sent) toast.success(`${sent} reminder${sent === 1 ? "" : "s"} sent`);
    void refresh();
  };

  const sendRepeat = async (c: Customer) => {
    if (!c.email) {
      toast.error("No email on file. Text them instead.");
      return;
    }
    const r = await email({
      data: {
        auth: await accessToken(),
        kind: "repeat",
        to: c.email,
        name: c.name,
        origin: publicOrigin(),
        link: publicOrigin(),
        customerId: c.id,
      },
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await dbOrThrow()
      .from("customers")
      .update({ next_service_due: isoDate(next) })
      .eq("id", c.id);
    toast.success("Reminder sent");
    void refresh();
  };

  const loading = jobs.isLoading || leads.isLoading;
  const waitingQuotes = quotes.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Home"
        sub={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile href="#needs" label="Needs you" value={todos.length} hot={todos.length > 0} />
        <Tile href="#week" label="Next 7 days" value={upcoming.length} />
        <Tile
          href="#quotes"
          label="Quotes out"
          value={waitingQuotes.length}
          hint={usd(
            waitingQuotes.reduce((s, q) => s + Number(q.total), 0),
            0,
          )}
        />
        <Tile label="Paid, 7 days" value={usd(paid7.data ?? 0, 0)} />
      </div>

      <Panel title="Needs you" className="scroll-mt-20" actions={null}>
        <div id="needs" />
        {loading ? (
          <Empty>Loading…</Empty>
        ) : todos.length ? (
          <ul className="divide-y">
            {todos.map((t) => (
              <TodoRow key={t.key} t={t} />
            ))}
          </ul>
        ) : (
          <Empty>You're all caught up. New bookings and leads show up here.</Empty>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Next 7 days"
          actions={
            tomorrows.length ? (
              <Button size="sm" variant="outline" onClick={() => void remindAll()}>
                Email tomorrow's reminders ({tomorrows.length})
              </Button>
            ) : (
              <Link to="/admin/calendar" className="text-sm underline">
                Calendar
              </Link>
            )
          }
        >
          <div id="week" className="scroll-mt-20" />
          {upcoming.length ? (
            <ul className="divide-y">
              {upcoming.map((j) => (
                <li key={j.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-muted/50"
                    onClick={() => setJob(j)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{j.customers?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {j.scheduled_date === today ? "Today" : fmtDay(j.scheduled_date)} ·{" "}
                        {j.arrival_window} · {usd(j.final_total ?? j.total, 0)}
                      </span>
                    </span>
                    <StatusPill value={j.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing booked in the next 7 days.</Empty>
          )}
        </Panel>

        <Panel
          title="Quotes waiting on the customer"
          actions={
            <Link to="/admin/quotes" className="text-sm underline">
              All quotes
            </Link>
          }
        >
          <div id="quotes" className="scroll-mt-20" />
          {waitingQuotes.length ? (
            <ul className="divide-y">
              {waitingQuotes.map((q) => (
                <li key={q.id}>
                  <Link
                    to="/admin/quotes/$id"
                    params={{ id: q.id }}
                    search={{ customer: undefined }}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {q.customers?.name} · #{q.number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {usd(q.total, 0)} · sent {q.sent_at ? ago(q.sent_at) : "–"}
                        {q.status === "viewed" ? " · they opened it" : ""}
                      </span>
                    </span>
                    <StatusPill value={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No quotes out right now.</Empty>
          )}
        </Panel>

        <Panel title="Follow-ups">
          {(tasks.data ?? []).length || (repeat.data ?? []).length ? (
            <ul className="divide-y">
              {(tasks.data ?? []).slice(0, 10).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.customers?.name}
                      {t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await dbOrThrow()
                        .from("tasks")
                        .update({ done_at: new Date().toISOString() })
                        .eq("id", t.id);
                      void refresh();
                    }}
                  >
                    Done
                  </Button>
                </li>
              ))}
              {(repeat.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: c.id }}
                      className="block truncate underline"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">Due for a repeat clean</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => void sendRepeat(c)}>
                    Email reminder
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              No follow-ups. Past customers show up here when they're due for another clean.
            </Empty>
          )}
        </Panel>
      </div>

      <JobDialog job={job} onClose={() => setJob(null)} />
    </div>
  );
}

function leadTitle(l: Lead) {
  const d = l.details as Record<string, unknown>;
  if (d["partial"]) return "Didn't finish booking: call them";
  if (d["from"] === "price_builder") return "Saved their price: call to book";
  if (d["from"] === "quick_form") return "Quick quote: text them a price";
  if (d["from"] === "whatsapp") return "WhatsApp lead: reply on WhatsApp";
  return LEAD_LABEL[l.type] ?? l.type;
}

function leadSummary(l: Lead) {
  const d = l.details as Record<string, unknown>;
  const total = d["total"] ? `$${Math.round(Number(d["total"]))}` : "";
  const items = Array.isArray(d["items"])
    ? (d["items"] as { label: string }[]).map((i) => i.label).join(", ")
    : "";
  const wants = Array.isArray(d["wants"]) ? (d["wants"] as string[]).join(", ") : "";
  if (l.type === "quote" || d["partial"])
    return [l.phone, items || wants, total].filter(Boolean).join(" · ") || "website";
  if (l.type === "walkthrough")
    return [
      d["business"],
      d["sqft"] ? `${Number(d["sqft"]).toLocaleString()} sq ft` : "",
      d["frequency"],
    ]
      .filter(Boolean)
      .join(" · ");
  return [l.phone, l.zip].filter(Boolean).join(" · ") || (l.source ?? "website");
}

function LeadActions({ lead, onDone }: { lead: Lead; onDone: () => unknown }) {
  return (
    <span className="flex gap-1.5">
      {lead.phone && (
        <Button asChild size="sm">
          <a href={telHref(lead.phone)}>
            <Phone className="size-3.5" /> Call
          </a>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await dbOrThrow()
            .from("leads")
            .update({ status: "contacted", first_response_at: new Date().toISOString() })
            .eq("id", lead.id);
          if (lead.customer_id)
            await dbOrThrow()
              .from("customers")
              .update({ stage: "contacted", updated_at: new Date().toISOString() })
              .eq("id", lead.customer_id)
              .eq("stage", "new");
          toast.success("Marked as contacted");
          void onDone();
        }}
      >
        Contacted
      </Button>
    </span>
  );
}

const TONE_DOT = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
};

function TodoRow({ t }: { t: Todo }) {
  const body = (
    <>
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", TONE_DOT[t.tone])} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.title}
        </span>
        <span className="block truncate font-medium">{t.who}</span>
        <span className="block truncate text-xs text-muted-foreground">{t.sub}</span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      {t.onOpen ? (
        <button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={t.onOpen}>
          {body}
        </button>
      ) : t.to ? (
        <Link
          to="/admin/customers/$id"
          params={{ id: t.to }}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          {body}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-start gap-3">{body}</span>
      )}
      <span onClick={t.onOpen} className="shrink-0">
        {t.action}
      </span>
    </li>
  );
}

function Tile({
  label,
  value,
  hint,
  href,
  hot,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  hot?: boolean;
}) {
  const inner = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", hot && "text-primary")}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  const cls = cn(
    "rounded-xl border bg-card p-4 shadow-sm",
    href && "transition hover:border-primary/50 hover:shadow",
    hot && "border-primary/40",
  );
  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
