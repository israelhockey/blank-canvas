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

export type LeadMode = "quick" | "price";
const EVENT = "ss:quick-lead";

export function openQuickLead(mode: LeadMode) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

const WANTS = ["Carpet", "Sofa / chairs", "Rugs", "Tile & grout", "Commercial space"];

export function QuickLead({ q }: { q: Quantities }) {
  const send = useServerFn(submitQuickLead);
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<LeadMode>("quick");
  const [wants, setWants] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [err, setErr] = useState<{ name?: string; phone?: string }>({});
  const [done, setDone] = useState({ first: "", phone: "", emailed: false });

  useEffect(() => {
    const open = (e: Event) => {
      setMode((e as CustomEvent<LeadMode>).detail);
      setStatus("idle");
      setErr({});
      ref.current?.showModal();
      track("quick_lead_open", (e as CustomEvent<LeadMode>).detail);
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
    const honeypot = String(f.get("website") || "");
    const next: typeof err = {};
    if (name.length < 2) next.name = "Your first name is enough.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Enter a 10-digit mobile number.";
    setErr(next);
    if (next.name || next.phone) return;

    setStatus("sending");
    const qParam = priced ? encodeQuantities(q) : "";
    const details = {
      from: mode === "price" ? "price_builder" : "quick_form",
      wants,
      ...(priced ? { items, subtotal: t.sub, tax: t.tax, total: t.total, q: qParam } : {}),
    };
    try {
      const c = db();
      const leadId =
        c && !honeypot
          ? await c
              .rpc("submit_lead", {
                p: {
                  type: "quote",
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
      track("quick_lead_submit", mode, priced ? { total: t.total } : {});
      const d = phone.replace(/\D/g, "").slice(-10);
      setDone({
        first: name.split(" ")[0] ?? name,
        phone: d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : phone,
        emailed: !!email,
      });
      setStatus("done");
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
            <p>
              We'll text you at {done.phone} within a few minutes
              {mode === "price" ? " to lock in a time" : " with your price"}.
              {done.emailed ? " A copy is on its way to your inbox." : ""}
            </p>
            <p className="ql-small">
              Can't wait? Call or text <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>.
            </p>
            <button className="btn btn-primary" type="button" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="eyebrow">{mode === "price" ? "Save your price" : "Takes 20 seconds"}</p>
            <h3 id="ql-title">{mode === "price" ? "Send me this price" : "Get a quick quote"}</h3>
            <p className="ql-sub">
              {priced
                ? `${items.map((i) => i.label).join(", ")} · ${money(t.total, 2)} with tax. We'll send it to you and text to set a time.`
                : "Tell us who you are and we'll text you a price in minutes. No deposit, pay after the job."}
            </p>

            {mode === "quick" && (
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
              />
              <span className="err">{err.name}</span>
            </label>
            <label className="f">
              Mobile number
              <input
                className="i"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="817-555-0123"
                aria-invalid={!!err.phone}
              />
              <span className="err">{err.phone}</span>
            </label>
            <label className="f">
              <span>
                Email <em>({mode === "price" ? "we'll send your price here" : "optional"})</em>
              </span>
              <input className="i" name="email" type="email" autoComplete="email" />
            </label>
            <label className="hp" aria-hidden="true">
              Leave this empty
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <button className="btn btn-primary ql-go" type="submit" disabled={status === "sending"}>
              {status === "sending"
                ? "Sending…"
                : mode === "price"
                  ? "Send me this price"
                  : "Text me a price"}
            </button>
            {status === "failed" && (
              <p className="form-error">
                That didn't go through. Please call or text {BUSINESS.phoneDisplay}.
              </p>
            )}
            <p className="ql-small">
              By sending, you agree Simple Surface may call or text you about this request.{" "}
              <a href="/privacy">Privacy</a>
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
