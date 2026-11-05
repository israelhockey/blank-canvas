import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Empty,
  Field,
  PageHeader,
  Panel,
  StatusPill,
  ago,
  fmtDateTime,
  selectClass,
  smsHref,
  telHref,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchLeads, logActivity, setCustomerStage, useRefresh } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/leads")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s["id"] === "string" ? s["id"] : undefined,
  }),
  component: Leads,
});

const TYPES = ["all", "booking", "walkthrough", "quote", "contact"] as const;

function Leads() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/leads" });
  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [status, setStatus] = useState<"open" | "all" | LeadStatus>("open");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (leads.data ?? []).filter(
      (l) =>
        (type === "all" || l.type === type) &&
        (status === "all" ||
          (status === "open"
            ? !["won", "lost", "spam"].includes(l.status)
            : l.status === status)) &&
        (!term ||
          [l.name, l.phone, l.email, l.zip, l.source].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [leads.data, type, status, q]);

  const selected = (leads.data ?? []).find((l) => l.id === id) ?? null;

  return (
    <div>
      <PageHeader
        title="Leads"
        sub="Every form from the website: bookings, commercial walkthroughs, quote and contact requests."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search name, phone, ZIP, source…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <select
          className={cn(selectClass, "w-40")}
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All types" : t}
            </option>
          ))}
        </select>
        <select
          className={cn(selectClass, "w-40")}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="open">Open</option>
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="p-0">
          {leads.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : list.length ? (
            <ul className="divide-y">
              {list.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => void navigate({ search: { id: l.id } })}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/60",
                      l.id === id && "bg-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.name || "Unknown"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {l.type} · {l.phone} · {l.source || "direct"}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{ago(l.created_at)}</span>
                    <StatusPill value={l.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <Empty>No leads match these filters.</Empty>
            </div>
          )}
        </Panel>

        {selected ? (
          <LeadPanel key={selected.id} lead={selected} />
        ) : (
          <Empty>Select a lead to see the details.</Empty>
        )}
      </div>
    </div>
  );
}

function LeadPanel({ lead }: { lead: Lead }) {
  const refresh = useRefresh();
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");

  const update = async (patch: Partial<Lead>, body?: string) => {
    const { error } = await dbOrThrow().from("leads").update(patch).eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (body && lead.customer_id)
      await logActivity({ customer_id: lead.customer_id, lead_id: lead.id, kind: "status", body });
    void refresh();
  };

  const contacted = async (how: "call" | "text") => {
    await update({
      status: lead.status === "new" ? "contacted" : lead.status,
      first_response_at: lead.first_response_at ?? new Date().toISOString(),
    });
    if (lead.customer_id) {
      await logActivity({
        customer_id: lead.customer_id,
        lead_id: lead.id,
        kind: how,
        body: how === "call" ? "Called" : "Texted",
      });
      await setCustomerStage(lead.customer_id, "contacted").catch(() => undefined);
    }
    toast.success("Logged");
  };

  const d = lead.details as Record<string, unknown>;
  const items = Array.isArray(d["items"])
    ? (d["items"] as { label: string; amount: number }[])
    : [];
  const rows = Object.entries(d).filter(([k, v]) => k !== "items" && v !== "" && v != null);

  return (
    <Panel className="h-fit space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-bold">{lead.name}</div>
          <div className="text-xs text-muted-foreground">
            {lead.type} · {fmtDateTime(lead.created_at)} · from {lead.source || "direct"}
          </div>
        </div>
        <StatusPill value={lead.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.phone && (
          <>
            <Button asChild size="sm">
              <a href={telHref(lead.phone)} onClick={() => void contacted("call")}>
                Call {lead.phone}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={smsHref(lead.phone)} onClick={() => void contacted("text")}>
                Text
              </a>
            </Button>
          </>
        )}
        {lead.customer_id && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/customers/$id" params={{ id: lead.customer_id }}>
                Customer page
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                to="/admin/quotes/$id"
                params={{ id: "new" }}
                search={{ customer: lead.customer_id }}
              >
                Make a quote
              </Link>
            </Button>
          </>
        )}
      </div>

      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
        {lead.email && (
          <>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{lead.email}</dd>
          </>
        )}
        {lead.zip && (
          <>
            <dt className="text-muted-foreground">ZIP</dt>
            <dd>{lead.zip}</dd>
          </>
        )}
        {lead.page && (
          <>
            <dt className="text-muted-foreground">Page</dt>
            <dd className="break-all">{lead.page}</dd>
          </>
        )}
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="break-words">
              {typeof v === "number" && /total|tax|per|sub/i.test(k)
                ? `$${v.toFixed(2)}`
                : String(v)}
            </dd>
          </div>
        ))}
      </dl>

      {items.length > 0 && (
        <div className="rounded-lg border p-3 text-sm">
          {items.map((i, k) => (
            <div key={k} className="flex justify-between">
              <span>{i.label}</span>
              <span>${Number(i.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <Field label="Status">
        <select
          className={selectClass}
          value={lead.status}
          onChange={(e) =>
            void update({ status: e.target.value as LeadStatus }, `Lead status → ${e.target.value}`)
          }
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      {lead.customer_id && (
        <div className="space-y-2">
          <Field label="Add a note">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Spoke to her, wants Saturday…"
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!note.trim()}
              onClick={async () => {
                await logActivity({
                  customer_id: lead.customer_id!,
                  lead_id: lead.id,
                  kind: "note",
                  body: note.trim(),
                });
                setNote("");
                toast.success("Note saved");
              }}
            >
              Save note
            </Button>
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-8 w-40"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!due}
              onClick={async () => {
                await dbOrThrow()
                  .from("tasks")
                  .insert({
                    customer_id: lead.customer_id,
                    lead_id: lead.id,
                    title: note.trim() || `Follow up with ${lead.name}`,
                    due_at: new Date(`${due}T09:00:00`).toISOString(),
                  });
                setNote("");
                setDue("");
                toast.success("Follow-up added");
                void refresh();
              }}
            >
              Add follow-up
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
