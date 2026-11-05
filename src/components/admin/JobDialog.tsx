import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSquareInvoice, getSquareInvoice, sendCustomerEmail } from "@/lib/admin.functions";
import {
  logActivity,
  recordCommission,
  setCustomerStage,
  useRefresh,
  useSettings,
} from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import { JOB_STATUSES, type Invoice, type Job, type JobStatus } from "@/lib/db-types";
import { ARRIVAL_WINDOWS } from "@/lib/site-data";
import { Field, StatusPill, fmtDay, isoDate, selectClass, smsHref, telHref, usd } from "./ui";

export function JobDialog({ job, onClose }: { job: Job | null; onClose: () => void }) {
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {job && <JobBody key={job.id} job={job} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function JobBody({ job, onClose }: { job: Job; onClose: () => void }) {
  const refresh = useRefresh();
  const settings = useSettings();
  const createInvoice = useServerFn(createSquareInvoice);
  const checkInvoice = useServerFn(getSquareInvoice);
  const email = useServerFn(sendCustomerEmail);

  const [date, setDate] = useState(job.scheduled_date ?? "");
  const [win, setWin] = useState(job.arrival_window ?? ARRIVAL_WINDOWS[0]!);
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [address, setAddress] = useState(job.address ?? "");
  const [notes, setNotes] = useState(job.notes ?? "");
  const [finalTotal, setFinalTotal] = useState(
    job.final_total != null ? String(job.final_total) : "",
  );
  const [sourcedBy, setSourcedBy] = useState(job.sourced_by);
  const [busy, setBusy] = useState("");

  const cust = job.customers;
  const invoices = useQuery({
    queryKey: ["invoices", job.id],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("invoices")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at");
      if (error) throw error;
      return data as Invoice[];
    },
  });
  const photos = useQuery({
    queryKey: ["photos", job.id, job.photos.length],
    queryFn: async () => {
      if (!job.photos.length) return [] as string[];
      const { data } = await dbOrThrow()
        .storage.from("job-photos")
        .createSignedUrls(job.photos, 3600);
      return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
    },
  });

  const amountDue = finalTotal ? Number(finalTotal) : Number(job.total);
  const paid = (invoices.data ?? []).some((i) => i.status === "paid");

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const save = (extra: Partial<Job> = {}) =>
    dbOrThrow()
      .from("jobs")
      .update({
        scheduled_date: date || null,
        arrival_window: win,
        status,
        address: address || null,
        notes: notes || null,
        final_total: finalTotal ? Number(finalTotal) : null,
        sourced_by: sourcedBy,
        updated_at: new Date().toISOString(),
        ...extra,
      })
      .eq("id", job.id)
      .then(({ error }) => {
        if (error) throw new Error(error.message);
      });

  const emailCustomer = async (
    kind: "confirm" | "reminder" | "receipt" | "review",
    extra: Record<string, unknown> = {},
  ) => {
    if (!cust?.email)
      throw new Error("This customer has no email address. Add one on their customer page.");
    const res = await email({
      data: {
        auth: await accessToken(),
        kind,
        to: cust.email,
        name: cust.name,
        origin: window.location.origin,
        number: job.number,
        day: fmtDay(date),
        window: win,
        items: job.items,
        subtotal: Number(job.subtotal),
        tax: Number(job.tax),
        total: amountDue,
        ...extra,
      },
    });
    if (!res.ok) throw new Error(res.error);
    await logActivity({
      customer_id: job.customer_id,
      job_id: job.id,
      kind: "email",
      body: `Sent ${kind} email`,
    });
  };

  const markCompleted = () =>
    run("complete", async () => {
      const months = settings.data?.repeat_months ?? 6;
      const due = new Date();
      due.setMonth(due.getMonth() + months);
      await save({ status: "completed", completed_at: new Date().toISOString() });
      setStatus("completed");
      await dbOrThrow()
        .from("customers")
        .update({ next_service_due: isoDate(due) })
        .eq("id", job.customer_id);
      await setCustomerStage(job.customer_id, "completed");
      if (settings.data) {
        await recordCommission(
          { ...job, final_total: finalTotal ? Number(finalTotal) : null, sourced_by: sourcedBy },
          settings.data.commission,
        );
      }
      toast.success("Job marked completed");
    });

  const markPaid = (method: "cash" | "check" | "other") =>
    run("paid", async () => {
      const { error } = await dbOrThrow().from("invoices").insert({
        job_id: job.id,
        customer_id: job.customer_id,
        amount: amountDue,
        method,
        status: "paid",
        paid_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      await setCustomerStage(job.customer_id, "paid");
      await logActivity({
        customer_id: job.customer_id,
        job_id: job.id,
        kind: "status",
        body: `Paid by ${method}: ${usd(amountDue)}`,
      });
      toast.success(`Marked paid (${method})`);
      if (cust?.email) {
        await emailCustomer("receipt", { method }).then(
          () => toast.success("Receipt emailed"),
          (e) => toast.message(`Receipt not sent: ${(e as Error).message}`),
        );
      }
    });

  const squareInvoice = () =>
    run("square", async () => {
      if (!cust) throw new Error("Customer missing");
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const items = finalTotal
        ? [
            {
              label: `Cleaning service, job #${job.number}`,
              amount: Math.round((Number(finalTotal) / 1.0825) * 100) / 100,
            },
          ]
        : job.items;
      const r = await createInvoice({
        data: {
          auth: await accessToken(),
          jobNumber: job.number,
          customer: { name: cust.name, email: cust.email ?? "", phone: cust.phone ?? "" },
          items,
          dueDate: isoDate(due),
        },
      });
      const { error } = await dbOrThrow().from("invoices").insert({
        job_id: job.id,
        customer_id: job.customer_id,
        amount: amountDue,
        method: "square",
        status: "sent",
        square_invoice_id: r.invoiceId,
        square_order_id: r.orderId,
        public_url: r.publicUrl,
      });
      if (error) throw new Error(error.message);
      await logActivity({
        customer_id: job.customer_id,
        job_id: job.id,
        kind: "system",
        body: "Square invoice sent",
      });
      toast.success(
        r.emailed
          ? "Square invoice emailed to the customer"
          : "Invoice created. Copy the link to text it.",
      );
    });

  const refreshSquare = (inv: Invoice) =>
    run("check", async () => {
      if (!inv.square_invoice_id) return;
      const r = await checkInvoice({
        data: { auth: await accessToken(), invoiceId: inv.square_invoice_id },
      });
      if (r.status === "PAID") {
        await dbOrThrow()
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", inv.id);
        await setCustomerStage(job.customer_id, "paid");
        toast.success("Paid in Square");
      } else if (r.status === "CANCELED") {
        await dbOrThrow().from("invoices").update({ status: "canceled" }).eq("id", inv.id);
        toast.message("Invoice was canceled in Square");
      } else {
        toast.message(`Square status: ${r.status.toLowerCase().replace("_", " ")}`);
      }
    });

  const uploadPhotos = (files: FileList | null) =>
    run("photos", async () => {
      if (!files?.length) return;
      const c = dbOrThrow();
      const paths = [...job.photos];
      for (const f of Array.from(files)) {
        const path = `${job.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await c.storage.from("job-photos").upload(path, f);
        if (error) throw new Error(error.message);
        paths.push(path);
      }
      await c.from("jobs").update({ photos: paths }).eq("id", job.id);
      toast.success("Photos uploaded");
    });

  useEffect(() => setStatus(job.status), [job.status]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          Job #{job.number} <StatusPill value={status} />
          {paid && <StatusPill value="paid" />}
        </DialogTitle>
      </DialogHeader>

      {cust && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 p-3 text-sm">
          <Link
            to="/admin/customers/$id"
            params={{ id: cust.id }}
            className="font-semibold underline"
            onClick={onClose}
          >
            {cust.name}
          </Link>
          {cust.phone && (
            <>
              <a className="underline" href={telHref(cust.phone)}>
                Call {cust.phone}
              </a>
              <a className="underline" href={smsHref(cust.phone)}>
                Text
              </a>
            </>
          )}
          {cust.email && <span className="text-muted-foreground">{cust.email}</span>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Arrival window">
          <select className={selectClass} value={win} onChange={(e) => setWin(e.target.value)}>
            {ARRIVAL_WINDOWS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brought in by">
          <select
            className={selectClass}
            value={sourcedBy}
            onChange={(e) => setSourcedBy(e.target.value as Job["sourced_by"])}
          >
            <option value="partner">Partner (marketing / website)</option>
            <option value="owner">Owner (his own customer)</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={job.zip ? `ZIP ${job.zip}` : "Street, city"}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
      </div>

      <div className="rounded-lg border p-3 text-sm">
        {job.items.length ? (
          job.items.map((i, k) => (
            <div key={k} className="flex justify-between py-0.5">
              <span>{i.label}</span>
              <span className="tabular-nums">{usd(i.amount)}</span>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground">No items listed.</div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
          <span>Quoted total (with tax)</span>
          <span className="tabular-nums">{usd(job.total)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Final total, if different</span>
          <Input
            className="h-8 w-32 text-right"
            inputMode="decimal"
            value={finalTotal}
            onChange={(e) => setFinalTotal(e.target.value)}
            placeholder={String(job.total)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!!busy}
          onClick={() =>
            run("save", async () => {
              await save();
              toast.success("Saved");
            })
          }
        >
          Save
        </Button>
        <Button
          variant="outline"
          disabled={!!busy}
          onClick={() =>
            run("confirm", async () => {
              await save({ status: "confirmed" });
              setStatus("confirmed");
              await setCustomerStage(job.customer_id, "booked");
              if (cust?.email) await emailCustomer("confirm");
              toast.success(
                cust?.email
                  ? "Confirmed and emailed"
                  : "Confirmed. No email on file, so text them.",
              );
            })
          }
        >
          Confirm booking
        </Button>
        <Button
          variant="outline"
          disabled={!!busy || !cust?.email}
          onClick={() =>
            run("remind", async () => {
              await emailCustomer("reminder");
              toast.success("Reminder sent");
            })
          }
        >
          Send reminder
        </Button>
        <Button variant="outline" disabled={!!busy} onClick={markCompleted}>
          Mark completed
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-sm font-semibold">Payment · {usd(amountDue)}</div>
        {(invoices.data ?? []).map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill value={inv.status} />
            <span className="capitalize">{inv.method}</span>
            <span className="tabular-nums">{usd(inv.amount)}</span>
            {inv.public_url && (
              <>
                <a className="underline" href={inv.public_url} target="_blank" rel="noreferrer">
                  Open invoice
                </a>
                <button
                  className="underline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(inv.public_url!)
                      .then(() => toast.success("Link copied"))
                  }
                >
                  Copy link
                </button>
              </>
            )}
            {inv.method === "square" && inv.status === "sent" && (
              <button className="underline" disabled={!!busy} onClick={() => refreshSquare(inv)}>
                Check if paid
              </button>
            )}
          </div>
        ))}
        {!paid && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" disabled={!!busy} onClick={squareInvoice}>
              Send Square invoice
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => markPaid("cash")}>
              Paid cash
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => markPaid("check")}>
              Paid check
            </Button>
          </div>
        )}
        {paid && (
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy || !cust?.email || !settings.data?.review_link}
            title={
              !settings.data?.review_link ? "Add the Google review link in Settings" : undefined
            }
            onClick={() =>
              run("review", async () => {
                await emailCustomer("review", { link: settings.data!.review_link });
                toast.success("Review request sent");
              })
            }
          >
            Ask for a Google review
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-sm font-semibold">Before & after photos</div>
        <div className="flex flex-wrap gap-2">
          {(photos.data ?? []).map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              <img src={u} alt="" className="size-20 rounded-md object-cover" />
            </a>
          ))}
        </div>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => uploadPhotos(e.target.files)}
        />
      </div>
      {busy && <p className="text-xs text-muted-foreground">Working…</p>}
    </>
  );
}
