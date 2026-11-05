import { useState, type DragEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, ago } from "@/components/admin/ui";
import { fetchCustomers, setCustomerStage, useRefresh } from "@/lib/admin-data";
import { STAGES, type Stage } from "@/lib/db-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pipeline")({ component: Pipeline });

const LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  completed: "Job done",
  paid: "Paid",
  lost: "Lost",
};

function Pipeline() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const refresh = useRefresh();
  const [over, setOver] = useState<Stage | null>(null);

  const drop = async (e: DragEvent, stage: Stage) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const c = (customers.data ?? []).find((x) => x.id === id);
    if (!c || c.stage === stage) return;
    await setCustomerStage(id, stage);
    void refresh();
  };

  return (
    <div>
      <PageHeader
        title="Pipeline"
        sub="Drag a card to move a customer, or change the stage on their page."
      />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const list = (customers.data ?? []).filter((c) => c.stage === s);
          return (
            <div
              key={s}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => void drop(e, s)}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-xl border bg-card",
                over === s && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between border-b p-3 text-sm font-semibold">
                {LABEL[s]} <span className="rounded-full bg-muted px-2 text-xs">{list.length}</span>
              </div>
              <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                {list.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className="cursor-grab rounded-lg border bg-background p-2.5 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: c.id }}
                      className="block truncate font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{c.phone}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{c.source || "direct"}</span>
                      <span>{ago(c.updated_at)}</span>
                    </div>
                    <select
                      aria-label="Move to stage"
                      className="mt-2 w-full rounded border bg-background px-1 py-0.5 text-xs md:hidden"
                      value={c.stage}
                      onChange={async (e) => {
                        await setCustomerStage(c.id, e.target.value as Stage);
                        void refresh();
                      }}
                    >
                      {STAGES.map((x) => (
                        <option key={x} value={x}>
                          {LABEL[x]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
