import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { db } from "@/lib/db";
import { submitQuickLead } from "@/lib/leads.functions";
import {
  BUSINESS,
  encodeQuantities,
  lineItems,
  money,
  totals,
  whatsappHref,
  type Quantities,
} from "@/lib/site-data";
import { leadSource, track, visitorId } from "@/lib/track";
import { TickIcon } from "./bits";

/*
 * The fastest way to become a lead: name + mobile (+ optional email), in a small pop-up.
 *   mode "quick": "Get a quick quote" — pick what needs cleaning, we text the price
 *   mode "price": "Send me this price" — from the price builder, emails the exact estimate
 * Open it from anywhere with openQuickLead("quick" | "price").
 */

export type LeadMode = "quick" | "price" | "whatsapp" | "guide";
const EVENT = "ss:quick-lead";
type OpenDetail = { mode: LeadMode; exit?: boolean };

/** `exit: true` = opened by the leave-the-site pop-up (different headline). */
export function openQuickLead(mode: LeadMode, opts: { exit?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(EVENT, { detail: { mode, ...opts } }));
}

/** Remembered so the leave-the-site pop-up never shows to someone who already sent their info. */
export const LEAD_SENT_KEY = "ss_lead_sent";

const WANTS = ["Carpet", "Sofa / chairs", "Rugs", "Tile & grout", "Commercial space"];

export function QuickLead({ q }: { q: Quantities }) {
  const send = useServerFn(submitQuickLead);
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<LeadMode>("quick");
  const [wants, setWants] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [err, setErr] = useState<{
    name?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
  }>({});
  const [done, setDone] = useState({ first: "", phone: "", emailed: false, wa: "" });
  const [exit, setExit] = useState(false);
  const isWa = mode === "whatsapp";
  const isGuide = mode === "guide";

  useEffect(() => {
    const open = (e: Event) => {
      const d = (e as CustomEvent<OpenDetail>).detail;
      setMode(d.mode);
      setExit(!!d.exit);
      setStatus("idle");
      setErr({});
      if (!ref.current?.open) ref.current?.showModal();
      track(d.exit ? "exit_popup_open" : "quick_lead_open", d.mode);
    };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  const t = totals(q);
  const items = lineItems(q);
  const priced = mode === "price" && items.length > 0;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const phone = String(f.get("phone") || "").trim();
    const email = String(f.get("email") || "").trim();
    const address = String(f.get("address") || "").trim();
    const notes = String(f.get("notes") || "").trim();
    const honeypot = String(f.get("website") || "");
    const next: typeof err = {};
    if (name.length < 2) next.name = "Your first name is enough.";
    const digits = phone.replace(/\D/g, "").length;
    if (isGuide) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        next.email = "Enter your email so we can send it.";
      if (digits && digits < 10) next.phone = `That's ${digits} digits. Please enter all 10.`;
    } else if (digits < 10)
      next.phone = digits
        ? `That's ${digits} digits. Please enter all 10, like 817-555-0123.`
        : "Enter your mobile number, like 817-555-0123.";
    setErr(next);
    if (next.name || next.phone || next.email) return;

    setStatus("sending");
    const qParam = priced ? encodeQuantities(q) : "";
    const details = {
      from:
        mode === "price"
          ? "price_builder"
          : mode === "whatsapp"
            ? "whatsapp"
            : mode === "guide"
              ? "stain_guide"
              : "quick_form",
      ...(exit ? { exit_popup: true } : {}),
      wants,
      ...(address ? { address } : {}),
      ...(notes ? { notes } : {}),
      ...(priced ? { items, subtotal: t.sub, tax: t.tax, total: t.total, q: qParam } : {}),
    };
    try {
      const c = db();
      const leadId =
        c && !honeypot
          ? await c
              .rpc("submit_lead", {
                p: {
                  type: isGuide ? "contact" : "quote",
                  name,
                  phone,
                  email,
                  source: leadSource(),
                  page: window.location.pathname,
                  visitor_id: visitorId(),
                  details,
                },
              })
              .then(({ data, error }) => (error ? null : (data as string)))
              .then(
                (v) => v,
                () => null,
              )
          : null;
      const mailed = await send({
        data: {
          ...(leadId ? { leadId } : {}),
          mode,
          name,
          phone,
          email,
          wants,
          address,
          notes,
          items: priced ? items : [],
          subtotal: priced ? t.sub : 0,
          tax: priced ? t.tax : 0,
          total: priced ? t.total : 0,
          q: qParam,
          page: window.location.pathname,
          source: leadSource(),
          website: honeypot,
        },
      })
        .then((r) => r.ok)
        .catch(() => false);
      if (!leadId && !mailed) throw new Error("not sent");
      track(
        "quick_lead_submit",
        exit ? `${mode} (exit pop-up)` : mode,
        priced ? { total: t.total } : {},
      );
      try {
        localStorage.setItem(LEAD_SENT_KEY, "1");
      } catch {
        /* private mode */
      }
      const d = phone.replace(/\D/g, "").slice(-10);
      const wa = isWa
        ? whatsappHref(
            [
              `Hi Simple Surface! I'd like a quote.`,
              `Name: ${name}`,
              `Phone: ${phone}`,
              email ? `Email: ${email}` : "",
              address ? `Address: ${address}` : "",
              wants.length ? `Needs: ${wants.join(", ")}` : "",
              notes ? `Notes: ${notes}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          )
        : "";
      setDone({
        first: name.split(" ")[0] ?? name,
        phone: d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : phone,
        emailed: !!email,
        wa,
      });
      setStatus("done");
      // Hand off to WhatsApp with their details already typed; they just tap send.
      if (wa) window.location.href = wa;
    } catch {
      setStatus("failed");
    }
  };

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className="ql"
      aria-labelledby="ql-title"
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="ql-in">
        <button className="ql-x" type="button" onClick={close} aria-label="Close">
          ×
        </button>
        {status === "done" ? (
          <div className="ql-done">
            <div className="tick">
              <TickIcon />
            </div>
            <h3 id="ql-title">Got it, {done.first}!</h3>
            {isGuide ? (
              <p>
                The Holiday Stain Guide is on its way to your inbox. Check spam if you don&apos;t
                see it in a few minutes.
              </p>
            ) : done.wa ? (
              <>
                <p>WhatsApp is opening with your message ready. Just tap send.</p>
                <a className="btn btn-primary wa-btn" href={done.wa}>
                  Open WhatsApp
                </a>
              </>
            ) : (
              <p>
                We'll text you at {done.phone} within a few minutes
                {mode === "price" ? " to lock in a time" : " with your price"}.
                {done.emailed ? " A copy is on its way to your inbox." : ""}
              </p>
            )}
            <p className="ql-small">
              Can't wait? Call or text <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>.
            </p>
            <button className="btn btn-primary" type="button" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="eyebrow">
              {exit
                ? "Before you go"
                : mode === "price"
                  ? "Save your price"
                  : isWa
                    ? "Message us"
                    : isGuide
                      ? "Free guide"
                      : "Takes 20 seconds"}
            </p>
            <h3 id="ql-title">
              {mode === "price"
                ? exit
                  ? "Save your price?"
                  : "Send me this price"
                : isWa
                  ? "Get a quote on WhatsApp"
                  : isGuide
                    ? "Get the free Holiday Stain Guide"
                    : exit
                      ? "Want your price texted to you?"
                      : "Get a quick quote"}
            </h3>
            <p className="ql-sub">
              {isGuide
                ? "10 quick fixes for wine, gravy, coffee, wax and pet accidents. We'll email it to you right now."
                : priced
                  ? `${items.map((i) => i.label).join(", ")} · ${money(t.total, 2)} with tax. We'll send it to you and text to set a time.`
                  : isWa
                    ? "Fill this in and WhatsApp opens with your message ready to send. We reply with your price."
                    : "Tell us who you are and we'll text you a price in minutes. No deposit, pay after the job."}
            </p>

            {mode !== "price" && !isGuide && (
              <div className="ql-wants" role="group" aria-label="What needs cleaning?">
                {WANTS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={wants.includes(w)}
                    onClick={() =>
                      setWants(wants.includes(w) ? wants.filter((x) => x !== w) : [...wants, w])
                    }
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}

            <label className="f">
              First name
              <input
                className="i"
                name="name"
                autoComplete="given-name"
                aria-invalid={!!err.name}
                onInput={(e) =>
                  err.name &&
                  e.currentTarget.value.trim().length >= 2 &&
                  setErr({ ...err, name: undefined })
                }
              />
              <span className="err">{err.name}</span>
            </label>
            <label className="f">
              {isGuide ? (
                <span>
                  Mobile number <em>(optional)</em>
                </span>
              ) : (
                "Mobile number"
              )}
              <input
                className="i"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="817-555-0123"
                aria-invalid={!!err.phone}
                onInput={(e) =>
                  err.phone &&
                  e.currentTarget.value.replace(/\D/g, "").length >= 10 &&
                  setErr({ ...err, phone: undefined })
                }
              />
              <span className="err">{err.phone}</span>
            </label>
            <label className="f">
              <span>
                Email{" "}
                {!isGuide && (
                  <em>({mode === "price" ? "we'll send your price here" : "optional"})</em>
                )}
              </span>
              <input
                className="i"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!err.email}
                onInput={() => err.email && setErr({ ...err, email: undefined })}
              />
              <span className="err">{err.email}</span>
            </label>
            {isWa && (
              <>
                <label className="f">
                  <span>
                    Address or ZIP <em>(optional)</em>
                  </span>
                  <input className="i" name="address" autoComplete="street-address" />
                </label>
                <label className="f">
                  <span>
                    What needs cleaning? <em>(rooms, stains, pets)</em>
                  </span>
                  <textarea className="i" name="notes" rows={2} />
                </label>
              </>
            )}
            <label className="hp" aria-hidden="true">
              Leave this empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <button className="btn btn-primary ql-go" type="submit" disabled={status === "sending"}>
              {status === "sending"
                ? "Sending…"
                : mode === "price"
                  ? "Send me this price"
                  : isWa
                    ? "Continue to WhatsApp"
                    : isGuide
                      ? "Email me the guide"
                      : "Text me a price"}
            </button>
            {status === "failed" && (
              <p className="form-error">
                That didn't go through. Please call or text {BUSINESS.phoneDisplay}.
              </p>
            )}
            <p className="ql-small">
              {isGuide
                ? "We'll email you the guide. No spam."
                : "By sending, you agree Simple Surface may call or text you about this request."}{" "}
              <a href="/privacy">Privacy</a>
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
