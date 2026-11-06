import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

import { JobDialog } from "@/components/admin/JobDialog";
import { PageHeader, fmtDay, isoDate, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendCustomerEmail } from "@/lib/admin.functions";
import { fetchJobs, fetchUnscheduledJobs, logActivity, useRefresh } from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import type { BlockedSlot, Job } from "@/lib/db-types";
import { windowHours } from "@/lib/ics";
import { ARRIVAL_WINDOWS, SLOTS_PER_WINDOW, publicOrigin } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/calendar")({ component: CalendarPage });

/*
 * Google-Calendar-style schedule. Jobs sit in their arrival window on a time grid.
 * Drag a job (mouse: click and drag; phone: press and hold, then drag) to another day or
 * window to move it; drop it on "Needs a date" to take it off the calendar. Tap a job to
 * confirm, finish, get paid, cancel or delete it. Tap an empty window to block it.
 */

type View = "day" | "week" | "month" | "list";

const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = END_HOUR - START_HOUR;

const STATUS_STYLE: Record<string, string> = {
  requested:
    "border-amber-500 bg-amber-100 text-amber-950 border-dashed dark:bg-amber-900/50 dark:text-amber-50",
  confirmed:
    "border-emerald-600 bg-emerald-100 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-50",
  in_progress:
    "border-indigo-600 bg-indigo-100 text-indigo-950 dark:bg-indigo-900/50 dark:text-indigo-50",
  completed: "border-sky-600 bg-sky-100 text-sky-950 dark:bg-sky-900/50 dark:text-sky-50",
  canceled: "border-zinc-400 bg-zinc-100 text-zinc-500 line-through opacity-70 dark:bg-zinc-800",
};
const STATUS_LABEL: Record<string, string> = {
  requested: "Needs confirming",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Done",
  canceled: "Canceled",
};

const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseDay = (s: string) => new Date(`${s}T12:00:00`);
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
const jobWindow = (j: Job) =>
  j.arrival_window && ARRIVAL_WINDOWS.includes(j.arrival_window)
    ? j.arrival_window
    : ARRIVAL_WINDOWS[0]!;

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return phone;
}

/* ───────────────────────── drag and drop (mouse + touch) ───────────────────────── */

type Drop = { day: string | null; win: string | null };
type DragState = { job: Job; x: number; y: number; over: Drop | null } | null;

function useJobDrag(onDrop: (job: Job, to: Drop) => void) {
  const [drag, setDrag] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  const pending = useRef<{ job: Job; x: number; y: number; touch: boolean; timer?: number } | null>(
    null,
  );
  const justDragged = useRef(false);

  const targetAt = (x: number, y: number): Drop | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
    if (!el) return null;
    return { day: el.dataset["day"] || null, win: el.dataset["win"] || null };
  };

  const set = (s: DragState) => {
    dragRef.current = s;
    setDrag(s);
  };

  useEffect(() => {
    const move = (x: number, y: number) => {
      const p = pending.current;
      if (dragRef.current) {
        set({ ...dragRef.current, x, y, over: targetAt(x, y) });
        return;
      }
      if (!p) return;
      const far = Math.hypot(x - p.x, y - p.y) > 6;
      if (!far) return;
      if (p.touch) {
        // Finger moved before the hold finished: they're scrolling, not dragging.
        window.clearTimeout(p.timer);
        pending.current = null;
      } else {
        set({ job: p.job, x, y, over: targetAt(x, y) });
      }
    };
    const end = () => {
      const p = pending.current;
      if (p?.timer) window.clearTimeout(p.timer);
      pending.current = null;
      const d = dragRef.current;
      if (!d) return;
      set(null);
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 50);
      if (d.over) onDrop(d.job, d.over);
    };
    const pm = (e: PointerEvent) => move(e.clientX, e.clientY);
    const tm = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault(); // hold the page still while dragging
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    };
    const cancel = () => {
      if (!dragRef.current && pending.current?.timer) window.clearTimeout(pending.current.timer);
      if (!dragRef.current) pending.current = null;
    };
    window.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", end);
    window.addEventListener("touchmove", tm, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", pm);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", end);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [onDrop]);

  const start = (e: RPointerEvent, job: Job) => {
    if (e.button !== 0) return;
    const touch = e.pointerType !== "mouse";
    const p = { job, x: e.clientX, y: e.clientY, touch } as NonNullable<typeof pending.current>;
    if (touch) {
      p.timer = window.setTimeout(() => {
        navigator.vibrate?.(20);
        set({ job, x: p.x, y: p.y, over: targetAt(p.x, p.y) });
      }, 380);
    }
    pending.current = p;
  };

  return { drag, start, wasDrag: () => justDragged.current };
}

/* ───────────────────────────────── the page ───────────────────────────────── */

function CalendarPage() {
  const phone = useIsPhone();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [job, setJob] = useState<Job | null>(null);
  const [showCanceled, setShowCanceled] = useState(false);
  const refresh = useRefresh();
  const email = useServerFn(sendCustomerEmail);

  useEffect(() => setView(phone ? "day" : "week"), [phone]);

  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: anchor };
    if (view === "week") return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 6) };
    if (view === "list") return { from: anchor, to: addDays(anchor, 30) };
    const first = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    return { from: first, to: addDays(first, 41) };
  }, [view, anchor]);
  const from = isoDate(range.from);
  const to = isoDate(range.to);
  // The strip of days on the phone day view needs the whole week loaded.
  const loadFrom = view === "day" ? isoDate(startOfWeek(anchor)) : from;
  const loadTo = view === "day" ? isoDate(addDays(startOfWeek(anchor), 6)) : to;

  const jobs = useQuery({
    queryKey: ["jobs", loadFrom, loadTo],
    queryFn: () => fetchJobs(loadFrom, loadTo),
  });
  const unscheduled = useQuery({ queryKey: ["jobs-unscheduled"], queryFn: fetchUnscheduledJobs });
  const requested = useQuery({
    queryKey: ["jobs-requested"],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("jobs")
        .select("*, customers(id,name,phone,email)")
        .eq("status", "requested")
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Job[];
    },
  });
  const blocked = useQuery({
    queryKey: ["blocked", loadFrom, loadTo],
    queryFn: async () => {
      const { data, error } = await dbOrThrow()
        .from("blocked_slots")
        .select("*")
        .gte("day", loadFrom)
        .lte("day", loadTo);
      if (error) throw error;
      return data as BlockedSlot[];
    },
  });

  const visible = (jobs.data ?? []).filter((j) => showCanceled || j.status !== "canceled");
  const jobsOn = (d: string) => visible.filter((j) => j.scheduled_date === d);
  const blockOf = (d: string, w: string | null) =>
    (blocked.data ?? []).find((b) => b.day === d && b.arrival_window === w);
  const dayBlocked = (d: string) => !!blockOf(d, null);

  /* ---------- actions ---------- */

  const toggleBlock = async (d: string, w: string | null) => {
    const existing = blockOf(d, w);
    const c = dbOrThrow();
    const { error } = existing
      ? await c.from("blocked_slots").delete().eq("id", existing.id)
      : await c
          .from("blocked_slots")
          .insert({ day: d, arrival_window: w, reason: "Blocked in calendar" });
    if (error) return void toast.error(error.message);
    toast.success(
      existing
        ? "Open again for online booking"
        : `${w ? w : "Whole day"} blocked: customers can't book it online`,
    );
    void refresh();
  };

  const emailNewTime = async (j: Job, day: string, win: string) => {
    const c = j.customers;
    if (!c?.email) return void toast.error("No email on file. Text them the new time.");
    const res = await email({
      data: {
        auth: await accessToken(),
        kind: "moved",
        to: c.email,
        name: c.name,
        origin: publicOrigin(),
        customerId: j.customer_id,
        jobId: j.id,
        number: j.number,
        day: fmtDay(day),
        window: win,
        notes: j.address ? `Address: ${j.address}` : "",
        items: j.items,
        subtotal: Number(j.subtotal),
        tax: Number(j.tax),
        total: Number(j.final_total ?? j.total),
      },
    });
    if (res.ok) toast.success(`Emailed ${c.name.split(" ")[0]} the new time`);
    else toast.error(res.error);
  };

  const moveJob = async (j: Job, toDrop: Drop) => {
    const day = toDrop.day;
    const win = toDrop.win ?? jobWindow(j);
    if (day === j.scheduled_date && win === j.arrival_window) return;
    const before = { scheduled_date: j.scheduled_date, arrival_window: j.arrival_window };
    const patch = {
      scheduled_date: day,
      arrival_window: win,
      updated_at: new Date().toISOString(),
    };
    const { error } = await dbOrThrow().from("jobs").update(patch).eq("id", j.id);
    if (error) return void toast.error(error.message);
    await logActivity({
      customer_id: j.customer_id,
      job_id: j.id,
      kind: "status",
      body: day
        ? `Job #${j.number} moved to ${fmtDay(day)}, ${win}`
        : `Job #${j.number} taken off the calendar`,
    });
    void refresh();

    const clash =
      day &&
      (jobs.data ?? []).filter(
        (o) =>
          o.id !== j.id &&
          o.status !== "canceled" &&
          o.scheduled_date === day &&
          o.arrival_window === win,
      ).length >= SLOTS_PER_WINDOW;
    const undo = async () => {
      await dbOrThrow().from("jobs").update(before).eq("id", j.id);
      void refresh();
      toast.message("Moved back");
    };
    const name = j.customers?.name ?? `Job #${j.number}`;
    toast.success(day ? `${name}: ${fmtDay(day)}, ${win}` : `${name}: needs a date`, {
      description: clash
        ? "Heads up: another job is already in that window."
        : day && j.status === "confirmed"
          ? "They were confirmed for the old time. Let them know."
          : undefined,
      duration: 9000,
      action:
        day && j.status === "confirmed" && j.customers?.email
          ? { label: "Email new time", onClick: () => void emailNewTime(j, day, win) }
          : { label: "Undo", onClick: () => void undo() },
      ...(day && j.status === "confirmed" && j.customers?.email
        ? { cancel: { label: "Undo", onClick: () => void undo() } }
        : {}),
    });
  };

  const { drag, start, wasDrag } = useJobDrag(
    useMemo(() => (j: Job, d: Drop) => void moveJob(j, d), [jobs.data]), // eslint-disable-line react-hooks/exhaustive-deps
  );
  const open = (j: Job) => {
    if (!wasDrag()) setJob(j);
  };

  /* ---------- navigation ---------- */

  const step = (n: number) =>
    setAnchor((a) =>
      view === "day"
        ? addDays(a, n)
        : view === "week"
          ? addDays(a, 7 * n)
          : view === "list"
            ? addDays(a, 30 * n)
            : new Date(a.getFullYear(), a.getMonth() + n, 1),
    );
  const title =
    view === "day"
      ? anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : view === "month"
        ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : `${range.from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${range.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const weekDays =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(range.from, i))
      : view === "day"
        ? [anchor]
        : [];

  const chipProps = (j: Job) => ({
    onPointerDown: (e: RPointerEvent) => start(e, j),
    onClick: () => open(j),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { WebkitTouchCallout: "none" } as React.CSSProperties,
  });

  const draggingId = drag?.job.id;
  const isOver = (d: string | null, w: string | null) =>
    !!drag?.over && drag.over.day === d && (drag.over.win ?? null) === w;

  return (
    <div className={cn(drag && "cursor-grabbing select-none")}>
      <PageHeader
        title="Calendar"
        sub={
          phone
            ? "Tap a job to open it. Press and hold a job, then drag to move it."
            : "Drag a job to move it. Click a job to confirm, finish, get paid or delete. Click an empty window to block it from online booking."
        }
      />

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border">
          {(["day", "week", "month", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm capitalize",
                view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
        <div className="text-base font-semibold sm:text-lg">{title}</div>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showCanceled}
            onChange={(e) => setShowCanceled(e.target.checked)}
          />
          Show canceled
        </label>
      </div>

      {/* requests waiting */}
      <RequestStrip
        jobs={requested.data ?? []}
        unscheduled={(unscheduled.data ?? []).filter((j) => j.status !== "requested")}
        chipProps={chipProps}
        draggingId={draggingId}
        dropActive={!!drag}
        over={isOver(null, null)}
      />

      {/* phone day view: week strip */}
      {view === "day" && (
        <div className="mb-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => {
            const k = isoDate(d);
            const n = jobsOn(k).length;
            const sel = k === isoDate(anchor);
            const today = k === isoDate(new Date());
            return (
              <button
                key={k}
                onClick={() => setAnchor(d)}
                data-drop
                data-day={k}
                className={cn(
                  "flex flex-col items-center rounded-lg border py-1.5 text-xs",
                  sel ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  !sel && today && "border-primary text-primary",
                  isOver(k, null) && "ring-2 ring-primary",
                )}
              >
                <span className="opacity-80">
                  {d.toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
                <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                <span className="flex h-2 items-center gap-0.5">
                  {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full",
                        sel ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {(view === "day" || view === "week") && (
        <TimeGrid
          days={weekDays}
          jobsOn={jobsOn}
          blockOf={blockOf}
          dayBlocked={dayBlocked}
          toggleBlock={toggleBlock}
          chipProps={chipProps}
          draggingId={draggingId}
          isOver={isOver}
          compact={view === "week"}
        />
      )}

      {view === "month" && (
        <MonthGrid
          from={range.from}
          anchor={anchor}
          jobsOn={jobsOn}
          dayBlocked={dayBlocked}
          chipProps={chipProps}
          draggingId={draggingId}
          isOver={isOver}
          onDay={(d) => {
            setAnchor(d);
            setView(phone ? "day" : "week");
          }}
        />
      )}

      {view === "list" && (
        <ListView
          from={range.from}
          jobsOn={jobsOn}
          dayBlocked={dayBlocked}
          onOpen={(j) => setJob(j)}
        />
      )}

      <Legend />

      {/* what's being dragged follows the pointer */}
      {drag && (
        <div
          className={cn(
            "pointer-events-none fixed z-[100] w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border-l-4 px-2 py-1.5 text-xs shadow-xl",
            STATUS_STYLE[drag.job.status],
          )}
          style={{ left: drag.x, top: drag.y }}
        >
          <div className="truncate font-semibold">{drag.job.customers?.name}</div>
          <div className="truncate opacity-80">
            {drag.over
              ? drag.over.day
                ? `→ ${fmtDay(drag.over.day)}${drag.over.win ? `, ${drag.over.win}` : ""}`
                : "→ Needs a date"
              : "Drop on a day and time"}
          </div>
        </div>
      )}

      <JobDialog job={job} onClose={() => setJob(null)} />
    </div>
  );
}

type ChipProps = (j: Job) => {
  onPointerDown: (e: RPointerEvent) => void;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  style: React.CSSProperties;
};

/* ───────────────────────────────── pieces ───────────────────────────────── */

function JobCard({
  j,
  chipProps,
  dragging,
  compact,
}: {
  j: Job;
  chipProps: ChipProps;
  dragging: boolean;
  compact?: boolean;
}) {
  const where = [j.address, j.zip].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      {...chipProps(j)}
      title={`${j.customers?.name ?? ""} · ${jobWindow(j)} · ${STATUS_LABEL[j.status] ?? j.status}`}
      className={cn(
        "group flex h-full w-full min-w-0 cursor-grab flex-col overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left text-xs shadow-sm transition hover:shadow-md active:cursor-grabbing",
        STATUS_STYLE[j.status],
        dragging && "opacity-30",
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <GripVertical className="hidden size-3 flex-none opacity-40 group-hover:inline md:inline" />
        <span className="truncate font-semibold">{j.customers?.name ?? `Job #${j.number}`}</span>
      </span>
      <span className="truncate opacity-80">
        {jobWindow(j)} · {usd(j.final_total ?? j.total, 0)}
      </span>
      {!compact && where && <span className="truncate opacity-70">{where}</span>}
      {j.status === "requested" && !compact && (
        <span className="mt-auto truncate text-[10px] font-semibold uppercase tracking-wide">
          Confirm
        </span>
      )}
    </button>
  );
}

function RequestStrip({
  jobs,
  unscheduled,
  chipProps,
  draggingId,
  dropActive,
  over,
}: {
  jobs: Job[];
  unscheduled: Job[];
  chipProps: ChipProps;
  draggingId: string | undefined;
  dropActive: boolean;
  over: boolean;
}) {
  // Nothing waiting: no strip (and it never pops in mid-drag, which would shift the grid).
  if (!jobs.length && !unscheduled.length) return null;
  return (
    <div
      data-drop
      data-day=""
      className={cn(
        "mb-3 rounded-xl border bg-card p-3 transition",
        dropActive && "border-dashed border-primary/50",
        over && "bg-primary/10 ring-2 ring-primary",
      )}
    >
      {!!jobs.length && (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              Waiting for you to confirm{" "}
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {jobs.length}
              </span>
            </div>
            <span
              className={cn(
                "hidden text-xs sm:inline",
                dropActive ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {dropActive
                ? "Drop here to take a job off the calendar"
                : "Tap to confirm, or drag onto a new time first"}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {jobs.map((j) => (
              <div key={j.id} className="h-[62px] w-48 flex-none">
                <button
                  type="button"
                  {...chipProps(j)}
                  className={cn(
                    "flex h-full w-full cursor-grab flex-col justify-center rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 px-2.5 text-left text-xs dark:bg-amber-950/40",
                    draggingId === j.id && "opacity-30",
                  )}
                >
                  <span className="truncate text-sm font-semibold">{j.customers?.name}</span>
                  <span className="truncate text-muted-foreground">
                    {j.scheduled_date
                      ? `${fmtDay(j.scheduled_date)}, ${jobWindow(j)}`
                      : "No date yet"}{" "}
                    · {usd(j.total, 0)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {!!unscheduled.length && (
        <div className={cn(jobs.length && "mt-3")}>
          <div className="mb-2 text-sm font-semibold">Needs a date</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unscheduled.map((j) => (
              <div key={j.id} className="h-[54px] w-44 flex-none">
                <JobCard j={j} chipProps={chipProps} dragging={draggingId === j.id} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeGrid({
  days,
  jobsOn,
  blockOf,
  dayBlocked,
  toggleBlock,
  chipProps,
  draggingId,
  isOver,
  compact,
}: {
  days: Date[];
  jobsOn: (d: string) => Job[];
  blockOf: (d: string, w: string | null) => BlockedSlot | undefined;
  dayBlocked: (d: string) => boolean;
  toggleBlock: (d: string, w: string | null) => Promise<void>;
  chipProps: ChipProps;
  draggingId: string | undefined;
  isOver: (d: string | null, w: string | null) => boolean;
  compact: boolean;
}) {
  const hourPx = compact ? 46 : 60;
  const todayKey = isoDate(new Date());
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * hourPx;

  return (
    <div className={cn("rounded-xl border bg-card", compact && "overflow-x-auto")}>
      <div className={cn(compact && "min-w-[760px]")}>
        {/* day headers */}
        <div className="sticky top-0 z-20 flex border-b bg-card">
          <div className="w-12 flex-none" />
          {days.map((d) => {
            const k = isoDate(d);
            const sun = d.getDay() === 0;
            const blockedDay = dayBlocked(k);
            return (
              <div
                key={k}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-between gap-1 border-l px-2 py-1.5",
                  sun && "bg-muted/50",
                )}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-sm font-bold",
                      k === todayKey && "bg-primary text-primary-foreground",
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={`Options for ${fmtDay(k)}`}
                  >
                    {blockedDay ? (
                      <Lock className="size-3.5" />
                    ) : (
                      <CalendarDays className="size-3.5" />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{fmtDay(k)}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void toggleBlock(k, null)}>
                      {blockedDay ? (
                        <>
                          <Unlock className="mr-2 size-4" /> Open the day for booking
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 size-4" /> Block the whole day
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>

        {/* grid */}
        <div className="relative flex" style={{ height: HOURS * hourPx }}>
          {/* hour labels + lines */}
          <div className="relative w-12 flex-none">
            {Array.from({ length: HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground"
                style={{ top: i * hourPx }}
              >
                {i === 0 ? "" : hourLabel(START_HOUR + i)}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 left-12">
            {Array.from({ length: HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-border/60"
                style={{ top: i * hourPx }}
              />
            ))}
          </div>

          {days.map((d) => {
            const k = isoDate(d);
            const list = jobsOn(k);
            const blockedDay = dayBlocked(k);
            return (
              <div
                key={k}
                className={cn(
                  "relative min-w-0 flex-1 border-l",
                  d.getDay() === 0 && "bg-muted/40",
                )}
              >
                {/* window drop zones */}
                {ARRIVAL_WINDOWS.map((w) => {
                  const [a, b] = windowHours(w);
                  const inWin = list.filter((j) => jobWindow(j) === w);
                  const blk = blockOf(k, w);
                  const closed = blockedDay || !!blk;
                  return (
                    <div
                      key={w}
                      data-drop
                      data-day={k}
                      data-win={w}
                      className={cn(
                        "absolute inset-x-0.5 rounded-md transition",
                        closed &&
                          "bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(0_0%_50%/0.14)_6px_12px)]",
                        isOver(k, w) && "bg-primary/15 ring-2 ring-primary",
                      )}
                      style={{ top: (a - START_HOUR) * hourPx + 1, height: (b - a) * hourPx - 2 }}
                    >
                      {inWin.length ? (
                        <div className="flex h-full gap-0.5">
                          {inWin.map((j) => (
                            <div key={j.id} className="h-full min-w-0 flex-1">
                              <JobCard
                                j={j}
                                chipProps={chipProps}
                                dragging={draggingId === j.id}
                                compact={compact || inWin.length > 1}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={blockedDay}
                            className="group flex h-full w-full items-center justify-center rounded-md text-[11px] text-muted-foreground outline-none hover:bg-muted/60 data-[state=open]:bg-muted"
                          >
                            <span
                              className={cn(
                                !closed &&
                                  "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-50",
                              )}
                            >
                              {blockedDay ? "Day blocked" : blk ? "Blocked" : "Open"}
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>
                              {fmtDay(k)}, {w}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void toggleBlock(k, w)}>
                              {blk ? (
                                <>
                                  <Unlock className="mr-2 size-4" /> Open for online booking
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 size-4" /> Block this window
                                </>
                              )}
                            </DropdownMenuItem>
                            {!blk && (
                              <DropdownMenuItem onClick={() => void toggleBlock(k, null)}>
                                <Lock className="mr-2 size-4" /> Block the whole day
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                {k === todayKey && nowTop > 0 && nowTop < HOURS * hourPx && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  from,
  anchor,
  jobsOn,
  dayBlocked,
  chipProps,
  draggingId,
  isOver,
  onDay,
}: {
  from: Date;
  anchor: Date;
  jobsOn: (d: string) => Job[];
  dayBlocked: (d: string) => boolean;
  chipProps: ChipProps;
  draggingId: string | undefined;
  isOver: (d: string | null, w: string | null) => boolean;
  onDay: (d: Date) => void;
}) {
  const todayKey = isoDate(new Date());
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div
          key={d}
          className="bg-card p-1.5 text-center text-xs font-medium text-muted-foreground"
        >
          {d}
        </div>
      ))}
      {Array.from({ length: 42 }, (_, i) => addDays(from, i)).map((d) => {
        const k = isoDate(d);
        const list = jobsOn(k);
        return (
          <div
            key={k}
            data-drop
            data-day={k}
            className={cn(
              "min-h-20 bg-card p-1 sm:min-h-28",
              d.getMonth() !== anchor.getMonth() && "opacity-45",
              dayBlocked(k) &&
                "bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(0_0%_50%/0.12)_6px_12px)]",
              isOver(k, null) && "bg-primary/10 ring-2 ring-inset ring-primary",
            )}
          >
            <button
              onClick={() => onDay(d)}
              className={cn(
                "mb-1 grid size-6 place-items-center rounded-full text-xs font-semibold hover:bg-muted",
                k === todayKey && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {d.getDate()}
            </button>
            <div className="space-y-0.5">
              {list.slice(0, 3).map((j) => (
                <div key={j.id} className="h-[34px] sm:h-[38px]">
                  <JobCard j={j} chipProps={chipProps} dragging={draggingId === j.id} compact />
                </div>
              ))}
              {list.length > 3 && (
                <button
                  onClick={() => onDay(d)}
                  className="text-[11px] text-muted-foreground hover:underline"
                >
                  +{list.length - 3} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  from,
  jobsOn,
  dayBlocked,
  onOpen,
}: {
  from: Date;
  jobsOn: (d: string) => Job[];
  dayBlocked: (d: string) => boolean;
  onOpen: (j: Job) => void;
}) {
  const days = Array.from({ length: 31 }, (_, i) => addDays(from, i))
    .map((d) => ({ d, k: isoDate(d) }))
    .filter(({ k }) => jobsOn(k).length || dayBlocked(k));
  if (!days.length)
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Nothing booked in the next 30 days.
      </div>
    );
  return (
    <div className="divide-y rounded-xl border bg-card">
      {days.map(({ d, k }) => (
        <div key={k} className="flex gap-3 p-3">
          <div className="w-12 flex-none text-center">
            <div className="text-xs uppercase text-muted-foreground">
              {d.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div className="text-xl font-bold leading-tight">{d.getDate()}</div>
            <div className="text-[11px] text-muted-foreground">
              {d.toLocaleDateString("en-US", { month: "short" })}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {dayBlocked(k) && (
              <div className="text-xs text-muted-foreground">
                <Lock className="mr-1 inline size-3" />
                Blocked for online booking
              </div>
            )}
            {jobsOn(k)
              .sort((a, b) => windowHours(jobWindow(a))[0] - windowHours(jobWindow(b))[0])
              .map((j) => (
                <button
                  key={j.id}
                  onClick={() => onOpen(j)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border-l-4 px-3 py-2 text-left text-sm",
                    STATUS_STYLE[j.status],
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {jobWindow(j)} · {j.customers?.name}
                    </span>
                    <span className="block truncate text-xs opacity-80">
                      {[j.address, j.zip].filter(Boolean).join(" ") || "No address yet"}
                    </span>
                  </span>
                  <span className="flex-none text-right text-xs">
                    <span className="block font-semibold">{usd(j.final_total ?? j.total, 0)}</span>
                    <span className="block opacity-80">{STATUS_LABEL[j.status]}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["requested", "confirmed", "completed"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm border-l-4", STATUS_STYLE[s])} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-[repeating-linear-gradient(135deg,transparent_0_3px,hsl(0_0%_50%/0.4)_3px_6px)]" />
        Blocked (customers can't book online)
      </span>
    </div>
  );
}
