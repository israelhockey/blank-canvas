import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import {
  Empty,
  Panel,
  PageHeader,
  Stat,
  StatusPill,
  ago,
  fmtDay,
  isoDate,
  usd,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { sendCustomerEmail } from "@/lib/admin.functions";
import { fetchJobs, fetchLeads, logActivity, useRefresh } from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import type { Customer, Job, Task } from "@/lib/db-types";
import { publicOrigin } from "@/lib/site-data";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const weekAhead = new Date(Date.now() + 7 * 86400000);
  const [job, setJob] = useState<Job | null>(null);
  const refresh = useRefresh();
  const email = useServerFn(sendCustomerEmail);

  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const jobs = useQuery({
    queryKey: ["jobs", isoDate(today), isoDate(weekAhead)],
    queryFn: () => fetchJobs(isoDate(today), isoDate(weekAhead)),
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
      if (error) throw error;
      return data as Task[];
    },
  });
  const repeat = useQuery({
    queryKey: ["repeat-due"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("customers")
        .select("*")
        .lte("next_service_due", isoDate(today))
        .eq("do_not_contact", false)
        .order("next_service_due")
        .limit(30);
      if (error) throw error;
      return data as Customer[];
    },
  });
  const week = useQuery({
    queryKey: ["week-revenue"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await dbOrThrow()
        .from("invoices")
        .select("amount")
        .eq("status", "paid")
        .gte("paid_at", since);
      if (error) throw error;
      return (data as { amount: number }[]).reduce((s, r) => s + Number(r.amount), 0);
    },
  });

  const newLeads = (leads.data ?? []).filter((l) => l.status === "new");
  const slow = newLeads.filter((l) => Date.now() - new Date(l.created_at).getTime() > 15 * 60000);
  const todays = (jobs.data ?? []).filter(
    (j) => j.scheduled_date === isoDate(today) && j.status !== "canceled",
  );
  const tomorrows = (jobs.data ?? []).filter(
    (j) => j.scheduled_date === isoDate(tomorrow) && j.status !== "canceled",
  );
  const requested = (jobs.data ?? []).filter((j) => j.status === "requested");

  const remindAll = async () => {
    let sent = 0;
    for (const j of tomorrows) {
      if (!j.customers?.email) continue;
      const r = await email({
        data: {
          auth: await accessToken(),
          kind: "reminder",
          to: j.customers.email,
          name: j.customers.name,
          origin: publicOrigin(),
          day: fmtDay(j.scheduled_date),
          window: j.arrival_window ?? "",
          items: j.items,
          subtotal: Number(j.subtotal),
          tax: Number(j.tax),
          total: Number(j.final_total ?? j.total),
        },
      });
      if (r.ok) {
        sent++;
        await logActivity({
          customer_id: j.customer_id,
          job_id: j.id,
          kind: "email",
          body: "Sent reminder email",
        });
      } else toast.error(r.error);
    }
    toast.success(`${sent} reminder${sent === 1 ? "" : "s"} sent`);
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
    await logActivity({ customer_id: c.id, kind: "email", body: "Sent repeat-clean reminder" });
    toast.success("Reminder sent");
    void refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        sub={today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="New leads"
          value={newLeads.length}
          hint={slow.length ? `${slow.length} waiting 15+ min` : "All answered"}
        />
        <Stat label="Jobs today" value={todays.length} />
        <Stat label="To confirm" value={requested.length} hint="Booking requests" />
        <Stat label="Paid, last 7 days" value={usd(week.data ?? 0, 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="New leads"
          actions={
            <Link to="/admin/leads" search={{ id: undefined }} className="text-sm underline">
              All leads
            </Link>
          }
        >
          {newLeads.length ? (
            <ul className="divide-y">
              {newLeads.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.type} · {l.source || "direct"} · {ago(l.created_at)}
                    </div>
                  </div>
                  {Date.now() - new Date(l.created_at).getTime() > 15 * 60000 && (
                    <StatusPill value="spam" className="!bg-red-600 !text-white" />
                  )}
                  <Link to="/admin/leads" search={{ id: l.id }} className="text-sm underline">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No new leads. Nice work.</Empty>
          )}
        </Panel>

        <Panel
          title="Today & tomorrow"
          actions={
            tomorrows.length ? (
              <Button size="sm" variant="outline" onClick={remindAll}>
                Email tomorrow's reminders
              </Button>
            ) : null
          }
        >
          {todays.length + tomorrows.length ? (
            <ul className="divide-y">
              {[...todays, ...tomorrows].map((j) => (
                <li key={j.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
                    onClick={() => setJob(j)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{j.customers?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDay(j.scheduled_date)} · {j.arrival_window}
                      </span>
                    </span>
                    <StatusPill value={j.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing scheduled today or tomorrow.</Empty>
          )}
        </Panel>

        <Panel title="Follow-ups">
          {(tasks.data ?? []).length ? (
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
            </ul>
          ) : (
            <Empty>No open follow-ups.</Empty>
          )}
        </Panel>

        <Panel title="Due for a repeat clean">
          {(repeat.data ?? []).length ? (
            <ul className="divide-y">
              {(repeat.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link
                    to="/admin/customers/$id"
                    params={{ id: c.id }}
                    className="truncate underline"
                  >
                    {c.name}
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => void sendRepeat(c)}>
                    Email reminder
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No one is due yet. Customers show up here 6 months after a completed job.</Empty>
          )}
        </Panel>
      </div>

      <JobDialog job={job} onClose={() => setJob(null)} />
    </div>
  );
}
