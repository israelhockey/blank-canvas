import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { db } from "@/lib/db";
import { ARRIVAL_WINDOWS, BUSINESS, money } from "@/lib/site-data";
import { track } from "@/lib/track";
import siteCss from "@/site.css?url";

/** Public, branded quote page: /quote/<secret token>. Only quotes that were sent can be opened. */
export const Route = createFileRoute("/quote/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your quote | Simple Surface Carpet Cleaning" },
      { property: "og:title", content: "Your quote from Simple Surface Carpet Cleaning" },
      {
        name: "description",
        content:
          "View your carpet cleaning quote, pick a time and accept it online. No deposit, pay after the job.",
      },
      {
        property: "og:description",
        content:
          "View your carpet cleaning quote, pick a time and accept it online. No deposit, pay after the job.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: siteCss }],
  }),
  component: QuotePage,
});

type PublicQuote = {
  number: number;
  title: string | null;
  status: string;
  items: { label: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  accepted_at: string | null;
  customer_name: string;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function nextDays() {
  const out: Date[] = [];
  let d = new Date();
  while (out.length < 14) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}

function QuotePage() {
  const { token } = Route.useParams();
  const [q, setQ] = useState<PublicQuote | null | undefined>(undefined);
  const [days] = useState(nextDays);
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    const c = db();
    if (!c) return setQ(null);
    void c.rpc("get_quote", { p_token: token }).then(({ data }) => {
      setQ((data as PublicQuote | null) ?? null);
      if (data) track("quote_view", `#${(data as PublicQuote).number}`);
    });
  }, [token]);

  const accept = async () => {
    const c = db();
    if (!c) return;
    setState("sending");
    const { data, error } = await c.rpc("accept_quote", {
      p_token: token,
      p_day: day ? iso(day) : null,
      p_window: slot,
    });
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) {
      setErr(
        r?.error === "expired"
          ? "This quote has expired. Call or text us for an updated one."
          : "Something went wrong. Please call or text us.",
      );
      return setState("error");
    }
    track("quote_accept", `#${q?.number}`, { total: q?.total });
    setState("done");
  };

  if (q === undefined)
    return (
      <Shell>
        <p className="lede">Loading your quote…</p>
      </Shell>
    );
  if (q === null)
    return (
      <Shell>
        <h1 style={{ fontSize: 36 }}>Quote not found</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          This link may be old. Call or text {BUSINESS.phoneDisplay} and we'll send a fresh one.
        </p>
      </Shell>
    );

  const accepted = q.status === "accepted" || state === "done";
  const expired = q.status === "expired";

  return (
    <Shell>
      <p className="eyebrow">Quote #{q.number}</p>
      <h1 style={{ fontSize: "clamp(34px,6vw,56px)", marginTop: 10 }}>
        {q.title || `Your quote, ${q.customer_name.split(" ")[0]}`}
      </h1>
      <p className="lede" style={{ marginTop: 12 }}>
        Prepared for {q.customer_name}
        {q.expires_at
          ? ` · good through ${new Date(`${q.expires_at}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
          : ""}
      </p>

      <div className="summary" style={{ position: "static", marginTop: 28 }}>
        <div className="lines">
          {q.items.map((i, k) => (
            <div key={k}>
              <span>{i.label}</span>
              <span>{money(Number(i.amount), 2)}</span>
            </div>
          ))}
        </div>
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span>{money(Number(q.subtotal), 2)}</span>
          </div>
          <div>
            <span>Sales tax (8.25%)</span>
            <span>{money(Number(q.tax), 2)}</span>
          </div>
        </div>
        <div className="grand">
          <span>Total</span>
          <b>{money(Number(q.total), 2)}</b>
        </div>
      </div>

      {q.notes && (
        <p style={{ marginTop: 20, whiteSpace: "pre-line", color: "var(--muted)" }}>{q.notes}</p>
      )}

      <div className="book" style={{ marginTop: 28 }}>
        {accepted ? (
          <div className="done">
            <div className="tick">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </div>
            <div>
              <h3>Quote accepted</h3>
              <p>
                Thank you! We'll text you to lock in the time. Questions? Call or text{" "}
                {BUSINESS.phoneDisplay}.
              </p>
            </div>
          </div>
        ) : expired ? (
          <p>This quote has expired. Call or text {BUSINESS.phoneDisplay} for an updated one.</p>
        ) : (
          <>
            <div className="book-head">
              <h3>Accept and pick a time</h3>
              <span className="eyebrow">No deposit · Pay after the job</span>
            </div>
            <div className="slotpick">
              <div className="sp-head">
                <span>Preferred day (optional)</span>
              </div>
              <div className="days" role="radiogroup" aria-label="Day">
                {days.map((d) => (
                  <button
                    key={d.toDateString()}
                    type="button"
                    role="radio"
                    aria-checked={day?.toDateString() === d.toDateString()}
                    onClick={() => setDay(d)}
                  >
                    <small>{d.toLocaleDateString("en-US", { weekday: "short" })}</small>
                    <b>{d.getDate()}</b>
                    <span>{d.toLocaleDateString("en-US", { month: "short" })}</span>
                  </button>
                ))}
              </div>
              <div className="slots" role="radiogroup" aria-label="Arrival window">
                {ARRIVAL_WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={slot === w}
                    onClick={() => setSlot(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-foot">
              <p>We'll confirm the exact time by text. You pay after the job is done.</p>
              <button
                className="btn btn-primary"
                onClick={() => void accept()}
                disabled={state === "sending"}
              >
                {state === "sending" ? "Accepting…" : `Accept quote · ${money(Number(q.total), 2)}`}
              </button>
            </div>
            {state === "error" && (
              <p className="form-error" style={{ marginTop: 10 }}>
                {err}
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ss-site">
      <header className="site">
        <div className="wrap">
          <a className="brand" href="/">
            <span className="brand-mark">
              <img src="/brand/mark-192.png" alt="" width={40} height={40} />
            </span>
            <span>
              <b>Simple Surface</b>
              <small>{BUSINESS.tagline}</small>
            </span>
          </a>
          <a className="head-phone" style={{ display: "inline" }} href={BUSINESS.phoneHref}>
            {BUSINESS.phoneDisplay}
          </a>
        </div>
      </header>
      <main>
        <section>
          <div className="wrap" style={{ maxWidth: 760 }}>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
