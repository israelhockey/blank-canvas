import { ARRIVAL_WINDOWS, SITE_ORIGIN } from "./site-data";

/* iCalendar feed of jobs, for /calendar-feed/<secret>.ics */

export type FeedJob = {
  id: string;
  number: number;
  customer_id: string;
  scheduled_date: string;
  arrival_window: string | null;
  status: string;
  items: { label: string; amount: number }[];
  total: number;
  final_total: number | null;
  address: string | null;
  zip: string | null;
  notes: string | null;
  updated_at?: string;
  created_at: string;
  customers: { name: string; phone: string | null; email: string | null } | null;
};

/** "9–11am" → [9, 11], "11am–1pm" → [11, 13]. Unknown windows default to 9–11. */
export function windowHours(w: string | null): [number, number] {
  const m = /(\d{1,2})(am|pm)?\s*[–-]\s*(\d{1,2})(am|pm)/i.exec(w ?? "");
  if (!m) return [9, 11];
  const to24 = (h: number, ap: string) => (ap.toLowerCase() === "pm" && h < 12 ? h + 12 : h);
  const endAp = m[4]!;
  const end = to24(Number(m[3]), endAp);
  const startAp = m[2] ?? (Number(m[1]) > Number(m[3]) ? "am" : endAp);
  return [to24(Number(m[1]), startAp), end];
}

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines must be folded at 75 octets per RFC 5545. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
};

const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function buildIcs(jobs: FeedJob[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Simple Surface Carpet Cleaning//Jobs//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Simple Surface jobs",
    "X-WR-TIMEZONE:America/Chicago",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    // Central time zone, so times show correctly on any phone.
    "BEGIN:VTIMEZONE",
    "TZID:America/Chicago",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0500",
    "TZNAME:CDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  const now = stamp(new Date());
  for (const j of jobs) {
    const [h1, h2] = windowHours(
      j.arrival_window && ARRIVAL_WINDOWS.includes(j.arrival_window) ? j.arrival_window : null,
    );
    const day = j.scheduled_date.replace(/-/g, "");
    const pad = (n: number) => String(n).padStart(2, "0");
    const c = j.customers;
    const total = Number(j.final_total ?? j.total);
    const prefix =
      j.status === "requested" ? "[NOT CONFIRMED] " : j.status === "completed" ? "✓ " : "";
    const summary = `${prefix}${c?.name ?? "Job"} · $${Math.round(total)}`;
    const where = j.address || (j.zip ? `ZIP ${j.zip}` : "");
    const desc = [
      `Job #${j.number} (${j.status})`,
      `Arrival: ${j.arrival_window ?? "not set"}`,
      c?.phone ? `Phone: ${c.phone}` : "",
      c?.email ? `Email: ${c.email}` : "",
      j.items?.length ? `Items: ${j.items.map((i) => i.label).join(", ")}` : "",
      `Total with tax: $${total.toFixed(2)}`,
      j.notes ? `Notes: ${j.notes}` : "",
      `Open: ${SITE_ORIGIN}/admin/customers/${j.customer_id}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:job-${j.id}@simplesurfacecarpetcleaning.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=America/Chicago:${day}T${pad(h1)}0000`,
      `DTEND;TZID=America/Chicago:${day}T${pad(h2)}0000`,
      fold(`SUMMARY:${esc(summary)}`),
      ...(where ? [fold(`LOCATION:${esc(where)}`)] : []),
      fold(`DESCRIPTION:${esc(desc)}`),
      `STATUS:${j.status === "requested" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
