import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { submitBooking } from "@/lib/leads.functions";
import {
  ARRIVAL_WINDOWS,
  BUSINESS,
  ITEM_GROUPS,
  PRESETS,
  lineItems,
  money,
  totals,
  type Quantities,
} from "@/lib/site-data";
import { InfoIcon, ShieldIcon, TickIcon, getLeadSource } from "./bits";

type Props = {
  q: Quantities;
  setQ: (q: Quantities) => void;
  preset: string | null;
  setPreset: (p: string | null) => void;
  onVisible: (v: boolean) => void;
};

/** Next 14 working days (Mon–Sat) in Fort Worth time, starting tomorrow. */
function upcomingDays(): Date[] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  let d = new Date(g("year"), g("month") - 1, g("day"));
  const out: Date[] = [];
  while (out.length < 14) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}

export function Pricing({ q, setQ, preset, setPreset, onVisible }: Props) {
  const t = totals(q);
  const lines = lineItems(q);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => onVisible(!!entries[0]?.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);

  const bump = (id: string, d: number) => {
    setQ({ ...q, [id]: Math.max(0, Math.min(20, (q[id] ?? 0) + d)) });
    setPreset(null);
  };

  return (
    <section id="pricing" ref={sectionRef}>
      <div className="wrap">
        <div className="price-head">
          <div>
            <p className="eyebrow">Instant pricing</p>
            <h2 style={{ marginTop: 14 }}>Build your price</h2>
          </div>
          <p className="lede" style={{ maxWidth: "44ch" }}>
            Flat prices per room and per piece. No surprise fees at the door. Pick what you need and
            book a time.
          </p>
        </div>

        <div className="presets" role="group" aria-label="Popular packages">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                const next: Quantities = {};
                ITEM_GROUPS.forEach((g) => g.items.forEach((i) => (next[i.id] = p.q[i.id] ?? 0)));
                setQ(next);
                setPreset(p.id);
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const next: Quantities = {};
              ITEM_GROUPS.forEach((g) => g.items.forEach((i) => (next[i.id] = 0)));
              setQ(next);
              setPreset(null);
            }}
          >
            Clear
          </button>
        </div>

        <div className="calc">
          <div className="items">
            {ITEM_GROUPS.map((g) => (
              <Fragment key={g.group}>
                <div className="grp">{g.group}</div>
                {g.items.map((it) => (
                  <div className="row" key={it.id}>
                    <div>
                      <div className="nm">{it.name}</div>
                      <div className="sub">{it.sub}</div>
                    </div>
                    <span className="pr">{money(it.price)} each</span>
                    <div className="step">
                      <button
                        type="button"
                        aria-label={`Remove one ${it.name}`}
                        disabled={!q[it.id]}
                        onClick={() => bump(it.id, -1)}
                      >
                        −
                      </button>
                      <output aria-live="polite">{q[it.id] ?? 0}</output>
                      <button
                        type="button"
                        aria-label={`Add one ${it.name}`}
                        onClick={() => bump(it.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </Fragment>
            ))}
            <div className="note-row">
              <InfoIcon />
              <span>
                Hallways and stairs, heavy stains and pet odor treatment are quoted on site.
                Commercial spaces are priced per square foot below.
              </span>
            </div>
          </div>

          <aside className="summary" aria-live="polite">
            <p className="eyebrow">Your estimate</p>
            <div className="lines">
              {lines.length ? (
                lines.map((l) => (
                  <div key={l.label}>
                    <span>{l.label}</span>
                    <span>{money(l.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="empty">Add rooms or furniture to see your price.</div>
              )}
            </div>
            <div className="totals">
              <div>
                <span>Subtotal</span>
                <span>{money(t.sub)}</span>
              </div>
              <div>
                <span>Sales tax (8.25%)</span>
                <span>{money(t.tax, 2)}</span>
              </div>
            </div>
            <div className="grand">
              <span>Total</span>
              <b>{money(t.total, t.total % 1 ? 2 : 0)}</b>
            </div>
            <a className="btn btn-primary" href="#book">
              Pick a time
            </a>
            <p className="sum-g">
              <ShieldIcon />
              No deposit · 100% Satisfaction Guarantee
            </p>
          </aside>
        </div>

        <BookingForm q={q} />
      </div>
    </section>
  );
}

function BookingForm({ q }: { q: Quantities }) {
  const send = useServerFn(submitBooking);
  const [days, setDays] = useState<Date[]>([]);
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [errs, setErrs] = useState<{ name?: string; phone?: string; zip?: string; slot?: string }>(
    {},
  );
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [doneText, setDoneText] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);

  // Dates depend on "now", so build them in the browser only.
  useEffect(() => setDays(upcomingDays()), []);

  const dayLabel = day
    ? day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : "";
  const pickLabel = day && slot ? `${dayLabel}, ${slot} arrival` : "";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const phone = String(f.get("phone") || "").trim();
    const zip = String(f.get("zip") || "").trim();
    const next: { name?: string; phone?: string; zip?: string; slot?: string } = {};
    if (name.length < 2) next.name = "Add your name so we know who to ask for.";
    if (phone.replace(/\D/g, "").length < 10)
      next.phone = "Enter a 10-digit mobile number so we can text you.";
    if (!/^\d{5}$/.test(zip)) next.zip = "Enter your 5-digit ZIP code.";
    if (!day || !slot) next.slot = "Pick a day and an arrival window.";
    setErrs(next);
    if (next.name) return nameRef.current?.focus();
    if (next.phone) return phoneRef.current?.focus();
    if (next.zip) return zipRef.current?.focus();
    if (next.slot) return daysRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });

    const t = totals(q);
    const items = lineItems(q);
    setStatus("sending");
    try {
      const res = await send({
        data: {
          name,
          phone,
          email: String(f.get("email") || ""),
          zip,
          day: dayLabel,
          window: slot!,
          notes: String(f.get("notes") || ""),
          items,
          subtotal: t.sub,
          tax: t.tax,
          total: t.total,
          page: window.location.pathname,
          source: getLeadSource(),
          website: String(f.get("website") || ""),
        },
      });
      if (!res.ok) throw new Error(res.error);
      const what = items.map((i) => i.label).join(", ") || "your cleaning";
      setDoneText(
        `Thanks, ${name.split(" ")[0]}. We got your request for ${what} (${money(t.total, 2)} with tax) on ${pickLabel}. We'll text ${phone} shortly to confirm.`,
      );
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "done") {
    return (
      <div className="book" id="book">
        <div className="done">
          <div className="tick">
            <TickIcon />
          </div>
          <div>
            <h3>You're all set</h3>
            <p>{doneText}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="book" id="book" noValidate onSubmit={onSubmit}>
      <div className="book-head">
        <h3>Book your cleaning</h3>
        <span className="eyebrow">No deposit · Pay after the job</span>
      </div>
      <div className="fields">
        <label className="f">
          Name
          <input
            ref={nameRef}
            className="i"
            name="name"
            autoComplete="name"
            aria-invalid={!!errs.name}
          />
          <span className="err">{errs.name}</span>
        </label>
        <label className="f">
          Mobile number
          <input
            ref={phoneRef}
            className="i"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="817-555-0123"
            aria-invalid={!!errs.phone}
          />
          <span className="err">{errs.phone}</span>
        </label>
        <label className="f">
          <span>
            Email <em>(optional)</em>
          </span>
          <input className="i" name="email" type="email" autoComplete="email" />
        </label>
        <label className="f">
          ZIP code
          <input
            ref={zipRef}
            className="i"
            name="zip"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="76107"
            aria-invalid={!!errs.zip}
          />
          <span className="err">{errs.zip}</span>
        </label>

        <div className="f full slotpick">
          <div className="sp-head">
            <span>Pick a day</span>
            <span className="sp-hint">Mon–Sat</span>
          </div>
          <div className="days" ref={daysRef} role="radiogroup" aria-label="Day">
            {days.map((d) => (
              <button
                key={d.toDateString()}
                type="button"
                role="radio"
                aria-checked={day?.toDateString() === d.toDateString()}
                aria-label={d.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                onClick={() => setDay(d)}
              >
                <small>{d.toLocaleDateString("en-US", { weekday: "short" })}</small>
                <b>{d.getDate()}</b>
                <span>{d.toLocaleDateString("en-US", { month: "short" })}</span>
              </button>
            ))}
          </div>
          <div className="sp-head">
            <span>Arrival window</span>
            <span className="sp-hint">We text when we're on the way</span>
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
          <p className="sp-sel">
            {pickLabel ? (
              <b>{pickLabel}</b>
            ) : day ? (
              "Now pick an arrival window."
            ) : (
              "Pick a day and arrival window."
            )}
          </p>
          <span className="err">{errs.slot}</span>
        </div>

        <label className="f full">
          <span>
            Anything we should know? <em>(pets, stains, stairs, gate code)</em>
          </span>
          <textarea className="i" name="notes" />
        </label>
        <label className="hp" aria-hidden="true">
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="form-foot">
        <p>
          We'll text you to confirm. No deposit and nothing to pay now; you pay after the job is
          done. Have photos of a stain? Text them to {BUSINESS.phoneDisplay}.
          <span className="consent" style={{ display: "block", marginTop: 6 }}>
            By booking, you agree Simple Surface may call or text you about this request.
          </span>
        </p>
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Book my cleaning"}
        </button>
      </div>
      {status === "failed" && (
        <p className="form-error" role="alert" style={{ marginTop: 12 }}>
          We couldn't send your booking. Please call or text {BUSINESS.phoneDisplay} and we'll get
          you scheduled.
        </p>
      )}
    </form>
  );
}

export function useLiveTotal(q: Quantities) {
  return useMemo(() => totals(q), [q]);
}
