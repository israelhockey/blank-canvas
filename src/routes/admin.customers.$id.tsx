import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import {
  Empty,
  Field,
  PageHeader,
  Panel,
  StatusPill,
  fmtDate,
  fmtDateTime,
  fmtDay,
  selectClass,
  smsHref,
  telHref,
  usd,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logActivity, setCustomerStage, useRefresh } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import {
  STAGES,
  type Activity,
  type Customer,
  type Invoice,
  type Job,
  type Lead,
  type Quote,
  type Stage,
  type Task,
} from "@/lib/db-types";
import { ARRIVAL_WINDOWS } from "@/lib/site-data";

export const Route = createFileRoute("/admin/customers/$id")({ component: CustomerPage });

type Bundle = {
  customer: Customer;
  leads: Lead[];
  jobs: Job[];
  quotes: Quote[];
  invoices: Invoice[];
  activities: Activity[];
  tasks: Task[];
};

async function load(id: string): Promise<Bundle> {
  const c = dbOrThrow();
  const [cu, le, jo, qu, inv, ac, ta] = await Promise.all([
    c.from("customers").select("*").eq("id", id).single(),
    c.from("leads").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    c
      .from("jobs")
      .select("*, customers(id,name,phone,email)")
      .eq("customer_id", id)
      .order("scheduled_date", { ascending: false, nullsFirst: true }),
    c.from("quotes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    c.from("invoices").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    c
      .from("activities")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    c.from("tasks").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (cu.error) throw new Error(cu.error.message);
  return {
    customer: cu.data as Customer,
    leads: (le.data ?? []) as Lead[],
    jobs: (jo.data ?? []) as Job[],
    quotes: (qu.data ?? []) as Quote[],
    invoices: (inv.data ?? []) as Invoice[],
    activities: (ac.data ?? []) as Activity[],
    tasks: (ta.data ?? []) as Task[],
  };
}

function CustomerPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["customer", id], queryFn: () => load(id) });
  const [job, setJob] = useState<Job | null>(null);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.error || !q.data) return <Empty>Customer not found.</Empty>;
  const b = q.data;
  const lifetime = b.invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={b.customer.name}
        sub={[
          b.customer.company,
          b.customer.source && `Came from ${b.customer.source}`,
          `Customer since ${fmtDate(b.customer.created_at)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {b.customer.phone && (
              <Button asChild>
                <a href={telHref(b.customer.phone)}>Call</a>
              </Button>
            )}
            {b.customer.phone && (
              <Button asChild variant="outline">
                <a href={smsHref(b.customer.phone)}>Text</a>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/admin/quotes/$id" params={{ id: "new" }} search={{ customer: id }}>
                New quote
              </Link>
            </Button>
            <NewJob customerId={id} onCreated={setJob} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Details customer={b.customer} lifetime={lifetime} />
          <TasksPanel customerId={id} tasks={b.tasks} />
        </div>
        <div className="space-y-4">
          <Panel title={`Jobs (${b.jobs.length})`}>
            {b.jobs.length ? (
              <ul className="divide-y">
                {b.jobs.map((j) => (
                  <li key={j.id}>
                    <button
                      onClick={() => setJob(j)}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm"
                    >
                      <span>
                        #{j.number} · {fmtDay(j.scheduled_date)} {j.arrival_window ?? ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{usd(j.final_total ?? j.total)}</span>
                        <StatusPill value={j.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No jobs yet.</Empty>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Quotes">
              {b.quotes.length ? (
                <ul className="divide-y text-sm">
                  {b.quotes.map((x) => (
                    <li key={x.id} className="flex items-center justify-between py-2">
                      <Link
                        to="/admin/quotes/$id"
                        params={{ id: x.id }}
                        search={{ customer: undefined }}
                        className="underline"
                      >
                        #{x.number} {x.title}
                      </Link>
                      <span className="flex items-center gap-2">
                        <span>{usd(x.total)}</span>
                        <StatusPill value={x.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No quotes.</Empty>
              )}
            </Panel>
            <Panel title="Payments">
              {b.invoices.length ? (
                <ul className="divide-y text-sm">
                  {b.invoices.map((x) => (
                    <li key={x.id} className="flex items-center justify-between py-2">
                      <span className="capitalize">
                        {x.method} · {fmtDate(x.paid_at ?? x.created_at)}
                      </span>
                      <span className="flex items-center gap-2">
                        <span>{usd(x.amount)}</span>
                        <StatusPill value={x.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No payments yet.</Empty>
              )}
            </Panel>
          </div>

          <Timeline customerId={id} activities={b.activities} leads={b.leads} />
        </div>
      </div>

      <JobDialog job={job} onClose={() => setJob(null)} />
    </div>
  );
}

function Details({ customer, lifetime }: { customer: Customer; lifetime: number }) {
  const refresh = useRefresh();
  const [c, setC] = useState(customer);
  useEffect(() => setC(customer), [customer]);

  const save = async () => {
    let digits = (c.phone ?? "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    const { error } = await dbOrThrow()
      .from("customers")
      .update({
        name: c.name,
        company: c.company || null,
        phone: c.phone || null,
        phone_digits: digits.length === 10 ? digits : null,
        email: c.email || null,
        tags: c.tags,
        notes: c.notes || null,
        sourced_by: c.sourced_by,
        do_not_contact: c.do_not_contact,
        next_service_due: c.next_service_due || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    void refresh();
  };

  return (
    <Panel title="Details">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Lifetime paid</span>
        <span className="font-bold">{usd(lifetime)}</span>
      </div>
      <div className="grid gap-3">
        <Field label="Stage">
          <select
            className={selectClass}
            value={c.stage}
            onChange={async (e) => {
              const stage = e.target.value as Stage;
              setC({ ...c, stage });
              await setCustomerStage(c.id, stage);
              void refresh();
            }}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        </Field>
        <Field label="Company">
          <Input
            value={c.company ?? ""}
            onChange={(e) => setC({ ...c, company: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={c.email ?? ""}
            onChange={(e) => setC({ ...c, email: e.target.value })}
          />
        </Field>
        <Field label="Tags (comma separated)">
          <Input
            value={c.tags.join(", ")}
            onChange={(e) =>
              setC({
                ...c,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="pets, landlord, gym"
          />
        </Field>
        <Field label="Brought in by">
          <select
            className={selectClass}
            value={c.sourced_by}
            onChange={(e) => setC({ ...c, sourced_by: e.target.value as Customer["sourced_by"] })}
          >
            <option value="partner">Partner (marketing / website)</option>
            <option value="owner">Owner (his own customer)</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Next clean due">
          <Input
            type="date"
            value={c.next_service_due ?? ""}
            onChange={(e) => setC({ ...c, next_service_due: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={c.notes ?? ""}
            onChange={(e) => setC({ ...c, notes: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={c.do_not_contact}
            onChange={(e) => setC({ ...c, do_not_contact: e.target.checked })}
          />
          Do not contact
        </label>
        <Button onClick={() => void save()}>Save details</Button>
      </div>
    </Panel>
  );
}

function TasksPanel({ customerId, tasks }: { customerId: string; tasks: Task[] }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <Panel title="Follow-ups">
      <ul className="mb-3 space-y-1 text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!t.done_at}
              onChange={async (e) => {
                await dbOrThrow()
                  .from("tasks")
                  .update({ done_at: e.target.checked ? new Date().toISOString() : null })
                  .eq("id", t.id);
                void refresh();
              }}
            />
            <span className={t.done_at ? "text-muted-foreground line-through" : ""}>{t.title}</span>
            {t.due_at && (
              <span className="ml-auto text-xs text-muted-foreground">{fmtDate(t.due_at)}</span>
            )}
          </li>
        ))}
        {!tasks.length && <li className="text-muted-foreground">None.</li>}
      </ul>
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Call back Friday"
        />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-36" />
        <Button
          variant="outline"
          disabled={!title.trim()}
          onClick={async () => {
            await dbOrThrow()
              .from("tasks")
              .insert({
                customer_id: customerId,
                title: title.trim(),
                due_at: due ? new Date(`${due}T09:00:00`).toISOString() : null,
              });
            setTitle("");
            setDue("");
            void refresh();
          }}
        >
          Add
        </Button>
      </div>
    </Panel>
  );
}

const KIND_LABEL: Record<Activity["kind"], string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  note: "Note",
  status: "Update",
  system: "Website",
};

function Timeline({
  customerId,
  activities,
  leads,
}: {
  customerId: string;
  activities: Activity[];
  leads: Lead[];
}) {
  const refresh = useRefresh();
  const [kind, setKind] = useState<Activity["kind"]>("note");
  const [body, setBody] = useState("");
  return (
    <Panel title="History">
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className={`${selectClass} w-28`}
          value={kind}
          onChange={(e) => setKind(e.target.value as Activity["kind"])}
        >
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="text">Text</option>
          <option value="email">Email</option>
        </select>
        <Input
          className="min-w-48 flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened? e.g. Left voicemail, wants a quote for stairs"
        />
        <Button
          disabled={!body.trim()}
          onClick={async () => {
            await logActivity({ customer_id: customerId, kind, body: body.trim() });
            setBody("");
            void refresh();
          }}
        >
          Log
        </Button>
      </div>
      <ol className="space-y-3 border-l pl-4">
        {activities.map((a) => (
          <li key={a.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
            <div className="text-xs text-muted-foreground">
              {KIND_LABEL[a.kind]} · {fmtDateTime(a.created_at)}
            </div>
            <div className="whitespace-pre-line">{a.body}</div>
          </li>
        ))}
        {leads.map((l) => (
          <li key={l.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-amber-500" />
            <div className="text-xs text-muted-foreground">
              Form · {fmtDateTime(l.created_at)} · {l.source || "direct"}
            </div>
            <div>
              {l.type} request{" "}
              <Link to="/admin/leads" search={{ id: l.id }} className="underline">
                open
              </Link>
            </div>
          </li>
        ))}
        {!activities.length && !leads.length && (
          <li className="text-sm text-muted-foreground">Nothing yet.</li>
        )}
      </ol>
    </Panel>
  );
}

function NewJob({ customerId, onCreated }: { customerId: string; onCreated: (j: Job) => void }) {
  const refresh = useRefresh();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const { data, error } = await dbOrThrow()
          .from("jobs")
          .insert({
            customer_id: customerId,
            status: "requested",
            arrival_window: ARRIVAL_WINDOWS[0],
            sourced_by: "owner",
          })
          .select("*, customers(id,name,phone,email)")
          .single();
        if (error) {
          toast.error(error.message);
          return;
        }
        await logActivity({
          customer_id: customerId,
          kind: "system",
          body: "Job created in the back office",
        });
        void refresh();
        onCreated(data as Job);
      }}
    >
      New job
    </Button>
  );
}
