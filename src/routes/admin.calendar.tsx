import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import { Empty, PageHeader, Panel, StatusPill, fmtDay, isoDate, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fetchJobs, fetchUnscheduledJobs, useRefresh } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import type { BlockedSlot, Job } from "@/lib/db-types";
import { ARRIVAL_WINDOWS } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/calendar")({ component: CalendarPage });

const STATUS_BG: Record<string, string> = {
  requested: "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
  confirmed: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
  in_progress: "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40",
  completed: "border-teal-500 bg-teal-50 dark:bg-teal-950/40",
  canceled: "border-zinc-300 bg-zinc-50 opacity-60 line-through dark:bg-zinc-900",
};

const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function CalendarPage() {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [job, setJob] = useState<Job | null>(null);
  const refresh = useRefresh();

  const from =
    view === "week"
      ? startOfWeek(anchor)
      : startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const days = view === "week" ? 7 : 42;
  const to = addDays(from, days - 1);

  const jobs = useQuery({
    queryKey: ["jobs", isoDate(from), isoDate(to)],
    queryFn: () => fetchJobs(isoDate(from), isoDate(to)),
  });
  const unscheduled = useQuery({ queryKey: ["jobs-unscheduled"], queryFn: fetchUnscheduledJobs });
  const blocked = useQuery({
    queryKey: ["blocked", isoDate(from), isoDate(to)],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("blocked_slots")
        .select("*")
        .gte("day", isoDate(from))
        .lte("day", isoDate(to));
      if (error) throw error;
      return data as BlockedSlot[];
    },
  });

  const byDay = (d: Date) => (jobs.data ?? []).filter((j) => j.scheduled_date === isoDate(d));
  const blockedFor = (d: Date, w: string | null) =>
    (blocked.data ?? []).find(
      (b) => b.day === isoDate(d) && (b.arrival_window === null || b.arrival_window === w),
    );

  const toggleBlock = async (d: Date, w: string | null) => {
    const existing = (blocked.data ?? []).find(
      (b) => b.day === isoDate(d) && b.arrival_window === w,
    );
    const c = dbOrThrow();
    const { error } = existing
      ? await c.from("blocked_slots").delete().eq("id", existing.id)
      : await c
          .from("blocked_slots")
          .insert({ day: isoDate(d), arrival_window: w, reason: "Blocked in calendar" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(existing ? "Opened for booking" : "Blocked: customers can't book this online");
    void refresh();
  };

  const step = (n: number) =>
    setAnchor((a) =>
      view === "week" ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1),
    );

  const title =
    view === "week"
      ? `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(from, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const JobChip = ({ j }: { j: Job }) => (
    <button
      onClick={() => setJob(j)}
      className={cn(
        "block w-full rounded-md border-l-4 px-2 py-1 text-left text-xs hover:shadow",
        STATUS_BG[j.status],
      )}
    >
      <span className="block truncate font-semibold">{j.customers?.name}</span>
      <span className="block truncate text-muted-foreground">
        {view === "month" ? `${j.arrival_window} · ` : ""}
        {usd(j.final_total ?? j.total, 0)}
      </span>
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Calendar"
        sub="Tap a job to confirm, reschedule, invoice or mark paid. Block a slot or day to stop online bookings for it."
        actions={
          <>
            <div className="flex rounded-md border">
              {(["week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-sm capitalize",
                    view === v && "bg-primary text-primary-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next">
              <ChevronRight />
            </Button>
          </>
        }
      />
      <div className="mb-3 text-lg font-semibold">{title}</div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {view === "week" ? (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-24 border-b p-2 text-left text-xs font-medium text-muted-foreground">
                    Arrival
                  </th>
                  {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
                    const isToday = isoDate(d) === isoDate(new Date());
                    const dayBlock = (blocked.data ?? []).some(
                      (b) => b.day === isoDate(d) && b.arrival_window === null,
                    );
                    return (
                      <th
                        key={d.toISOString()}
                        className={cn(
                          "border-b border-l p-2 text-left",
                          isToday && "bg-primary/10",
                        )}
                      >
                        <div className="text-xs font-medium text-muted-foreground">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{d.getDate()}</span>
                          <button
                            className="text-xs underline text-muted-foreground"
                            onClick={() => void toggleBlock(d, null)}
                          >
                            {dayBlock ? "Unblock day" : "Block day"}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ARRIVAL_WINDOWS.map((w) => (
                  <tr key={w}>
                    <td className="border-b p-2 align-top text-xs font-semibold text-muted-foreground">
                      {w}
                    </td>
                    {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => {
                      const cell = byDay(d).filter((j) => j.arrival_window === w);
                      const b = blockedFor(d, w);
                      return (
                        <td
                          key={d.toISOString() + w}
                          className={cn(
                            "h-24 border-b border-l p-1.5 align-top",
                            b &&
                              "bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(0_0%_50%/0.08)_6px_12px)]",
                          )}
                        >
                          <div className="space-y-1">
                            {cell.map((j) => (
                              <JobChip key={j.id} j={j} />
                            ))}
                          </div>
                          {!cell.length && (
                            <button
                              className="mt-1 text-[11px] text-muted-foreground hover:underline"
                              onClick={() => void toggleBlock(d, w)}
                            >
                              {b
                                ? b.arrival_window
                                  ? "Blocked · tap to open"
                                  : "Day blocked"
                                : "Block"}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-card p-2 text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map((d) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const list = byDay(d);
              return (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "min-h-28 bg-card p-1.5",
                    !inMonth && "opacity-40",
                    blockedFor(d, null) && "bg-muted",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">{d.getDate()}</div>
                  <div className="space-y-1">
                    {list.slice(0, 4).map((j) => (
                      <JobChip key={j.id} j={j} />
                    ))}
                    {list.length > 4 && (
                      <div className="text-xs text-muted-foreground">+{list.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Panel title="Needs a date">
          {(unscheduled.data ?? []).length ? (
            <ul className="space-y-2">
              {(unscheduled.data ?? []).map((j) => (
                <li key={j.id}>
                  <button
                    onClick={() => setJob(j)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{j.customers?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Job #{j.number} · {fmtDay(j.scheduled_date)}
                      </span>
                    </span>
                    <StatusPill value={j.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Every job has a date.</Empty>
          )}
        </Panel>
      </div>

      <JobDialog job={job} onClose={() => setJob(null)} />
    </div>
  );
}
