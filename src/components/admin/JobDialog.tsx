import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";

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
import type { Activity, Invoice, Job } from "@/lib/db-types";
import { ARRIVAL_WINDOWS, publicOrigin } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { EmailItem, parseEmail } from "./EmailItem";
import { Field, StatusPill, fmtDay, isoDate, selectClass, smsHref, telHref, usd } from "./ui";

/*
 * One job, one next step. The dialog always leads with the single action that moves the job
 * forward (confirm → remind → mark done → get paid → ask for a review); details sit below.
 */
export function JobDialog({ job, onClose }: { job: Job | null; onClose: () => void }) {
  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {job && <JobBody key={job.id} job={job} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

type Step = "requested" | "confirmed" | "completed" | "paid";
const STEPS: { key: Step; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Done" },
  { key: "paid", label: "Paid" },
];

function JobBody({ job: initial, onClose }: { job: Job; onClose: () => void }) {
  const refresh = useRefresh();
  const settings = useSettings();
  const createInvoice = useServerFn(createSquareInvoice);
  const checkInvoice = useServerFn(getSquareInvoice);
  const email = useServerFn(sendCustomerEmail);

  const [job, setJob] = useState(initial);
  const [date, setDate] = useState(initial.scheduled_date ?? "");
  const [win, setWin] = useState(initial.arrival_window ?? ARRIVAL_WINDOWS[0]!);
  const [address, setAddress] = useState(initial.address ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [finalTotal, setFinalTotal] = useState(
    initial.final_total != null ? String(initial.final_total) : "",
  );
  const [sourcedBy, setSourcedBy] = useState(initial.sourced_by);
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
  const emails = useQuery({
    queryKey: ["job-emails", job.id],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("activities")
        .select("*")
        .eq("job_id", job.id)
        .eq("kind", "email")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
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
  const openSquare = (invoices.data ?? []).find(
    (i) => i.method === "square" && i.status === "sent",
  );
  const reviewSent = (emails.data ?? []).some((a) => parseEmail(a.body)?.type === "review");
  const step: Step = paid ? "paid" : (job.status as Step);
  const isPastOrToday = !!date && date <= isoDate(new Date());

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

  const save = async (extra: Partial<Job> = {}) => {
    const patch = {
      scheduled_date: date || null,
      arrival_window: win,
      address: address || null,
      notes: notes || null,
      final_total: finalTotal ? Number(finalTotal) : null,
      sourced_by: sourcedBy,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await dbOrThrow().from("jobs").update(patch).eq("id", job.id);
    if (error) throw new Error(error.message);
    setJob({ ...job, ...patch } as Job);
  };

  const setLead = async (status: "booked" | "won" | "lost") => {
    if (job.lead_id) await dbOrThrow().from("leads").update({ status }).eq("id", job.lead_id);
  };

  /** Emails the customer; the server records it on their history. Returns false if no email. */
  const emailCustomer = async (
    kind: "confirm" | "reminder" | "receipt" | "review",
    extra: Record<string, unknown> = {},
  ) => {
    if (!cust?.email) return false;
    const res = await email({
      data: {
        auth: await accessToken(),
        kind,
        to: cust.email,
        name: cust.name,
        origin: publicOrigin(),
        customerId: job.customer_id,
        jobId: job.id,
        number: job.number,
        day: fmtDay(date),
        window: win,
        notes: kind === "confirm" && address ? `Address: ${address}` : "",
        items: job.items,
        subtotal: Number(job.subtotal),
        tax: Number(job.tax),
        total: amountDue,
        ...extra,
      },
    });
    if (!res.ok) throw new Error(res.error);
    return true;
  };

  const confirm = () =>
    run("confirm", async () => {
      if (!date) throw new Error("Pick a date first.");
      await save({ status: "confirmed" });
      await setCustomerStage(job.customer_id, "booked");
      await setLead("booked");
      const sent = await emailCustomer("confirm");
      toast.success(sent ? "Confirmed and emailed" : "Confirmed. No email on file, so text them.");
    });

  const remind = () =>
    run("remind", async () => {
      if (await emailCustomer("reminder")) toast.success("Reminder emailed");
      else toast.error("No email on file. Text them instead.");
    });

  const markDone = () =>
    run("done", async () => {
      const months = settings.data?.repeat_months ?? 6;
      const due = new Date();
      due.setMonth(due.getMonth() + months);
      await save({ status: "completed", completed_at: new Date().toISOString() });
      await dbOrThrow()
        .from("customers")
        .update({ next_service_due: isoDate(due) })
        .eq("id", job.customer_id);
      await setCustomerStage(job.customer_id, "completed");
      await setLead("won");
      if (settings.data) {
        await recordCommission(
          { ...job, final_total: finalTotal ? Number(finalTotal) : null, sourced_by: sourcedBy },
          settings.data.commission,
        );
      }
      toast.success("Marked done. Now get paid.");
    });

  const cancel = () =>
    run("cancel", async () => {
      await save({ status: "canceled" });
      await setLead("lost");
      await logActivity({
        customer_id: job.customer_id,
        job_id: job.id,
        kind: "status",
        body: `Job #${job.number} canceled`,
      });
      toast.success("Job canceled. The time slot is open again.");
      onClose();
    });

  /** Removes the job for good (for tests, duplicates and mistakes). Payment records stay. */
  const remove = () =>
    run("delete", async () => {
      const c = dbOrThrow();
      if (job.photos.length) await c.storage.from("job-photos").remove(job.photos);
      const { error } = await c.from("jobs").delete().eq("id", job.id);
      if (error) throw new Error(error.message);
      await logActivity({
        customer_id: job.customer_id,
        kind: "status",
        body: `Job #${job.number} deleted`,
      });
      toast.success(`Job #${job.number} deleted`);
      onClose();
    });

  const markPaid = (method: "cash" | "check") =>
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
      if (job.status !== "completed") await save({ status: "completed" });
      await setCustomerStage(job.customer_id, "paid");
      await logActivity({
        customer_id: job.customer_id,
        job_id: job.id,
        kind: "status",
        body: `Paid by ${method}: ${usd(amountDue)}`,
      });
      const sent = await emailCustomer("receipt", { method }).catch((e: Error) => {
        toast.message(`Receipt not sent: ${e.message}`);
        return false;
      });
      toast.success(sent ? `Paid (${method}). Receipt emailed.` : `Marked paid (${method})`);
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
        body: r.emailed
          ? "Square invoice emailed by Square"
          : "Square invoice created (link to text)",
      });
      toast.success(
        r.emailed ? "Square emailed the invoice" : "Invoice created. Copy the link to text it.",
      );
    });

  const checkSquare = (inv: Invoice) =>
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
        toast.message(`Not paid yet (${r.status.toLowerCase().replace("_", " ")})`);
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
      setJob({ ...job, photos: paths });
      toast.success("Photos uploaded");
    });

  const b = !!busy;
  const noEmail = !cust?.email;

  /* ---------- the one next step ---------- */
  let next: ReactNode;
  if (job.status === "canceled") {
    next = (
      <NextStep title="This job was canceled">
        <Button
          variant="outline"
          disabled={b}
          onClick={() => run("reopen", () => save({ status: "requested" }))}
        >
          Reopen it
        </Button>
      </NextStep>
    );
  } else if (step === "requested") {
    next = (
      <NextStep
        title={date ? "Confirm this booking" : "Pick a date to book this job"}
        hint={
          noEmail
            ? "No email on file: confirm here, then text them."
            : `Confirming emails ${cust?.name.split(" ")[0]} the date, time and price.`
        }
      >
        <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className={selectClass} value={win} onChange={(e) => setWin(e.target.value)}>
            {ARRIVAL_WINDOWS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          <Button disabled={b || !date} onClick={confirm}>
            {busy === "confirm" ? "Confirming…" : noEmail ? "Confirm" : "Confirm & email"}
          </Button>
        </div>
      </NextStep>
    );
  } else if (step === "confirmed") {
    next = (
      <NextStep
        title={isPastOrToday ? "Finished the job?" : `Booked for ${fmtDay(date)}, ${win}`}
        hint={
          isPastOrToday
            ? "Mark it done, then collect payment."
            : "Send a reminder the day before. Mark it done after the clean."
        }
      >
        {isPastOrToday ? (
          <>
            <Button disabled={b} onClick={markDone}>
              Mark job done
            </Button>
            <Button variant="outline" disabled={b || noEmail} onClick={remind}>
              Send reminder
            </Button>
          </>
        ) : (
          <>
            <Button disabled={b || noEmail} onClick={remind}>
              {busy === "remind" ? "Sending…" : "Email reminder"}
            </Button>
            <Button variant="outline" disabled={b} onClick={markDone}>
              Mark job done
            </Button>
          </>
        )}
      </NextStep>
    );
  } else if (step === "completed") {
    next = (
      <NextStep
        title={`Get paid · ${usd(amountDue)}`}
        hint={
          openSquare
            ? "Square invoice is out. Check it, or mark paid if they paid another way."
            : "Send a Square invoice, or mark it paid if they paid cash or check. A receipt is emailed automatically."
        }
      >
        {openSquare ? (
          <Button disabled={b} onClick={() => checkSquare(openSquare)}>
            Check if paid in Square
          </Button>
        ) : (
          <Button disabled={b} onClick={squareInvoice}>
            {busy === "square" ? "Sending…" : "Send Square invoice"}
          </Button>
        )}
        <Button variant="outline" disabled={b} onClick={() => markPaid("cash")}>
          Paid cash
        </Button>
        <Button variant="outline" disabled={b} onClick={() => markPaid("check")}>
          Paid check
        </Button>
      </NextStep>
    );
  } else {
    const link = settings.data?.review_link;
    next = (
      <NextStep
        title={
          reviewSent ? "All done. Paid and review requested." : "Paid. Ask for a Google review?"
        }
        hint={
          !link ? "Add your Google review link in Settings to send review requests." : undefined
        }
      >
        {!reviewSent && (
          <Button
            disabled={b || noEmail || !link}
            onClick={() =>
              run("review", async () => {
                await emailCustomer("review", { link });
                toast.success("Review request sent");
              })
            }
          >
            Email review request
          </Button>
        )}
      </NextStep>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          Job #{job.number}
          {cust && <span className="font-normal text-muted-foreground">· {cust.name}</span>}
        </DialogTitle>
      </DialogHeader>

      {/* progress */}
      {job.status !== "canceled" && (
        <ol className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          {STEPS.map((s, i) => (
            <li key={s.key} className="space-y-1">
              <div
                className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")}
              />
              <div className={cn(i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>
                {i < stepIndex && <Check className="mr-0.5 inline size-3" />}
                {s.label}
              </div>
            </li>
          ))}
        </ol>
      )}

      {next}

      {/* who */}
      {cust && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm">
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
          <span className="text-muted-foreground">{cust.email || "No email on file"}</span>
        </div>
      )}

      {/* what */}
      <div className="rounded-lg border p-3 text-sm">
        {job.items.length ? (
          job.items.map((i, k) => (
            <div key={k} className="flex justify-between py-0.5">
              <span>{i.label}</span>
              <span className="tabular-nums">{usd(i.amount)}</span>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground">No line items. Set the price in Final total.</div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
          <span>Total with tax</span>
          <span className="tabular-nums">{usd(amountDue)}</span>
        </div>
      </div>

      {/* details */}
      <details className="rounded-lg border p-3" open={step === "requested" && !job.address}>
        <summary className="cursor-pointer text-sm font-semibold">
          Details: change date, address, notes, price · cancel or delete
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <Field label="Final total with tax (if different)">
            <Input
              inputMode="decimal"
              value={finalTotal}
              onChange={(e) => setFinalTotal(e.target.value)}
              placeholder={String(job.total)}
            />
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
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={b}
            onClick={() =>
              run("save", async () => {
                await save();
                toast.success("Saved");
              })
            }
          >
            Save details
          </Button>
          {job.status !== "canceled" && !paid && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              disabled={b}
              onClick={cancel}
            >
              Cancel job
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="ml-auto text-red-600" disabled={b}>
                Delete job
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete job #{job.number}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes it from the calendar and the customer&apos;s jobs for good, and opens
                  the time slot. Use this for test bookings, duplicates and mistakes. If the
                  customer just changed their mind, use Cancel job instead so you keep a record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={remove}
                >
                  Delete job
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </details>

      {/* payments */}
      {!!(invoices.data ?? []).length && (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <div className="font-semibold">Payments</div>
          {(invoices.data ?? []).map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center gap-2">
              <StatusPill value={inv.status} />
              <span className="capitalize">{inv.method}</span>
              <span className="tabular-nums">{usd(inv.amount)}</span>
              {inv.public_url && (
                <>
                  <a className="underline" href={inv.public_url} target="_blank" rel="noreferrer">
                    Open
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
            </div>
          ))}
        </div>
      )}

      {/* emails */}
      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-sm font-semibold">Emails for this job</div>
        {(emails.data ?? []).length ? (
          (emails.data ?? []).map((a) => <EmailItem key={a.id} activity={a} />)
        ) : (
          <p className="text-sm text-muted-foreground">None sent yet.</p>
        )}
      </div>

      {/* photos */}
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Before & after photos ({job.photos.length})
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {(photos.data ?? []).map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              <img src={u} alt="" className="size-20 rounded-md object-cover" />
            </a>
          ))}
        </div>
        <Input
          className="mt-2"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => uploadPhotos(e.target.files)}
        />
      </details>
    </>
  );
}

function NextStep({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</div>
      <div className="mt-0.5 text-base font-semibold">{title}</div>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
