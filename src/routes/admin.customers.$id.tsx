import { useEffect, useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { EmailItem } from "@/components/admin/EmailItem";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logActivity, setCustomerStage, useRefresh } from "@/lib/admin-data";
import { sendCustomerEmail } from "@/lib/admin.functions";
import { accessToken, dbOrThrow } from "@/lib/db";
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
import { ARRIVAL_WINDOWS, publicOrigin } from "@/lib/site-data";
import { cn } from "@/lib/utils";

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
            <DeleteCustomer id={id} name={b.customer.name} jobs={b.jobs.length} />
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

          <Timeline customer={b.customer} activities={b.activities} leads={b.leads} />
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
        <dl className="grid grid-cols-[90px_1fr] gap-y-1 text-sm">
          <dt className="text-muted-foreground">Phone</dt>
          <dd>
            {customer.phone ? (
              <a className="underline" href={telHref(customer.phone)}>
                {customer.phone}
              </a>
            ) : (
              "–"
            )}
          </dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{customer.email || "–"}</dd>
          {customer.company && (
            <>
              <dt className="text-muted-foreground">Company</dt>
              <dd>{customer.company}</dd>
            </>
          )}
          {customer.notes && (
            <>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-line">{customer.notes}</dd>
            </>
          )}
        </dl>
        <details className="rounded-lg border p-3" open={!customer.email && !customer.phone}>
          <summary className="cursor-pointer text-sm font-semibold">Edit contact info</summary>
          <div className="mt-3 grid gap-3">
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
              <Input
                value={c.phone ?? ""}
                onChange={(e) => setC({ ...c, phone: e.target.value })}
              />
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
                onChange={(e) =>
                  setC({ ...c, sourced_by: e.target.value as Customer["sourced_by"] })
                }
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
        </details>
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

const LEAD_LABEL: Record<string, string> = {
  booking: "Booking request",
  walkthrough: "Commercial walkthrough request",
  quote: "Quote request",
  contact: "Contact request",
};

function leadText(l: Lead) {
  const d = l.details as Record<string, unknown>;
  const items = Array.isArray(d["items"])
    ? (d["items"] as { label: string }[]).map((i) => i.label).join(", ")
    : "";
  return [
    d["day"] ? `Wants ${String(d["day"])}` : "",
    items,
    d["total"] ? usd(Number(d["total"])) : "",
    d["business"] ? String(d["business"]) : "",
    d["sqft"] ? `${Number(d["sqft"]).toLocaleString()} sq ft` : "",
    d["notes"] ? `Notes: ${String(d["notes"])}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Everything that happened with this customer, newest first. Emails open to show what was sent. */
function Timeline({
  customer,
  activities,
  leads,
}: {
  customer: Customer;
  activities: Activity[];
  leads: Lead[];
}) {
  const refresh = useRefresh();
  const [tab, setTab] = useState<"all" | "email">("all");
  const [kind, setKind] = useState<Activity["kind"]>("note");
  const [body, setBody] = useState("");
  const emails = activities.filter((a) => a.kind === "email");

  type Row = { at: string; key: string; node: ReactNode };
  const rows: Row[] = [];
  for (const a of tab === "email" ? emails : activities) {
    rows.push({
      at: a.created_at,
      key: a.id,
      node:
        a.kind === "email" ? (
          <EmailItem activity={a} />
        ) : (
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">
              {KIND_LABEL[a.kind]} · {fmtDateTime(a.created_at)}
            </div>
            <div className="whitespace-pre-line">{a.body}</div>
          </div>
        ),
    });
  }
  if (tab === "all")
    for (const l of leads)
      rows.push({
        at: l.created_at,
        key: l.id,
        node: (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
            <div className="text-xs text-muted-foreground">
              Website form · {fmtDateTime(l.created_at)} · {l.source || "direct"}
            </div>
            <div className="font-medium">{LEAD_LABEL[l.type] ?? l.type}</div>
            {leadText(l) && <div className="text-muted-foreground">{leadText(l)}</div>}
          </div>
        ),
      });
  rows.sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Panel
      title="History"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border text-sm">
            {(
              [
                ["all", "Everything"],
                ["email", `Emails (${emails.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn("px-2.5 py-1", tab === k && "bg-primary text-primary-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <EmailCompose customer={customer} />
        </div>
      }
    >
      {tab === "all" && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            className={`${selectClass} w-28`}
            value={kind}
            onChange={(e) => setKind(e.target.value as Activity["kind"])}
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="text">Text</option>
          </select>
          <Input
            className="min-w-48 flex-1"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Log a call, text or note. e.g. Left voicemail, wants stairs added"
          />
          <Button
            disabled={!body.trim()}
            onClick={async () => {
              await logActivity({ customer_id: customer.id, kind, body: body.trim() });
              setBody("");
              void refresh();
            }}
          >
            Log
          </Button>
        </div>
      )}
      {rows.length ? (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.key}>{r.node}</li>
          ))}
        </ol>
      ) : (
        <Empty>{tab === "email" ? "No emails sent yet." : "Nothing yet."}</Empty>
      )}
    </Panel>
  );
}

/** Write a one-off email to the customer, sent in the branded layout and saved to their history. */
function EmailCompose({ customer }: { customer: Customer }) {
  const refresh = useRefresh();
  const send = useServerFn(sendCustomerEmail);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={!customer.email}
          title={customer.email ? undefined : "Add an email first"}
        >
          Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email {customer.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          To {customer.email}. Replies go to the business inbox.
        </p>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your message"
        />
        <Button
          disabled={busy || !subject.trim() || !message.trim()}
          onClick={async () => {
            setBusy(true);
            const r = await send({
              data: {
                auth: await accessToken(),
                kind: "custom",
                to: customer.email!,
                name: customer.name,
                origin: publicOrigin(),
                customerId: customer.id,
                subject: subject.trim(),
                message: message.trim(),
              },
            }).catch((e: Error) => ({ ok: false as const, error: e.message }));
            setBusy(false);
            if (!r.ok) {
              toast.error(r.error);
              void refresh();
              return;
            }
            toast.success("Email sent");
            setSubject("");
            setMessage("");
            setOpen(false);
            void refresh();
          }}
        >
          {busy ? "Sending…" : "Send email"}
        </Button>
      </DialogContent>
    </Dialog>
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

/** Removes a customer and everything about them (jobs, quotes, emails, leads). For tests and duplicates. */
function DeleteCustomer({ id, name, jobs }: { id: string; name: string; jobs: number }) {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      const c = dbOrThrow();
      await c.from("leads").delete().eq("customer_id", id);
      const { error } = await c.from("customers").delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast.success(`Deleted ${name}`);
      await refresh();
      void navigate({ to: "/admin/customers" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-red-600" disabled={busy}>
          <Trash2 className="mr-1 size-4" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the customer and everything about them for good
            {jobs ? `, including ${jobs} job${jobs === 1 ? "" : "s"} on the calendar` : ""}, plus
            their quotes, emails and notes. Use it for test bookings and duplicates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={remove}>
            Delete customer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
