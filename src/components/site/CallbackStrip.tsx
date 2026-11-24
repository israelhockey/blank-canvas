import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { db } from "@/lib/db";
import { submitQuickLead } from "@/lib/leads.functions";
import { BUSINESS, CALLBACK_PROMISE } from "@/lib/site-data";
import { leadSource, track, visitorId } from "@/lib/track";
import { LEAD_SENT_KEY } from "./QuickLead";

/*
 * The one-field way to become a lead: just a phone number, no name or email.
 * Saves the lead and alerts the team the same way the quick-quote pop-up does.
 * variant "dark" sits on the hero photo; "light" sits on a white page.
 */
export function CallbackStrip({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const send = useServerFn(submitQuickLead);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [err, setErr] = useState("");
  const [shown, setShown] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") || "").trim();
    const honeypot = String(f.get("website") || "");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErr(
        digits.length
          ? `That's ${digits.length} digits. Please enter all 10.`
          : "Enter your mobile number, like 817-555-0123.",
      );
      return;
    }
    setErr("");
    setStatus("sending");
    try {
      const c = db();
      const leadId =
        c && !honeypot
          ? await c
              .rpc("submit_lead", {
                p: {
                  type: "quote",
                  name: "Call-back request",
                  phone,
                  email: "",
                  source: leadSource(),
                  page: window.location.pathname,
                  visitor_id: visitorId(),
                  details: { from: "callback", wants: [] },
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
          mode: "callback",
          name: "Call-back request",
          phone,
          email: "",
          wants: [],
          address: "",
          notes: "",
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          q: "",
          page: window.location.pathname,
          source: leadSource(),
          website: honeypot,
        },
      })
        .then((r) => r.ok)
        .catch(() => false);
      if (!leadId && !mailed) throw new Error("not sent");
      track("quick_lead_submit", "callback");
      try {
        localStorage.setItem(LEAD_SENT_KEY, "1");
      } catch {
        /* private mode */
      }
      const d = digits.slice(-10);
      setShown(`${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`);
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "done")
    return (
      <div className={`cb cb-${variant} cb-done`} role="status">
        <b>Got it!</b> We&apos;ll call {shown}. {CALLBACK_PROMISE} Can&apos;t wait? Call or text{" "}
        <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>.
      </div>
    );

  return (
    <form className={`cb cb-${variant}`} onSubmit={submit} noValidate>
      <label className="cb-label" htmlFor={`cb-phone-${variant}`}>
        Want a call back? Just leave your number.
      </label>
      <div className="cb-row">
        <input
          id={`cb-phone-${variant}`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="817-555-0123"
          aria-invalid={!!err}
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Call me back"}
        </button>
      </div>
      <label className="hp" aria-hidden="true">
        Leave this empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <small>
        {err ? (
          <span className="cb-err">{err}</span>
        ) : status === "failed" ? (
          <span className="cb-err">
            That didn&apos;t go through. Please call or text {BUSINESS.phoneDisplay}.
          </span>
        ) : (
          `${CALLBACK_PROMISE} No deposit, pay after the job.`
        )}
      </small>
    </form>
  );
}
