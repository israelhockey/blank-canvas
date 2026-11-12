import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import { PageHeader, Panel, StatusPill, fmtDay, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logActivity, useRefresh } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import type { Invoice, Job } from "@/lib/db-types";
import { type HanksJob, parseHanks, windowFor } from "@/lib/hanks";
import { ARRIVAL_WINDOWS } from "@/lib/site-data";

export const Route = createFileRoute("/admin/hanks")({ component: HanksPage });

/*
 * Sub jobs from Hanks: paste his text, check the filled-in form, save. The job lands on the
 * calendar like any other. The homeowner is Hanks' customer, so they're saved with
 * "do not contact" on: no reminder, review or marketing emails from us.
 */

const TAG = "hanks";

type Row = Job & { invoices?: Pick<Invoice, "id" | "status" | "amount" | "method">[] };

function HanksPage() {
  const refresh = useRefresh();
  const [raw, setRaw] = useState("");
  const [f, setF] = useState<HanksJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Job | null>(null);

  const jobs = useQuery({
    queryKey: ["jobs", "hanks"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("jobs")
        .select("*, customers!inner(id,name,phone,email,tags), invoices(id,status,amount,method)")
        .contains("customers.tags", [TAG])
        .order("scheduled_date", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const read = (text: string) => {
    setRaw(text);
    if (text.trim().length > 20) setF(parseHanks(text));
  };

  const set = <K extends keyof HanksJob>(k: K, v: HanksJob[K]) =>
    setF((x) => (x ? { ...x, [k]: v } : x));

  const dupe = useMemo(() => {
    if (!f?.date) return null;
    const street = f.street.trim().toLowerCase();
    return (jobs.data ?? []).find(
      (j) =>
        j.scheduled_date === f.date &&
        j.status !== "canceled" &&
        (!street || (j.address ?? "").toLowerCase().includes(street)),
    );
  }, [f, jobs.data]);

  const save = async () => {
    if (!f) return;
    if (!f.date) return void toast.error("Add the date");
    if (!f.name.trim() && !f.street.trim())
      return void toast.error("Add the customer name or address");
    setBusy(true);
    try {
      const c = dbOrThrow();
      const name = f.name.trim() || `Hanks job · ${f.city || f.street}`;
      // Same homeowner again? Reuse their record.
      const { data: found } = await c
        .from("customers")
        .select("id")
        .contains("tags", [TAG])
        .ilike("name", name)
        .limit(1);
      let customerId = (found as { id: string }[] | null)?.[0]?.id;
      if (!customerId) {
        const { data, error } = await c
          .from("customers")
          .insert({
            name,
            company: "Hanks sub job",
            tags: [TAG],
            source: "Hanks (sub job)",
            sourced_by: "owner",
            stage: "booked",
            do_not_contact: true,
            notes: "Hanks' customer. We're the subcontractor: don't contact them for marketing.",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        customerId = (data as { id: string }).id;
      }
      const pay = f.pay ?? 0;
      const notes = [
        `Hanks sub job. Arrive ${f.time || f.window}.`,
        f.access && `Access: ${f.access}`,
        f.extra,
      ]
        .filter(Boolean)
        .join("\n");
      const address = [f.street, f.city].filter(Boolean).join(", ");
      const { data: job, error } = await c
        .from("jobs")
        .insert({
          customer_id: customerId,
          scheduled_date: f.date,
          arrival_window: f.window,
          status: "confirmed",
          items: [{ label: `${f.work || "Sub job"} (Hanks)`, amount: pay }],
          subtotal: pay,
          tax: 0,
          total: pay,
          address: address || null,
          zip: f.zip || null,
          notes,
          sourced_by: "owner",
        })
        .select("*, customers(id,name,phone,email)")
        .single();
      if (error) throw new Error(error.message);
      await logActivity({
        customer_id: customerId,
        job_id: (job as Job).id,
        kind: "system",
        body: `Hanks sub job added: ${fmtDay(f.date)} ${f.time}, ${usd(pay)}`,
      });
      toast.success(`Added: ${fmtDay(f.date)}, ${f.time || f.window} · ${name}`);
      setRaw("");
      setF(null);
      void refresh();
      void jobs.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (j: Row) => {
    const { error } = await dbOrThrow()
      .from("invoices")
      .insert({
        job_id: j.id,
        customer_id: j.customer_id,
        amount: Number(j.final_total ?? j.total),
        method: "other",
        status: "paid",
        paid_at: new Date().toISOString(),
      });
    if (error) return void toast.error(error.message);
    if (j.status !== "completed")
      await dbOrThrow()
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", j.id);
    await logActivity({
      customer_id: j.customer_id,
      job_id: j.id,
      kind: "status",
      body: `Paid by Hanks: ${usd(j.final_total ?? j.total)}`,
    });
    toast.success("Marked paid by Hanks");
    void refresh();
    void jobs.refetch();
  };

  const list = jobs.data ?? [];
  const isPaid = (j: Row) => (j.invoices ?? []).some((i) => i.status === "paid");
  const owed = list.filter((j) => j.status === "completed" && !isPaid(j));
  const upcoming = list.filter((j) => j.status !== "completed" && j.status !== "canceled");
  const paidTotal = list.filter(isPaid).reduce((s, j) => s + Number(j.final_total ?? j.total), 0);

  return (
    <div>
      <PageHeader
        title="Hanks jobs"
        sub="Paste the text Hanks sends. Check the details, then add it to the calendar."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="1. Paste his message">
          <Textarea
            value={raw}
            onChange={(e) => read(e.target.value)}
            placeholder={`Sub job: Mon 11/16, 11 AM - Carpet cleaning 2 rooms - ARGYLE - pays $100. … It's yours! Mon 11/16, 11 AM - … - Derek DeGuire, 784 CIMARRON COURT, ARGYLE, TX 76226. Access: Gate code is 1031 …`}
            className="min-h-40"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  read(await navigator.clipboard.readText());
                } catch {
                  toast.message("Long-press the box and tap Paste instead.");
                }
              }}
            >
              <ClipboardPaste className="mr-1 size-4" /> Paste from clipboard
            </Button>
            {raw && (
              <Button
                variant="ghost"
                onClick={() => {
                  setRaw("");
                  setF(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the whole thread, the offer, or just the "It's yours!" text. Whatever it finds
            fills in on the right.
          </p>
        </Panel>

        <Panel title="2. Check and add">
          {!f ? (
            <p className="text-sm text-muted-foreground">The job details show up here.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer (homeowner)">
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Hanks pays">
                <Input
                  inputMode="decimal"
                  value={f.pay ?? ""}
                  onChange={(e) =>
                    set("pay", e.target.value === "" ? null : Number(e.target.value) || 0)
                  }
                  placeholder="$"
                />
              </Field>
              <Field label="Street address" wide>
                <Input value={f.street} onChange={(e) => set("street", e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="ZIP">
                <Input value={f.zip} onChange={(e) => set("zip", e.target.value)} />
              </Field>
              <Field label="Date">
                <Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Arrive at">
                <div className="flex gap-2">
                  <Input
                    value={f.time}
                    onChange={(e) => {
                      set("time", e.target.value);
                      set("window", windowFor(e.target.value));
                    }}
                    className="w-24"
                  />
                  <select
                    value={f.window}
                    onChange={(e) => set("window", e.target.value)}
                    className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                    aria-label="Calendar window"
                  >
                    {ARRIVAL_WINDOWS.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Work" wide>
                <Input value={f.work} onChange={(e) => set("work", e.target.value)} />
              </Field>
              <Field label="Access / gate code" wide>
                <Input value={f.access} onChange={(e) => set("access", e.target.value)} />
              </Field>
              <Field label="Other notes" wide>
                <Textarea
                  value={f.extra}
                  onChange={(e) => set("extra", e.target.value)}
                  className="min-h-16"
                />
              </Field>
              {dupe && (
                <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 sm:col-span-2 dark:bg-amber-950/40 dark:text-amber-100">
                  Heads up: there&apos;s already a Hanks job on {fmtDay(dupe.scheduled_date!)}
                  {dupe.address ? ` at ${dupe.address}` : ""}. Make sure this isn&apos;t a repeat.
                </p>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button onClick={() => void save()} disabled={busy} className="flex-1 sm:flex-none">
                  {busy ? "Adding…" : "Add to calendar"}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Coming up" value={String(upcoming.length)} />
        <Stat
          label="Done, Hanks owes"
          value={usd(owed.reduce((s, j) => s + Number(j.final_total ?? j.total), 0))}
          sub={`${owed.length} job${owed.length === 1 ? "" : "s"}`}
        />
        <Stat label="Paid by Hanks so far" value={usd(paidTotal)} />
      </div>

      <Panel title="All Hanks jobs" className="mt-4">
        {!list.length ? (
          <p className="text-sm text-muted-foreground">
            {jobs.isLoading ? "Loading…" : "No Hanks jobs yet."}
          </p>
        ) : (
          <ul className="divide-y">
            {list.map((j) => {
              const paid = isPaid(j);
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <button
                    onClick={() => setOpen(j)}
                    className="min-w-0 flex-1 text-left"
                    title="Open job"
                  >
                    <span className="block truncate font-medium">
                      {j.scheduled_date ? fmtDay(j.scheduled_date) : "No date"} ·{" "}
                      {j.customers?.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[j.address, j.items?.[0]?.label].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                  <span className="text-sm font-semibold">{usd(j.final_total ?? j.total)}</span>
                  {paid ? (
                    <StatusPill value="paid" />
                  ) : (
                    <>
                      <StatusPill value={j.status} />
                      {j.status !== "canceled" && (
                        <Button size="sm" variant="outline" onClick={() => void markPaid(j)}>
                          Hanks paid
                        </Button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Tap a job to move, finish or delete it. They also show on the{" "}
          <Link to="/admin/calendar" className="underline">
            Calendar
          </Link>
          .
        </p>
      </Panel>

      <JobDialog
        job={open}
        onClose={() => {
          setOpen(null);
          void jobs.refetch();
        }}
      />
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
