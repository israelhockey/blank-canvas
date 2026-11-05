import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Empty, PageHeader, Panel, Stat, StatusPill, fmtDate, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { commissionFor, useRefresh, useSettings } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import type { Commission, Job } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/commission")({ component: CommissionPage });

type Row = Job & { commissions: Commission[] | Commission | null };

function CommissionPage() {
  const settings = useSettings();
  const refresh = useRefresh();
  const [show, setShow] = useState<"unpaid" | "all">("unpaid");
  const jobs = useQuery({
    queryKey: ["commission-jobs"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("jobs")
        .select("*, customers(id,name,phone,email), commissions(*)")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return data as Row[];
    },
  });

  const rule = settings.data?.commission ?? { type: "percent" as const, value: 20 };
  const rows = useMemo(
    () =>
      (jobs.data ?? []).map((j) => {
        const c = Array.isArray(j.commissions) ? j.commissions[0] : j.commissions;
        return {
          job: j,
          commission: c ?? null,
          amount: c ? Number(c.amount) : commissionFor(j, rule),
        };
      }),
    [jobs.data, rule],
  );
  const partner = rows.filter((r) => r.job.sourced_by === "partner");
  const unpaid = partner.filter((r) => r.commission?.status !== "paid");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = partner.filter(
    (r) => r.job.completed_at && new Date(r.job.completed_at) >= monthStart,
  );
  const list = show === "unpaid" ? unpaid : rows;

  const markPaid = async (ids: string[]) => {
    const c = dbOrThrow();
    for (const r of rows.filter((x) => ids.includes(x.job.id))) {
      const { error } = await c.from("commissions").upsert(
        {
          job_id: r.job.id,
          amount: r.amount,
          basis: r.commission?.basis ?? `${rule.value}${rule.type === "percent" ? "%" : " flat"}`,
          status: "paid",
          paid_at: new Date().toISOString(),
        },
        { onConflict: "job_id" },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    toast.success("Marked paid out");
    void refresh();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Commission"
        sub={`Current rule: ${rule.type === "percent" ? `${rule.value}% of the pre-tax job value` : `$${rule.value} flat per job`} on jobs brought in by the partner. Change it in Settings.`}
        actions={
          unpaid.length ? (
            <Button onClick={() => void markPaid(unpaid.map((r) => r.job.id))}>
              Mark all {usd(unpaid.reduce((s, r) => s + r.amount, 0))} paid out
            </Button>
          ) : null
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Owed now"
          value={usd(unpaid.reduce((s, r) => s + r.amount, 0))}
          hint={`${unpaid.length} jobs`}
        />
        <Stat
          label="This month"
          value={usd(thisMonth.reduce((s, r) => s + r.amount, 0))}
          hint={`${thisMonth.length} partner jobs`}
        />
        <Stat
          label="Partner job revenue"
          value={usd(
            partner.reduce((s, r) => s + Number(r.job.final_total ?? r.job.total), 0),
            0,
          )}
        />
        <Stat label="All-time commission" value={usd(partner.reduce((s, r) => s + r.amount, 0))} />
      </div>

      <div className="flex rounded-md border w-fit">
        {(["unpaid", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setShow(v)}
            className={cn(
              "px-3 py-1.5 text-sm capitalize",
              show === v && "bg-primary text-primary-foreground",
            )}
          >
            {v === "unpaid" ? "Owed" : "All completed jobs"}
          </button>
        ))}
      </div>

      <Panel className="p-0">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3">Job</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Completed</th>
                  <th className="p-3">Brought in by</th>
                  <th className="p-3 text-right">Job total</th>
                  <th className="p-3 text-right">Commission</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.job.id} className="border-b last:border-0">
                    <td className="p-3">#{r.job.number}</td>
                    <td className="p-3">
                      {r.job.customers && (
                        <Link
                          to="/admin/customers/$id"
                          params={{ id: r.job.customers.id }}
                          className="underline"
                        >
                          {r.job.customers.name}
                        </Link>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.job.completed_at)}</td>
                    <td className="p-3 capitalize">{r.job.sourced_by}</td>
                    <td className="p-3 text-right tabular-nums">
                      {usd(r.job.final_total ?? r.job.total)}
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {r.job.sourced_by === "partner" ? usd(r.amount) : "–"}
                    </td>
                    <td className="p-3">
                      {r.job.sourced_by === "partner" && (
                        <StatusPill value={r.commission?.status === "paid" ? "paid" : "pending"} />
                      )}
                    </td>
                    <td className="p-3">
                      {r.job.sourced_by === "partner" && r.commission?.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void markPaid([r.job.id])}
                        >
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <Empty>
              {jobs.isLoading
                ? "Loading…"
                : "Nothing owed. Completed jobs brought in by the partner show up here."}
            </Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
