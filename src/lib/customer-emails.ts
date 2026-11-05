import { brandedLayout, esc, itemsTable, usd } from "./email";

/* Branded customer emails, shared by the back office and the automatic emails. Server-only. */

export type CustomerEmailKind =
  "quote" | "quote_nudge" | "receipt" | "review" | "reminder" | "repeat" | "confirm" | "custom";

export type CustomerEmailData = {
  name: string;
  origin: string;
  link?: string;
  number?: number | undefined;
  title?: string;
  notes?: string;
  day?: string;
  window?: string;
  method?: string;
  items?: { label: string; amount: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
  expires?: string;
  subject?: string;
  message?: string;
};

export function buildCustomerEmail(kind: CustomerEmailKind, input: CustomerEmailData) {
  const data = {
    link: "",
    title: "",
    notes: "",
    day: "",
    window: "",
    method: "",
    items: [] as { label: string; amount: number }[],
    subtotal: 0,
    tax: 0,
    total: 0,
    expires: "",
    subject: "",
    message: "",
    ...input,
  };
  const first = data.name.split(" ")[0] || data.name;
  const table = data.items.length
    ? itemsTable(data.items, data.subtotal, data.tax, data.total)
    : "";
  const notes = data.notes
    ? `<p style="margin:16px 0 0;color:#56627a;font-size:14px;white-space:pre-line">${esc(data.notes)}</p>`
    : "";

  let subject = "";
  let html = "";
  let text = "";
  switch (kind) {
    case "quote":
      subject = `Your Simple Surface Carpet Cleaning quote #${data.number ?? ""}${data.title ? `: ${data.title}` : ""}`;
      html = brandedLayout({
        origin: data.origin,
        heading: `Hi ${first}, here's your quote`,
        intro: `Quote #${data.number ?? ""}${data.expires ? `, good through ${data.expires}` : ""}. Flat prices, no deposit, and you pay after the job is done.`,
        body: table + notes,
        cta: { label: "View and accept your quote", href: data.link },
      });
      text = `Hi ${first}, here's your Simple Surface Carpet Cleaning quote #${data.number ?? ""} for ${usd(data.total)}: ${data.link}`;
      break;
    case "quote_nudge":
      subject = `Any questions about your quote #${data.number ?? ""}?`;
      html = brandedLayout({
        origin: data.origin,
        heading: `Hi ${first}, just checking in`,
        intro: `Your quote for ${usd(data.total)} is still open. You can accept it and pick a time online in under a minute, or reply with any questions.`,
        body: table,
        cta: { label: "View your quote", href: data.link },
      });
      text = `Hi ${first}, your Simple Surface Carpet Cleaning quote #${data.number ?? ""} (${usd(data.total)}) is still open: ${data.link}. Questions? Reply or call 214-562-3449.`;
      break;
    case "receipt":
      subject = `Receipt from Simple Surface Carpet Cleaning${data.number ? ` · Job #${data.number}` : ""}`;
      html = brandedLayout({
        origin: data.origin,
        heading: `Thank you, ${first}!`,
        intro: `We received your payment${data.method ? ` by ${data.method}` : ""}. If anything doesn't look right, we'll come back and touch it up.`,
        body: table,
      });
      text = `Thank you, ${first}! Payment of ${usd(data.total)} received. Simple Surface, 214-562-3449.`;
      break;
    case "review":
      subject = "How did we do?";
      html = brandedLayout({
        origin: data.origin,
        heading: `Thanks for choosing Simple Surface, ${first}`,
        intro:
          "We're a new local business, and a quick Google review helps your neighbors find us. It takes less than a minute.",
        cta: { label: "Leave a Google review", href: data.link },
      });
      text = `Thanks for choosing Simple Surface, ${first}! Would you leave a quick Google review? ${data.link}`;
      break;
    case "reminder":
      subject = `Reminder: Simple Surface visit ${data.day}`;
      html = brandedLayout({
        origin: data.origin,
        heading: `See you ${data.day}, ${first}`,
        intro: `Your arrival window is ${data.window}. Please pick up small items and toys from the floors we're cleaning. We'll text when we're on the way.`,
        body: table,
      });
      text = `Reminder: Simple Surface visit ${data.day}, arrival ${data.window}. Questions: 214-562-3449.`;
      break;
    case "repeat":
      subject = "Time for a fresh clean?";
      html = brandedLayout({
        origin: data.origin,
        heading: `Hi ${first}, it's been a while`,
        intro:
          "Most homes need carpet and upholstery cleaned every 6 to 12 months. Book your next clean in a minute at our flat per-room prices.",
        cta: { label: "See prices and book", href: data.link || data.origin },
      });
      text = `Hi ${first}, time for a fresh clean? Book online: ${data.link || data.origin}`;
      break;
    case "custom":
      subject = data.subject || "A message from Simple Surface Carpet Cleaning";
      html = brandedLayout({
        origin: data.origin,
        heading: `Hi ${first},`,
        intro: "",
        body: `<p style="margin:0;color:#0f1f38;font-size:15px;line-height:1.6;white-space:pre-line">${esc(data.message)}</p>`,
      });
      text = `Hi ${first},\n\n${data.message}\n\nSimple Surface Carpet Cleaning · 214-562-3449`;
      break;
    case "confirm":
      subject = `You're booked: ${data.day}, ${data.window}`;
      html = brandedLayout({
        origin: data.origin,
        heading: `You're booked, ${first}!`,
        intro: `We'll see you ${data.day}, ${data.window} arrival. No deposit; you pay after the job is done.`,
        body: table + notes,
      });
      text = `You're booked with Simple Surface: ${data.day}, ${data.window}. Questions: 214-562-3449.`;
      break;
  }
  return { subject, html, text };
}
