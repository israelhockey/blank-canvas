import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";

import { submitWalkthrough } from "@/lib/leads.functions";
import { BUSINESS, COMMERCIAL_RATE, money } from "@/lib/site-data";
import { db } from "@/lib/db";
import { leadSource, track, visitorId } from "@/lib/track";
import { AutoVideo, TickIcon } from "./bits";

const FREQUENCIES = [
  { label: "One time", perYear: 1 },
  { label: "Quarterly", perYear: 4 },
  { label: "Monthly", perYear: 12 },
  { label: "Every 2 weeks", perYear: 26 },
];

const TYPES = [
  "Gym / studio",
  "Office",
  "Apartment community",
  "Short-term rental",
  "Church / daycare",
  "Medical / dental",
  "Other",
];

const SEGMENTS: [string, string][] = [
  ["Gyms & studios", "Rubber floors, mats, locker rooms"],
  ["Offices", "After-hours carpet and tile"],
  ["Apartments", "Move-out turnovers, fast"],
  ["Short-term rentals", "Between-guest refreshes"],
  ["Churches & daycares", "Sanitized, eco-friendly"],
  ["Medical & dental", "Waiting rooms and halls"],
];

export function Commercial() {
  const send = useServerFn(submitWalkthrough);
  const [sqft, setSqft] = useState(5000);
  const [freq, setFreq] = useState(2); // Monthly
  const [errs, setErrs] = useState<{ biz?: string | undefined; phone?: string | undefined }>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [doneText, setDoneText] = useState("");

  const perClean = Math.max(0, sqft || 0) * COMMERCIAL_RATE;
  const fq = FREQUENCIES[freq] ?? FREQUENCIES[2]!;
  const perYear = perClean * fq.perYear;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const business = String(f.get("business") || "").trim();
    const phone = String(f.get("phone") || "").trim();
    const next = {
      biz: business.length > 1 ? undefined : "Add your business name.",
      phone: phone.replace(/\D/g, "").length >= 10 ? undefined : "Enter a 10-digit phone number.",
    };
    setErrs(next);
    if (next.biz || next.phone) return;
    setStatus("sending");
    const type = String(f.get("type") || "");
    const name = String(f.get("name") || "");
    const honeypot = String(f.get("website") || "");
    const size = Math.max(0, sqft || 0);
    try {
      const c = db();
      const saved =
        c && !honeypot
          ? c
              .rpc("submit_lead", {
                p: {
                  type: "walkthrough",
                  name,
                  business,
                  phone,
                  source: leadSource(),
                  page: window.location.pathname,
                  visitor_id: visitorId(),
                  details: { business, type, sqft: size, frequency: fq.label, perClean, perYear },
                },
              })
              .then(({ data, error }) => (error ? null : (data as string)))
          : Promise.resolve(null);
      const leadId = await Promise.resolve(saved).catch(() => null);
      const emailed = send({
        data: {
          ...(leadId ? { leadId } : {}),
          business,
          type,
          name,
          phone,
          sqft: size,
          frequency: fq.label,
          perClean,
          perYear,
          page: window.location.pathname,
          source: leadSource(),
          website: honeypot,
        },
      })
        .then((r) => r.ok)
        .catch(() => false);
      const mailOk = await emailed;
      if (!leadId && !mailOk) throw new Error("not sent");
      track("walkthrough_submit", type, { sqft: size });
      setDoneText(
        `${business}, about ${Math.max(0, sqft || 0).toLocaleString()} sq ft. We'll call ${phone} to set up a free walkthrough.`,
      );
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section id="commercial" className="com">
      <div className="wrap com-grid">
        <div>
          <p className="eyebrow">For businesses</p>
          <h2 style={{ marginTop: 14 }}>Commercial cleaning by the square foot</h2>
          <div className="rate">
            <b>{money(COMMERCIAL_RATE, 2)}</b>
            <span>per sq ft · carpet, tile &amp; rubber floors</span>
          </div>
          <p className="lede">
            No hose runs through your lobby and no wet floors all day. We work before you open or
            after you close, and set up a recurring schedule so you never have to think about it.
          </p>
          <div className="segs">
            {SEGMENTS.map(([b, s]) => (
              <div key={b}>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="com-side">
          <AutoVideo
            className="com-img"
            src="/vid/gym.mp4"
            poster="/vid/gym-poster.jpg"
            aria-label="Technician cleaning rubber gym flooring"
          />
          {status === "done" ? (
            <div className="est">
              <div className="done">
                <div className="tick">
                  <TickIcon />
                </div>
                <div>
                  <h3>Walkthrough requested</h3>
                  <p>{doneText}</p>
                </div>
              </div>
            </div>
          ) : (
            <form className="est" noValidate onSubmit={onSubmit}>
              <h3>Estimate your space</h3>
              <div className="fields">
                <label className="f">
                  Square feet
                  <input
                    className="i"
                    type="number"
                    min={0}
                    step={100}
                    value={sqft}
                    inputMode="numeric"
                    onChange={(e) => setSqft(Number(e.target.value))}
                  />
                </label>
                <label className="f">
                  How often
                  <select
                    className="i"
                    value={freq}
                    onChange={(e) => setFreq(Number(e.target.value))}
                  >
                    {FREQUENCIES.map((fq, i) => (
                      <option key={fq.label} value={i}>
                        {fq.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="est-out">
                <div>
                  <b>{money(perClean)}</b>
                  <span>per cleaning, before tax</span>
                </div>
                <div>
                  <b>{money(perYear)}</b>
                  <span>per year at this schedule</span>
                </div>
              </div>
              <div className="fields">
                <label className="f">
                  Business name
                  <input
                    className="i"
                    name="business"
                    autoComplete="organization"
                    aria-invalid={!!errs.biz}
                  />
                  <span className="err">{errs.biz}</span>
                </label>
                <label className="f">
                  Type
                  <select className="i" name="type">
                    {TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="f">
                  Your name
                  <input className="i" name="name" autoComplete="name" />
                </label>
                <label className="f">
                  Phone
                  <input
                    className="i"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    aria-invalid={!!errs.phone}
                  />
                  <span className="err">{errs.phone}</span>
                </label>
                <label className="hp" aria-hidden="true">
                  Leave this empty
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Request a free walkthrough"}
              </button>
              <p className="consent">
                By requesting, you agree Simple Surface may call or text you about this request. See
                our
                <a href="/privacy">Privacy Policy</a>.
              </p>
              {status === "failed" && (
                <p className="form-error" role="alert">
                  We couldn't send your request. Please call or text {BUSINESS.phoneDisplay}.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
