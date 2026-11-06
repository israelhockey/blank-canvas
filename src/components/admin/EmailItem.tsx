import type { Activity } from "@/lib/db-types";
import { StatusPill, fmtDateTime } from "./ui";

/** Email record saved by the server in activities.body (see src/lib/email.ts). */
export type EmailRecord = {
  v: 1;
  type: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "suppressed";
  error?: string;
  text: string;
};

export function parseEmail(body: string | null): EmailRecord | null {
  if (!body || body[0] !== "{") return null;
  try {
    const r = JSON.parse(body) as EmailRecord;
    return r.v === 1 && r.subject ? r : null;
  } catch {
    return null;
  }
}

export const EMAIL_TYPE: Record<string, string> = {
  request_received: "Booking received",
  confirm: "Booking confirmed",
  moved: "New time",
  reminder: "Reminder",
  quote: "Quote",
  quote_accepted: "Quote accepted",
  receipt: "Receipt",
  review: "Review request",
  repeat: "Repeat-clean reminder",
  custom: "Message",
  quote_nudge: "Quote follow-up",
  price_sent: "Their saved price",
  quick_quote: "Quick quote reply",
  stain_guide: "Stain guide",
};

/** One email in a customer's email chain: subject, status, and the full text on tap. */
export function EmailItem({ activity }: { activity: Activity }) {
  const r = parseEmail(activity.body);
  if (!r) {
    // Older plain-text entries ("Sent reminder email")
    return (
      <div className="rounded-lg border px-3 py-2 text-sm">
        <div className="text-xs text-muted-foreground">{fmtDateTime(activity.created_at)}</div>
        {activity.body}
      </div>
    );
  }
  return (
    <details className="group rounded-lg border px-3 py-2 text-sm open:bg-muted/40">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-medium">{r.subject}</span>
          <span className="block text-xs text-muted-foreground">
            {EMAIL_TYPE[r.type] ?? r.type} · to {r.to} · {fmtDateTime(activity.created_at)}
          </span>
        </span>
        <StatusPill value={r.status} />
      </summary>
      {r.error && <p className="mt-2 text-xs text-red-600">{r.error}</p>}
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
        {r.text}
      </pre>
    </details>
  );
}
