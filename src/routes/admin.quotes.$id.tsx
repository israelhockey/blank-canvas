import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Field,
  PageHeader,
  Panel,
  StatusPill,
  isoDate,
  selectClass,
  smsHref,
  usd,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendCustomerEmail } from "@/lib/admin.functions";
import {
  fetchCustomers,
  logActivity,
  setCustomerStage,
  sumItems,
  useRefresh,
} from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import type { LineItem, Quote } from "@/lib/db-types";
import { ITEMS } from "@/lib/site-data";

export const Route = createFileRoute("/admin/quotes/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    customer: typeof s["customer"] === "string" ? s["customer"] : undefined,
  }),
  component: QuoteEditor,
});

function QuoteEditor() {
  const { id } = Route.useParams();
  const { customer: presetCustomer } = Route.useSearch();
  const isNew = id === "new";
  const navigate = useNavigate();
  const refresh = useRefresh();
  const email = useServerFn(sendCustomerEmail);

  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const existing = useQuery({
    queryKey: ["quote", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await dbOrThrow().from("quotes").select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return data as Quote;
    },
  });

  const [customerId, setCustomerId] = useState(presetCustomer ?? "");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState(
    "No deposit. You pay after the job is done.\n100% Customer Satisfaction Guarantee: we will come out and touch up or spot clean anything that doesn't look right to you after we are gone!",
  );
  const [expires, setExpires] = useState(() => isoDate(new Date(Date.now() + 14 * 86400000)));
  const [pick, setPick] = useState(ITEMS[0]!.id);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState({ label: "", amount: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = existing.data;
    if (!q) return;
    setCustomerId(q.customer_id);
    setTitle(q.title ?? "");
    setItems(q.items ?? []);
    setNotes(q.notes ?? "");
    setExpires(q.expires_at ?? "");
  }, [existing.data]);

  const totals = useMemo(() => sumItems(items), [items]);
  const customer = (customers.data ?? []).find((c) => c.id === customerId);
  const quote = existing.data;
  const link = quote
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/quote/${quote.token}`
    : "";

  const save = async (patch: Partial<Quote> = {}): Promise<Quote | null> => {
    if (!customerId) {
      toast.error("Pick a customer first.");
      return null;
    }
    if (!items.length) {
      toast.error("Add at least one line.");
      return null;
    }
    const row = {
      customer_id: customerId,
      title: title || null,
      items,
      ...totals,
      notes: notes || null,
      expires_at: expires || null,
      updated_at: new Date().toISOString(),
      ...patch,
    };
    const c = dbOrThrow();
    const res = isNew
      ? await c.from("quotes").insert(row).select("*").single()
      : await c.from("quotes").update(row).eq("id", id).select("*").single();
    if (res.error) {
      toast.error(res.error.message);
      return null;
    }
    const saved = res.data as Quote;
    await refresh();
    if (isNew)
      void navigate({
        to: "/admin/quotes/$id",
        params: { id: saved.id },
        search: { customer: undefined },
        replace: true,
      });
    return saved;
  };

  const send = async (how: "email" | "text") => {
    setBusy(true);
    try {
      const saved = await save(
        quote?.status === "draft" || !quote
          ? { status: "sent", sent_at: new Date().toISOString() }
          : {},
      );
      if (!saved) return;
      const url = `${window.location.origin}/quote/${saved.token}`;
      if (how === "email") {
        if (!customer?.email)
          throw new Error("This customer has no email. Add it on their page, or send by text.");
        const r = await email({
          data: {
            auth: await accessToken(),
            kind: "quote",
            to: customer.email,
            name: customer.name,
            origin: window.location.origin,
            link: url,
            number: saved.number,
            title: saved.title ?? "",
            notes: saved.notes ?? "",
            items: saved.items,
            subtotal: Number(saved.subtotal),
            tax: Number(saved.tax),
            total: Number(saved.total),
            expires: saved.expires_at
              ? new Date(`${saved.expires_at}T12:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })
              : "",
          },
        });
        if (!r.ok) throw new Error(r.error);
        toast.success("Quote emailed");
      } else {
        await navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success("Link copied. Opening your texts…");
        if (customer?.phone)
          window.location.href = `${smsHref(customer.phone)}?&body=${encodeURIComponent(`Hi ${customer.name.split(" ")[0]}, here's your Simple Surface quote: ${url}`)}`;
      }
      await logActivity({
        customer_id: saved.customer_id,
        kind: how === "email" ? "email" : "text",
        body: `Sent quote #${saved.number} (${usd(saved.total)})`,
      });
      await setCustomerStage(saved.customer_id, "quoted").catch(() => undefined);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPriced = () => {
    const it = ITEMS.find((i) => i.id === pick)!;
    setItems([
      ...items,
      { label: qty > 1 ? `${qty} × ${it.name}` : it.name, amount: it.price * qty },
    ]);
    setQty(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? "New quote" : `Quote #${quote?.number ?? ""}`}
        sub={
          quote
            ? undefined
            : "Build it from the price list or add custom lines, then email or text the link."
        }
        actions={quote && <StatusPill value={quote.status} className="text-sm" />}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <select
                className={selectClass}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Choose a customer…</option>
                {(customers.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Whole-home carpet + sectional"
              />
            </Field>
          </div>

          <div className="rounded-lg border">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 border-b p-2 last:border-0">
                <Input
                  className="flex-1"
                  value={it.label}
                  onChange={(e) =>
                    setItems(items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))
                  }
                />
                <Input
                  className="w-28 text-right"
                  inputMode="decimal"
                  value={String(it.amount)}
                  onChange={(e) =>
                    setItems(
                      items.map((x, k) =>
                        k === i
                          ? { ...x, amount: Number(e.target.value.replace(/[^\d.-]/g, "")) || 0 }
                          : x,
                      ),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove line"
                  onClick={() => setItems(items.filter((_, k) => k !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {!items.length && <p className="p-3 text-sm text-muted-foreground">No lines yet.</p>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-end gap-2">
              <Field label="From the price list" className="flex-1">
                <select
                  className={selectClass}
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                >
                  {ITEMS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({usd(i.price, 0)})
                    </option>
                  ))}
                </select>
              </Field>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-16"
                aria-label="Quantity"
              />
              <Button variant="outline" onClick={addPriced}>
                Add
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Custom line" className="flex-1">
                <Input
                  value={custom.label}
                  onChange={(e) => setCustom({ ...custom, label: e.target.value })}
                  placeholder="Stairs (14 steps), pet odor treatment…"
                />
              </Field>
              <Input
                className="w-24"
                inputMode="decimal"
                placeholder="$"
                value={custom.amount}
                onChange={(e) => setCustom({ ...custom, amount: e.target.value })}
              />
              <Button
                variant="outline"
                disabled={!custom.label.trim() || !custom.amount}
                onClick={() => {
                  setItems([
                    ...items,
                    {
                      label: custom.label.trim(),
                      amount: Number(custom.amount.replace(/[^\d.-]/g, "")) || 0,
                    },
                  ]);
                  setCustom({ label: "", amount: "" });
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <Field label="Notes shown to the customer">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label="Good through" className="w-48">
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </Field>
        </Panel>

        <div className="space-y-4">
          <Panel title="Total">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{usd(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales tax (8.25%)</span>
                <span className="tabular-nums">{usd(totals.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span className="tabular-nums">{usd(totals.total)}</span>
              </div>
            </div>
          </Panel>
          <Panel title="Send" className="space-y-2">
            <Button className="w-full" disabled={busy} onClick={() => void send("email")}>
              Save & email quote
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={busy}
              onClick={() => void send("text")}
            >
              Save & text link
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (await save()) toast.success("Saved");
              }}
            >
              Save {quote && quote.status !== "draft" ? "changes" : "draft"}
            </Button>
            {quote && quote.status !== "draft" && (
              <div className="space-y-1 pt-2 text-sm">
                <a href={link} target="_blank" rel="noreferrer" className="block underline">
                  Preview what the customer sees
                </a>
                <button
                  className="underline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(link)
                      .then(() => toast.success("Link copied"))
                  }
                >
                  Copy link
                </button>
                {quote.viewed_at && (
                  <div className="text-muted-foreground">
                    Viewed {new Date(quote.viewed_at).toLocaleString()}
                  </div>
                )}
                {quote.accepted_at && (
                  <div className="font-semibold text-emerald-600">
                    Accepted {new Date(quote.accepted_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
