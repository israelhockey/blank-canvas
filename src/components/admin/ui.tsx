import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* Small shared pieces for the admin screens. */

export const usd = (n: number | null | undefined, digits = 2) =>
  "$" +
  Number(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtDate = (s: string | null | undefined) =>
  s
    ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

export const fmtDay = (s: string | null | undefined) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "No date";

export const fmtDateTime = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export function ago(s: string) {
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const telHref = (p: string | null | undefined) =>
  p ? `tel:+1${p.replace(/\D/g, "").slice(-10)}` : undefined;
export const smsHref = (p: string | null | undefined) =>
  p ? `sms:+1${p.replace(/\D/g, "").slice(-10)}` : undefined;

const TONES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  requested: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  contacted: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  quoted: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  sent: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  viewed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  booked: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  won: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  paid: "bg-green-600 text-white",
  lost: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  canceled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  declined: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  expired: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  spam: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-600 text-white",
  suppressed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  unpaid: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

export function StatusPill({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize whitespace-nowrap",
        TONES[value] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-medium", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";
