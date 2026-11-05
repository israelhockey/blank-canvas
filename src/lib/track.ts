import { ANALYTICS } from "./analytics-config";
import { db } from "./db";

/*
 * First-party site tracking. Every event goes to the site_events table (anonymous visitor ID),
 * and is mirrored to GA4 / Meta Pixel when those are configured.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

const isBrowser = () => typeof window !== "undefined";

function storageId(store: Storage, k: string): string {
  try {
    let v = store.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      store.setItem(k, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

export const visitorId = () => (isBrowser() ? storageId(localStorage, "ss_vid") : "");
const sessionId = () => (isBrowser() ? storageId(sessionStorage, "ss_sid") : "");

/** Where this visit came from: UTM tags, else the referring site, else "direct". Fixed per session. */
export function leadSource(): string {
  if (!isBrowser()) return "";
  try {
    const saved = sessionStorage.getItem("ss_source");
    if (saved) return saved;
    const p = new URLSearchParams(window.location.search);
    const utm = ["utm_source", "utm_medium", "utm_campaign"]
      .map((k) => p.get(k))
      .filter(Boolean)
      .join(" / ");
    const ref =
      document.referrer && !document.referrer.includes(window.location.host)
        ? new URL(document.referrer).hostname
        : "";
    const src = utm || ref || "direct";
    sessionStorage.setItem("ss_source", src);
    return src;
  } catch {
    return "";
  }
}

const isAdminPath = () =>
  isBrowser() &&
  (window.location.pathname.startsWith("/admin") ||
    // Don't count local development or Lovable's editor preview as real visitors.
    ["localhost", "127.0.0.1"].includes(window.location.hostname));

/** Record an event. Never throws; tracking must not break the site. */
export function track(event: string, label?: string, meta?: Record<string, unknown>) {
  if (!isBrowser() || isAdminPath()) return;
  try {
    const c = db();
    if (c) {
      void c
        .from("site_events")
        .insert({
          visitor_id: visitorId(),
          session_id: sessionId(),
          event: event.slice(0, 60),
          path: window.location.pathname.slice(0, 300),
          label: label ? label.slice(0, 200) : null,
          source: leadSource().slice(0, 300),
          referrer: document.referrer ? document.referrer.slice(0, 500) : null,
          meta: meta ?? {},
        })
        .then(() => undefined);
    }
    if (event !== "page_view") {
      window.gtag?.("event", event, { event_label: label, ...meta });
    }
    // Every form that hands us a phone number counts as a lead (GA4 "generate_lead", Pixel "Lead").
    if (LEAD_EVENTS.has(event)) {
      const value = typeof meta?.["total"] === "number" ? (meta["total"] as number) : undefined;
      window.gtag?.("event", "generate_lead", {
        lead_source: event,
        ...(value ? { value, currency: "USD" } : {}),
      });
      window.fbq?.("track", "Lead");
    }
    if (event === "call_click") window.fbq?.("track", "Contact");
  } catch {
    /* ignore */
  }
}

const LEAD_EVENTS = new Set([
  "booking_submit",
  "walkthrough_submit",
  "quick_lead_submit",
  "quote_accept",
]);

let loaded = false;

/** Loads GA4, Clarity and the Meta Pixel once, if their IDs are set. Skipped in the admin area. */
export function loadThirdPartyAnalytics() {
  if (!isBrowser() || loaded || isAdminPath()) return;
  loaded = true;
  const add = (src: string) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };
  if (ANALYTICS.ga4) {
    add(`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.ga4}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS.ga4, { send_page_view: false });
  }
  if (ANALYTICS.clarity) {
    // Same queue shape as Clarity's official snippet.
    const clarity = function (...a: unknown[]) {
      const f = clarity as unknown as { q?: unknown[] };
      (f.q = f.q || []).push(a);
    };
    window.clarity = clarity;
    add(`https://www.clarity.ms/tag/${ANALYTICS.clarity}`);
  }
  if (ANALYTICS.metaPixel) {
    const queue: unknown[] = [];
    const fbq = (...a: unknown[]) => void queue.push(a);
    Object.assign(fbq, { queue, loaded: true, version: "2.0", push: fbq });
    window.fbq = fbq;
    (window as unknown as { _fbq?: unknown })._fbq = fbq;
    add("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", ANALYTICS.metaPixel);
  }
}

/** Page view: our table, GA4 and the Pixel. */
export function trackPageView() {
  if (!isBrowser() || isAdminPath()) return;
  track("page_view");
  window.gtag?.("event", "page_view", { page_path: window.location.pathname });
  window.fbq?.("track", "PageView");
}

/**
 * One document-level click listener: phone and text links, plus anything with data-track="name".
 * Returns a cleanup function.
 */
export function startClickTracking(): () => void {
  if (!isBrowser()) return () => undefined;
  const onClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a,button,[data-track]");
    if (!el) return;
    const named = el.closest<HTMLElement>("[data-track]");
    const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 120);
    const href = el.getAttribute("href") || "";
    if (href.startsWith("tel:")) return track("call_click", label);
    if (href.startsWith("sms:")) return track("text_click", label);
    if (href.startsWith("mailto:")) return track("email_click", label);
    if (named) return track(named.dataset["track"] || "click", label);
    if (href.startsWith("#")) return track("nav_click", href);
  };
  document.addEventListener("click", onClick, { capture: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}
