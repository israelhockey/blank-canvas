import { ARRIVAL_WINDOWS } from "@/lib/site-data";

/*
 * Reads the text Hanks sends for a sub job, e.g.
 *   "Sub job: Mon 11/16, 11 AM - Carpet cleaning 2 rooms + 3 master closets - ARGYLE - pays $100.
 *    Reply YES to take it. It's yours! Mon 11/16, 11 AM - Carpet cleaning 2 rooms + 3 master
 *    closets - Derek DeGuire, 784 CIMARRON COURT, ARGYLE, TX 76226. Access: Gate code is 1031
 *    Text this number when you're on the way with your ETA"
 * Works with the offer alone, the "It's yours!" part alone, or both pasted together.
 * Anything it can't find is left blank for you to type in.
 */
export type HanksJob = {
  date: string; // yyyy-mm-dd
  time: string; // "11 AM"
  window: string; // one of ARRIVAL_WINDOWS
  work: string;
  pay: number | null;
  name: string;
  street: string;
  city: string;
  zip: string;
  access: string;
  extra: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "Mon 11/16" → the next 11/16 (this year, or next year if it's long past). */
function resolveDate(month: number, day: number, today = new Date()): string {
  let y = today.getFullYear();
  const d = new Date(y, month - 1, day);
  if (d.getTime() < today.getTime() - 60 * 86400e3) y += 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}

/** "11 AM" / "1:30 PM" → hour in 24h (11, 13.5). */
function hourOf(t: string): number | null {
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]/);
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (m[3]!.toLowerCase() === "p" ? 12 : 0);
  return h + Number(m[2] ?? 0) / 60;
}

/** Our 2-hour arrival window that contains that time (closest one if outside 9–5). */
export function windowFor(time: string): string {
  const h = hourOf(time);
  const starts = [9, 11, 13, 15];
  if (h == null) return ARRIVAL_WINDOWS[0]!;
  let i = starts.findIndex((s) => h >= s && h < s + 2);
  if (i < 0) i = h < 9 ? 0 : starts.length - 1;
  return ARRIVAL_WINDOWS[i]!;
}

const title = (s: string) =>
  /[a-z]/.test(s)
    ? s.trim()
    : s
        .trim()
        .toLowerCase()
        .replace(/\b([a-z])/g, (c) => c.toUpperCase());

export function parseHanks(raw: string, today = new Date()): HanksJob {
  const text = raw.replace(/\s+/g, " ").trim();
  const out: HanksJob = {
    date: "",
    time: "",
    window: ARRIVAL_WINDOWS[0]!,
    work: "",
    pay: null,
    name: "",
    street: "",
    city: "",
    zip: "",
    access: "",
    extra: "",
  };

  const pay = text.match(/pays?\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (pay) out.pay = Number(pay[1]!.replace(/,/g, ""));

  // Every "Mon 11/16, 11 AM - … - …" block; the last one (the "It's yours!" part) has the address.
  const block =
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?\s+(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?,?\s+(\d{1,2}(?::\d{2})?\s*[AaPp]\.?[Mm]\.?)\s*[-–—]\s*(.+?)\s+[-–—]\s+(.+?)(?=(?:\s+[-–—]\s+pays?\b)|(?:\.\s*Reply\b)|(?:\s+It'?s yours)|(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?\s+\d{1,2}\/\d{1,2})|(?:\.?\s*Access:)|$)/gi;
  const blocks = [...text.matchAll(block)];
  const withAddress = blocks.find((b) => /\d{5}/.test(b[5]!) || /,/.test(b[5]!)) ?? blocks.at(-1);
  const first = blocks[0];
  const b = withAddress ?? first;
  if (b) {
    out.date = resolveDate(Number(b[1]), Number(b[2]), today);
    out.time = b[3]!.replace(/\s+/g, " ").toUpperCase().replace(/\./g, "");
    out.window = windowFor(out.time);
    out.work = b[4]!.trim();
    const rest = b[5]!.replace(/\.\s*$/, "").trim();
    const zip = rest.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zip) out.zip = zip[1]!;
    const parts = rest
      .replace(/\b\d{5}(?:-\d{4})?\b/, "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      // Name, street…, City, TX
      const stateIdx = parts.findIndex((p) => /^(TX|Texas)$/i.test(p));
      const end = stateIdx > 0 ? stateIdx : parts.length;
      out.name = title(parts[0]!);
      out.city = title(parts[end - 1]!);
      out.street = title(parts.slice(1, end - 1).join(", "));
    } else if (parts.length) {
      // Offer only: "ARGYLE"
      out.city = title(parts[0]!.replace(/\s*[-–—]\s*pays?.*$/i, ""));
    }
  }
  if (!out.city && first) out.city = title(first[5]!.replace(/\s*[-–—]\s*pays?.*$/i, ""));

  const access = text.match(/Access:\s*(.+?)(?=\s+Text this number|$)/i);
  if (access) out.access = access[1]!.trim().replace(/\.$/, "");
  const extra = text.match(/(Text this number.+)$/i);
  if (extra) out.extra = extra[1]!.trim();
  return out;
}
